import prisma from '../prisma/client.js';
import { notifyMany, TYPE } from '../services/notificationService.js';
import { getGradingWindowError } from '../utils/gradingWindow.js';

const assertTeacherOfOffering = async (offeringId, user) => {
  if (user.role === 'admin') return { ok: true };
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: { teacherId: true },
  });
  if (!offering) return { ok: false, code: 404, message: 'Offering not found' };
  const t = await prisma.teacher.findUnique({ where: { userId: user.id } });
  if (!t || t.id !== offering.teacherId) return { ok: false, code: 403, message: 'Not your offering' };
  return { ok: true };
};

// POST /api/offerings/:id/mark-components/init
// Idempotent — creates stubs for every (enrollment × kind × index) based on Course.gradeComponents.
export const initForOffering = async (req, res) => {
  try {
    const offeringId = req.params.id;
    const access = await assertTeacherOfOffering(offeringId, req.user);
    if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        course: { include: { gradeComponents: { orderBy: { orderIndex: 'asc' } } } },
        enrollments: { where: { status: { in: ['ENROLLED', 'COMPLETED', 'INCOMPLETE'] } } },
      },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });
    const components = offering.course.gradeComponents;
    if (components.length === 0) {
      return res.status(400).json({ success: false, message: 'Course has no grade components configured' });
    }

    const toCreate = [];
    for (const enr of offering.enrollments) {
      for (const cmp of components) {
        for (let i = 1; i <= cmp.count; i++) {
          toCreate.push({
            enrollmentId: enr.id,
            kind: cmp.kind,
            index: i,
            totalMarks: cmp.totalPerInstance,
          });
        }
      }
    }
    // Use createMany skipDuplicates so re-init is idempotent (unique on enrollmentId+kind+index)
    if (toCreate.length) {
      await prisma.markComponent.createMany({ data: toCreate, skipDuplicates: true });
    }
    res.json({ success: true, created: toCreate.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/offerings/:id/mark-components — teacher view, full grid for one offering
export const listForOffering = async (req, res) => {
  try {
    const offeringId = req.params.id;
    const access = await assertTeacherOfOffering(offeringId, req.user);
    if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        course: { include: { gradeComponents: { orderBy: { orderIndex: 'asc' } } } },
        enrollments: {
          where: { status: { in: ['ENROLLED', 'COMPLETED', 'INCOMPLETE'] } },
          include: {
            student: { select: { id: true, studentId: true, user: { select: { name: true } } } },
            markComponents: true,
          },
        },
      },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });
    res.json({ success: true, data: offering });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/mark-components/:id  — teacher updates one cell
export const updateMarkComponent = async (req, res) => {
  try {
    const existing = await prisma.markComponent.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          select: {
            offeringId: true,
            student: { select: { userId: true } },
            offering: {
              select: {
                term: { select: { code: true, isActive: true, endDate: true } },
              },
            },
          },
        },
      },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Mark component not found' });
    const access = await assertTeacherOfOffering(existing.enrollment.offeringId, req.user);
    if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

    const { title, date, totalMarks, obtainedMarks } = req.body;
    if (obtainedMarks !== undefined || totalMarks !== undefined) {
      const gradingWindowError = getGradingWindowError(existing.enrollment.offering.term);
      if (gradingWindowError) {
        return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
      }
    }
    const wasGraded = existing.obtainedMarks != null;
    const wasDated = !!existing.date;
    const updated = await prisma.markComponent.update({
      where: { id: req.params.id },
      data: {
        title: title !== undefined ? title : undefined,
        date: date !== undefined ? (date ? new Date(date) : null) : undefined,
        totalMarks: totalMarks !== undefined ? +totalMarks : undefined,
        obtainedMarks: obtainedMarks !== undefined ? (obtainedMarks === null || obtainedMarks === '' ? null : +obtainedMarks) : undefined,
      },
    });
    // Notify student when a grade is freshly entered (null → value).
    if (!wasGraded && updated.obtainedMarks != null) {
      notifyMany({
        userIds: [existing.enrollment.student.userId],
        type: TYPE.ASSIGNMENT_GRADED,
        title: 'New grade posted',
        body: `${updated.title || updated.kind}: ${updated.obtainedMarks}/${updated.totalMarks}`,
        linkUrl: '/student/courses',
      });
    }
    // Notify student when a date is freshly set on a future-event component
    // (project/presentation/midterm/final etc., that's something to show up on).
    const isFutureEventKind = ['PROJECT_PRESENTATION', 'MID', 'FINAL'].includes(updated.kind);
    if (!wasDated && updated.date && isFutureEventKind && new Date(updated.date) > new Date()) {
      notifyMany({
        userIds: [existing.enrollment.student.userId],
        type: TYPE.ANNOUNCEMENT,
        title: `📅 ${updated.kind.replace(/_/g, ' ')} scheduled`,
        body: `${updated.title || updated.kind} on ${new Date(updated.date).toLocaleDateString()}`,
        linkUrl: '/student/courses',
      });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
