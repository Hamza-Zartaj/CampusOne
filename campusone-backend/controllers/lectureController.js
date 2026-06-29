import prisma from '../prisma/client.js';
import { uploadToBucket, isStorageConfigured } from '../services/storageService.js';
import { notifyMany, TYPE } from '../services/notificationService.js';
import { assertDateWithinTerm, parseDateOnly, toDateOnlyString } from '../utils/dateOnly.js';
import { findHolidayForDate } from '../utils/holidayRules.js';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const assertLectureDateMatchesTimetable = async (offering, dateString) => {
  const dateValue = parseDateOnly(dateString);
  if (!dateValue) {
    return { ok: false, message: 'date must be a real calendar date in YYYY-MM-DD format' };
  }

  if (!assertDateWithinTerm(dateString, offering.term)) {
    const start = toDateOnlyString(offering.term.startDate);
    const end = toDateOnlyString(offering.term.endDate);
    return { ok: false, message: `lecture date must be within term bounds (${start} to ${end})` };
  }

  const holiday = await findHolidayForDate({
    dateString,
    dateValue,
    termId: offering.termId,
  });
  if (holiday) {
    return {
      ok: false,
      message: `${toDateOnlyString(dateValue)} is a holiday (${holiday.name}). Lectures cannot be created on holidays.`,
    };
  }

  const dayOfWeek = DAY_CODES[dateValue.getUTCDay()];
  const sessions = await prisma.classSession.findMany({
    where: { offeringId: offering.id, dayOfWeek },
    orderBy: { slotIndex: 'asc' },
  });

  if (!sessions.length) {
    return {
      ok: false,
      message: `No scheduled lecture slot for this offering on ${dayOfWeek}. Lecture date must match the timetable.`,
    };
  }

  return { ok: true, dateValue, sessions };
};

const assertNoDuplicateLectureDate = async ({ offeringId, dateValue, lectureId }) => {
  const duplicate = await prisma.lecture.findFirst({
    where: {
      offeringId,
      date: dateValue,
      ...(lectureId ? { NOT: { id: lectureId } } : {}),
    },
    select: { id: true, title: true },
  });

  if (!duplicate) return { ok: true };
  return {
    ok: false,
    code: 409,
    message: `A lecture already exists for this offering on ${toDateOnlyString(dateValue)}.`,
  };
};

const assertOfferingAccess = async (offeringId, user) => {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: { teacher: true, term: true, course: { select: { code: true } } },
  });
  if (!offering) return { ok: false, code: 404, message: 'Offering not found' };
  if (user.role === 'admin') return { ok: true, offering };
  if (user.role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher || teacher.id !== offering.teacherId) {
      return { ok: false, code: 403, message: 'Not your offering' };
    }
    return { ok: true, offering };
  }
  return { ok: false, code: 403, message: 'Forbidden' };
};

// GET /api/lectures?offeringId=X
export const listLectures = async (req, res) => {
  try {
    const { offeringId } = req.query;
    if (!offeringId) return res.status(400).json({ success: false, message: 'offeringId required' });
    const lectures = await prisma.lecture.findMany({
      where: { offeringId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ success: true, data: lectures });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/lectures  (multipart)
export const createLecture = async (req, res) => {
  try {
    const { offeringId, date, title, description } = req.body;
    if (!offeringId || !date || !title) {
      return res.status(400).json({ success: false, message: 'offeringId, date, title required' });
    }
    const access = await assertOfferingAccess(offeringId, req.user);
    if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });
    const dateCheck = await assertLectureDateMatchesTimetable(access.offering, date);
    if (!dateCheck.ok) return res.status(400).json({ success: false, message: dateCheck.message });
    const duplicateCheck = await assertNoDuplicateLectureDate({ offeringId, dateValue: dateCheck.dateValue });
    if (!duplicateCheck.ok) return res.status(duplicateCheck.code).json({ success: false, message: duplicateCheck.message });

    let materialUrl = null, materialName = null;
    if (req.file) {
      if (!isStorageConfigured()) {
        return res.status(500).json({ success: false, message: 'Storage not configured' });
      }
      const up = await uploadToBucket('lectures', req.file.buffer, req.file.originalname, req.file.mimetype);
      materialUrl = up.publicUrl;
      materialName = up.originalName;
    }

    const lecture = await prisma.lecture.create({
      data: {
        offeringId,
        date: dateCheck.dateValue,
        title,
        description: description || null,
        materialUrl,
        materialName,
        createdBy: req.user.id,
      },
    });

    // Notify enrolled students
    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId, status: 'ENROLLED' },
      select: { student: { select: { userId: true } } },
    });
    const userIds = enrolled.map((e) => e.student.userId);
    if (userIds.length) {
      notifyMany({
        userIds,
        type: TYPE.ANNOUNCEMENT,
        title: `📚 ${access.offering.course.code}: New lecture material`,
        body: title,
        linkUrl: '/student/courses',
      });
    }

    res.status(201).json({ success: true, data: lecture });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/lectures/:id
export const updateLecture = async (req, res) => {
  try {
    const existing = await prisma.lecture.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Lecture not found' });
    const access = await assertOfferingAccess(existing.offeringId, req.user);
    if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

    const { date, title, description } = req.body;
    let dateValue;
    if (date) {
      const dateCheck = await assertLectureDateMatchesTimetable(access.offering, date);
      if (!dateCheck.ok) return res.status(400).json({ success: false, message: dateCheck.message });
      const duplicateCheck = await assertNoDuplicateLectureDate({
        offeringId: existing.offeringId,
        dateValue: dateCheck.dateValue,
        lectureId: existing.id,
      });
      if (!duplicateCheck.ok) return res.status(duplicateCheck.code).json({ success: false, message: duplicateCheck.message });
      dateValue = dateCheck.dateValue;
    }
    let materialUrl = existing.materialUrl;
    let materialName = existing.materialName;
    if (req.file) {
      const up = await uploadToBucket('lectures', req.file.buffer, req.file.originalname, req.file.mimetype);
      materialUrl = up.publicUrl;
      materialName = up.originalName;
    }
    const updated = await prisma.lecture.update({
      where: { id: req.params.id },
      data: {
        date: dateValue,
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        materialUrl,
        materialName,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/lectures/:id
export const deleteLecture = async (req, res) => {
  try {
    const existing = await prisma.lecture.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Lecture not found' });
    const access = await assertOfferingAccess(existing.offeringId, req.user);
    if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

    await prisma.lecture.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
