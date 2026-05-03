import prisma from '../prisma/client.js';
import { uploadToBucket, isStorageConfigured } from '../services/storageService.js';
import { notifyMany, TYPE } from '../services/notificationService.js';

const assertOfferingAccess = async (offeringId, user) => {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: { teacher: true, course: { select: { code: true } } },
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
      orderBy: { date: 'desc' },
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
        date: new Date(date),
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
        date: date ? new Date(date) : undefined,
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
