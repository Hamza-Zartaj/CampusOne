import prisma from '../prisma/client.js';
import { notifyMany, TYPE } from '../services/notificationService.js';
import { getGradingWindowError } from '../utils/gradingWindow.js';

const COURSEWORK_KINDS = new Set(['ASSIGNMENT', 'QUIZ']);
const ASSESSMENT_KINDS = new Set(['PROJECT_PRESENTATION', 'MID', 'FINAL', 'PARTICIPATION', 'LAB_WORK']);

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
        assignments: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            componentIndex: true,
            dueDate: true,
            status: true,
          },
          orderBy: [{ componentIndex: 'asc' }, { createdAt: 'asc' }],
        },
        quizzes: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            componentIndex: true,
            endAt: true,
            status: true,
          },
          orderBy: [{ componentIndex: 'asc' }, { createdAt: 'asc' }],
        },
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
export const createAssessmentSlot = async (req, res) => {
  try {
    const offeringId = req.params.id;
    const access = await assertTeacherOfOffering(offeringId, req.user);
    if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

    const kind = String(req.body.kind || '').trim().toUpperCase();
    const index = Number(req.body.index);
    const title = String(req.body.title || '').trim();
    const date = req.body.date ? new Date(req.body.date) : null;
    const totalMarks = req.body.totalMarks !== undefined && req.body.totalMarks !== ''
      ? Number(req.body.totalMarks)
      : null;

    if (!ASSESSMENT_KINDS.has(kind) || COURSEWORK_KINDS.has(kind)) {
      return res.status(400).json({
        success: false,
        message: 'Create assignments and quizzes from their own pages. This action is for configured mark-only assessments.',
      });
    }
    if (!Number.isInteger(index) || index < 1) {
      return res.status(400).json({ success: false, message: 'A valid configured slot is required' });
    }
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (date && Number.isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }
    if (totalMarks !== null && (!Number.isFinite(totalMarks) || totalMarks <= 0)) {
      return res.status(400).json({ success: false, message: 'Out of marks must be greater than 0' });
    }

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        term: { select: { code: true, isActive: true, endDate: true } },
        course: { include: { gradeComponents: true } },
        enrollments: { where: { status: { in: ['ENROLLED', 'COMPLETED', 'INCOMPLETE'] } } },
      },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    const component = offering.course.gradeComponents.find((entry) => entry.kind === kind);
    if (!component) {
      return res.status(400).json({
        success: false,
        message: `This course has no ${kind.replace(/_/g, ' ').toLowerCase()} component configured by admin`,
      });
    }
    if (index > component.count) {
      return res.status(400).json({ success: false, message: `Slot must be between 1 and ${component.count}` });
    }
    const resolvedTotalMarks = totalMarks ?? component.totalPerInstance;

    const gradingWindowError = getGradingWindowError(offering.term);
    if (gradingWindowError) {
      return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
    }

    const enrollmentIds = offering.enrollments.map((enrollment) => enrollment.id);
    const existingRows = enrollmentIds.length
      ? await prisma.markComponent.findMany({
          where: { enrollmentId: { in: enrollmentIds }, kind, index },
          select: { title: true, date: true, obtainedMarks: true },
        })
      : [];
    if (existingRows.some((row) => row.title || row.date || row.obtainedMarks !== null)) {
      return res.status(409).json({ success: false, message: `${component.label} ${index} is already created for this offering` });
    }

    const saved = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const enrollment of offering.enrollments) {
        rows.push(await tx.markComponent.upsert({
          where: {
            enrollmentId_kind_index: {
              enrollmentId: enrollment.id,
              kind,
              index,
            },
          },
          create: {
            enrollmentId: enrollment.id,
            kind,
            index,
            title,
            date,
            totalMarks: resolvedTotalMarks,
          },
          update: {
            title,
            date,
            totalMarks: resolvedTotalMarks,
          },
        }));
      }
      return rows;
    });

    if (date && date > new Date()) {
      const recipients = await prisma.enrollment.findMany({
        where: { id: { in: enrollmentIds } },
        select: { student: { select: { userId: true } } },
      });
      notifyMany({
        userIds: recipients.map((entry) => entry.student?.userId).filter(Boolean),
        type: TYPE.ANNOUNCEMENT,
        title: `${component.label} scheduled`,
        body: `${title} on ${date.toLocaleDateString()}`,
        linkUrl: '/student/courses',
      });
    }

    res.status(201).json({ success: true, created: saved.length, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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
