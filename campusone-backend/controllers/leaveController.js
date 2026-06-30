import logger from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { notify } from '../services/notificationService.js';
import AuditLogger from '../services/auditLogger.js';
import { assertDateWithinTerm, parseDateOnly, serializeDateFields, toDateOnlyString } from '../utils/dateOnly.js';

// ─── CONFIG ────────────────────────────────────────────────────────
// UCP-style quota:
//   n = counted ABSENT + 0.5 * LATE.
//   n <= 4 is free, 4 < n <= 6 is fined, n > 6 triggers drop-off.
export const LEAVE_CONFIG = {
  freeQuota: 4,
  fineQuota: 6,
  finePerAbsent: 500,  // PKR per weighted quota unit inside the fined band
};

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const getLeaveBand = (n) => {
  // Inclusive boundaries: n <= 4 is free, 4 < n <= 6 is fined, n > 6 is drop-off.
  if (n > LEAVE_CONFIG.fineQuota) return 'dropoff';
  if (n > LEAVE_CONFIG.freeQuota) return 'fined';
  return 'free';
};

const getFineableUnits = (n) => {
  const fineableWeight = Math.max(0, Math.min(n, LEAVE_CONFIG.fineQuota) - LEAVE_CONFIG.freeQuota);
  return Math.ceil(fineableWeight);
};

// Expand a from/to range into list of YYYY-MM-DD dates.
const expandDateRange = (from, to) => {
  const dates = [];
  const start = parseDateOnly(toDateOnlyString(from));
  const end = parseDateOnly(toDateOnlyString(to));
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

const serializeLeaveApplication = (application) => serializeDateFields(application, ['fromDate', 'toDate']);

const buildUpcomingLectureSlots = async ({ offering, limit = 8 }) => {
  const sessions = offering?.sessions || [];
  if (!offering?.term || sessions.length === 0) return [];

  const termStart = toDateOnlyString(offering.term.startDate);
  const termEnd = toDateOnlyString(offering.term.endDate);
  const today = toDateOnlyString(new Date());
  const startDateString = today > termStart ? today : termStart;
  const startDate = parseDateOnly(startDateString);
  const endDate = parseDateOnly(termEnd);
  if (!startDate || !endDate || startDate > endDate) return [];

  const lectures = await prisma.lecture.findMany({
    where: {
      offeringId: offering.id,
      date: { gte: startDate, lte: endDate },
    },
    select: { id: true, date: true, title: true },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });
  const lectureByDate = new Map(lectures.map((lecture) => [toDateOnlyString(lecture.date), lecture]));
  const holidays = await prisma.holiday.findMany({
    where: { OR: [{ termId: null }, { termId: offering.termId }] },
    select: { date: true, isRecurring: true },
  });
  const isHoliday = (dateString) => {
    const monthDay = dateString.slice(5);
    return holidays.some((holiday) => {
      const holidayDate = toDateOnlyString(holiday.date);
      return holidayDate === dateString || (holiday.isRecurring && holidayDate.slice(5) === monthDay);
    });
  };

  const upcoming = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < 370 && cursor <= endDate && upcoming.length < limit; i += 1) {
    const dateString = toDateOnlyString(cursor);
    const dayOfWeek = DAY_CODES[cursor.getUTCDay()];
    const daySessions = sessions
      .filter((session) => session.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.slotIndex - b.slotIndex);

    if (daySessions.length) {
      if (!isHoliday(dateString)) {
        const lecture = lectureByDate.get(dateString);
        upcoming.push({
          date: dateString,
          dayOfWeek,
          title: lecture?.title || `${offering.course.code} scheduled class`,
          lectureId: lecture?.id || null,
          sessions: daySessions.map((session) => ({
            id: session.id,
            slotIndex: session.slotIndex,
            room: session.room ? { code: session.room.code, name: session.room.name } : null,
          })),
        });
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return upcoming;
};

// Compute the leave-status counter for one student in one offering.
// Returns { totalLectures, present, absent, late, approvedLeaveDays, n, band, dropOff }
const computeCounter = async ({ studentId, offeringId }) => {
  const [attendances, approvedApps] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId, offeringId } }),
    prisma.leaveApplication.findMany({
      where: { studentId, offeringId, status: 'APPROVED' },
    }),
  ]);

  const totalLectures = attendances.length;
  let present = 0, absent = 0, late = 0;
  for (const a of attendances) {
    if (a.status === 'PRESENT') present++;
    else if (a.status === 'ABSENT') absent++;
    else if (a.status === 'LATE') late++;
  }

  // Days that are ABSENT but covered by an approved leave don't count toward `n`.
  const approvedDates = new Set();
  let approvedLeaveDays = 0;
  for (const app of approvedApps) {
    for (const d of expandDateRange(app.fromDate, app.toDate)) {
      if (!approvedDates.has(d)) {
        approvedDates.add(d);
        approvedLeaveDays++;
      }
    }
  }

  let countedAbsent = 0;
  for (const a of attendances) {
    if (a.status === 'ABSENT' && !approvedDates.has(toDateOnlyString(a.date))) countedAbsent++;
  }

  const n = countedAbsent + 0.5 * late;
  const band = getLeaveBand(n);

  return {
    totalLectures,
    present,
    absent,
    late,
    approvedLeaveDays,
    countedAbsent,
    n,
    fineableUnits: getFineableUnits(n),
    band,
    dropOff: band === 'dropoff',
  };
};

// Generate Fine rows for a student/offering when n is in 4..6 band.
// Idempotent: quotaUnit is unique per student/offering, so concurrent calls
// converge on the same generated rows.
const generateFines = async ({ studentId, offeringId, counter }) => {
  if (counter.band === 'free') return 0;
  // Fine rows are whole quota units; a partial weighted unit is rounded up.
  const fineable = counter.fineableUnits;
  if (fineable <= 0) return 0;

  // Backfill rows created before quotaUnit existed. This keeps db-push
  // environments safe as well as databases upgraded through the SQL migration.
  const existingFines = await prisma.fine.findMany({
    where: { studentId, offeringId },
    select: { id: true, quotaUnit: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const usedUnits = new Set(existingFines.map((fine) => fine.quotaUnit).filter((unit) => unit != null));
  let nextUnit = 1;
  for (const fine of existingFines.filter((row) => row.quotaUnit == null)) {
    while (usedUnits.has(nextUnit)) nextUnit += 1;
    try {
      await prisma.fine.update({
        where: { id: fine.id },
        data: { quotaUnit: nextUnit },
      });
      usedUnits.add(nextUnit);
    } catch (error) {
      // A concurrent evaluator may have assigned the same unit first.
      if (error?.code !== 'P2002') throw error;
    }
    nextUnit += 1;
  }

  const rows = Array.from({ length: fineable }, (_, index) => ({
      studentId,
      offeringId,
      quotaUnit: index + 1,
      reason: `Absent over ${LEAVE_CONFIG.freeQuota}-leave free quota`,
      amount: LEAVE_CONFIG.finePerAbsent,
  }));
  const created = await prisma.fine.createMany({ data: rows, skipDuplicates: true });
  if (created.count === 0) return 0;

  // Notify student
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });
  if (student) {
    await notify({
      userId: student.userId,
      type: 'FINE_ISSUED',
      title: `Fine issued: PKR ${LEAVE_CONFIG.finePerAbsent * created.count}`,
      body: `You have crossed your free leave quota for one of your courses.`,
      linkUrl: '/student/leave-status',
    });
  }
  return created.count;
};

// Trigger drop-off if counter goes above fineQuota.
const triggerDropOff = async ({ studentId, offeringId, counter, performedById }) => {
  if (!counter.dropOff) return false;

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_offeringId: { studentId, offeringId } },
  });
  if (!enrollment || enrollment.status !== 'ENROLLED') return false;

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: 'DROPPED', droppedAt: new Date() },
  });

  // Notify student
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true, user: { select: { name: true } } },
  });
  if (student) {
    await notify({
      userId: student.userId,
      type: 'COURSE_DROPPED',
      title: 'Course dropped due to attendance',
      body: 'You have exceeded the maximum allowed absences for one of your courses.',
      linkUrl: '/student/leave-status',
    });
  }

  // Audit log
  await AuditLogger.log({
    action: 'DROP_ENROLLMENT_AUTO',
    category: 'ENROLLMENT',
    performedBy: performedById || 'system',
    performedByRole: 'system',
    targetModel: 'Enrollment',
    targetId: enrollment.id,
    description: `Auto-dropped due to leave-quota threshold (n=${counter.n})`,
  });

  return true;
};

// ─── STUDENT ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/leave/my  — student's leave-status grouped per enrolled offering
export const getMyLeaveStatus = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ENROLLED' },
      include: {
        offering: {
          include: {
            course: { select: { code: true, title: true, creditHours: true } },
            term: { select: { id: true, code: true, academicYear: true, startDate: true, endDate: true } },
            teacher: { select: { user: { select: { name: true } } } },
            sessions: { include: { room: true }, orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }] },
          },
        },
      },
    });

    const courses = await Promise.all(
      enrollments.map(async (e) => {
        const counter = await computeCounter({ studentId: student.id, offeringId: e.offeringId });
        const applications = await prisma.leaveApplication.findMany({
          where: { studentId: student.id, offeringId: e.offeringId },
          orderBy: { createdAt: 'desc' },
        });
        const fines = await prisma.fine.findMany({
          where: { studentId: student.id, offeringId: e.offeringId },
          orderBy: { createdAt: 'desc' },
        });
        const upcomingLectures = await buildUpcomingLectureSlots({ offering: e.offering });
        return { enrollment: e, counter, upcomingLectures, applications: applications.map(serializeLeaveApplication), fines };
      })
    );

    res.json({ success: true, config: LEAVE_CONFIG, data: courses });
  } catch (err) {
    logger.error('[leave] my error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/my/fines  — flat list of student's fines
export const getMyFines = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });

    const fines = await prisma.fine.findMany({
      where: { studentId: student.id },
      include: {
        offering: { include: { course: { select: { code: true, title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalUnpaid = fines
      .filter((f) => f.status === 'UNPAID')
      .reduce((s, f) => s + f.amount, 0);

    res.json({ success: true, totalUnpaid, count: fines.length, data: fines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/leave/applications — student submits leave application
export const submitLeaveApplication = async (req, res) => {
  try {
    const { offeringId, fromDate, toDate, reason, attachmentUrl } = req.body;
    if (!offeringId || !fromDate || !toDate || !reason) {
      return res.status(400).json({ success: false, message: 'offeringId, fromDate, toDate, reason are required' });
    }
    const fromDateValue = parseDateOnly(fromDate);
    const toDateValue = parseDateOnly(toDate);
    if (!fromDateValue || !toDateValue) {
      return res.status(400).json({ success: false, message: 'dates must be real calendar dates in YYYY-MM-DD format' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ success: false, message: 'fromDate must be <= toDate' });
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_offeringId: { studentId: student.id, offeringId } },
      include: { offering: { include: { term: true } } },
    });
    if (!enrollment || enrollment.status !== 'ENROLLED') {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this offering' });
    }
    if (!assertDateWithinTerm(fromDate, enrollment.offering.term) || !assertDateWithinTerm(toDate, enrollment.offering.term)) {
      const start = toDateOnlyString(enrollment.offering.term.startDate);
      const end = toDateOnlyString(enrollment.offering.term.endDate);
      return res.status(400).json({ success: false, message: `leave dates must be within term bounds (${start} to ${end})` });
    }

    const application = await prisma.leaveApplication.create({
      data: { studentId: student.id, offeringId, fromDate: fromDateValue, toDate: toDateValue, reason, attachmentUrl },
    });

    // Notify teacher
    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        teacher: { select: { user: { select: { id: true, name: true } } } },
        course: { select: { code: true } },
      },
    });
    if (offering?.teacher?.user?.id) {
      await notify({
        userId: offering.teacher.user.id,
        type: 'LEAVE_APPLICATION',
        title: `Leave application: ${offering.course.code}`,
        body: `${req.user.name} requested leave from ${fromDate} to ${toDate}.`,
        linkUrl: `/teacher/leave-applications`,
        metadata: { applicationId: application.id, offeringId },
      });
    }

    res.status(201).json({ success: true, data: serializeLeaveApplication(application) });
  } catch (err) {
    logger.error('[leave] submit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/applications/:id — details (student or teacher)
export const getApplication = async (req, res) => {
  try {
    const application = await prisma.leaveApplication.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
        offering: {
          include: {
            course: { select: { code: true, title: true } },
            teacher: { select: { userId: true, user: { select: { name: true } } } },
          },
        },
      },
    });
    if (!application) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = application.student.userId === req.user.id;
    const isTeacher = application.offering.teacher.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isTeacher && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: serializeLeaveApplication(application) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TEACHER ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/leave/offering/:offeringId — teacher view (counters + applications)
export const getOfferingLeaveStatus = async (req, res) => {
  try {
    const { offeringId } = req.params;

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher?.id } });
      if (!offering) return res.status(403).json({ success: false, message: 'Not your offering' });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId, status: { in: ['ENROLLED', 'DROPPED'] } },
      include: {
        student: { select: { id: true, studentId: true, batch: true, user: { select: { name: true } } } },
      },
      orderBy: { student: { studentId: 'asc' } },
    });

    const rows = await Promise.all(
      enrollments.map(async (e) => {
        const counter = await computeCounter({ studentId: e.studentId, offeringId });
        return { student: e.student, enrollmentStatus: e.status, counter };
      })
    );

    const applications = await prisma.leaveApplication.findMany({
      where: { offeringId },
      include: {
        student: { select: { studentId: true, user: { select: { name: true } } } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, config: LEAVE_CONFIG, data: { rows, applications: applications.map(serializeLeaveApplication) } });
  } catch (err) {
    logger.error('[leave] offering error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/applications/teacher/pending — all pending applications for this teacher's offerings
export const getPendingForTeacher = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });

    const applications = await prisma.leaveApplication.findMany({
      where: { offering: { teacherId: teacher.id } },
      include: {
        student: { select: { studentId: true, user: { select: { name: true } } } },
        offering: { include: { course: { select: { code: true, title: true } } } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, count: applications.length, data: applications.map(serializeLeaveApplication) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const decideApplication = async (req, res, decision) => {
  try {
    const { reviewNotes } = req.body || {};
    const application = await prisma.leaveApplication.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, userId: true } },
        offering: { include: { course: { select: { code: true } } } },
      },
    });
    if (!application) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || application.offering.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: 'Not your offering' });
      }
    }

    if (application.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: `Already ${application.status.toLowerCase()}` });
    }

    const updated = await prisma.leaveApplication.update({
      where: { id: application.id },
      data: {
        status: decision,
        reviewedBy: req.user.id,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
      },
    });

    // Notify student
    await notify({
      userId: application.student.userId,
      type: 'LEAVE_DECISION',
      title: `Leave ${decision === 'APPROVED' ? 'approved' : 'rejected'}: ${application.offering.course.code}`,
      body: reviewNotes || `Your leave application has been ${decision.toLowerCase()}.`,
      linkUrl: '/student/leave-status',
      metadata: { applicationId: application.id },
    });

    // Re-evaluate counter on rejection (now counts as absent if there was attendance) and approval
    const counter = await computeCounter({
      studentId: application.studentId,
      offeringId: application.offeringId,
    });
    await generateFines({
      studentId: application.studentId,
      offeringId: application.offeringId,
      counter,
    });
    await triggerDropOff({
      studentId: application.studentId,
      offeringId: application.offeringId,
      counter,
      performedById: req.user.id,
    });

    res.json({ success: true, data: serializeLeaveApplication(updated) });
  } catch (err) {
    logger.error('[leave] decide error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const approveApplication = (req, res) => decideApplication(req, res, 'APPROVED');
export const rejectApplication = (req, res) => decideApplication(req, res, 'REJECTED');

// ─── HOOK: called from attendanceController after marking — re-evaluate counters ───
// Exported so attendanceController can call it as a fire-and-forget after upsert.
export const reevaluateAfterAttendance = async ({ offeringId, studentIds, performedById }) => {
  try {
    for (const studentId of studentIds) {
      const counter = await computeCounter({ studentId, offeringId });
      await generateFines({ studentId, offeringId, counter });
      await triggerDropOff({ studentId, offeringId, counter, performedById });
    }
  } catch (err) {
    logger.error('[leave] reevaluate error:', err);
  }
};
