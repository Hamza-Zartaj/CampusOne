import prisma from '../prisma/client.js';
import { notify, notifyMany } from '../services/notificationService.js';
import AuditLogger from '../services/auditLogger.js';
import { computeGradePointAverage } from '../utils/grading.js';
import { runSerializableTransaction } from '../utils/prismaTransactions.js';

// ─── ELIGIBILITY CONFIG ──────────────────────────────────────────
export const TA_CONFIG = {
  minCgpa:           3.5,
  minCourseGrades:   ['A_PLUS', 'A'],   // applicant must have earned A or A+ in the course
  minSemesterGap:    2,                 // applicant.currentSemester >= courseSemesterSlot + gap
  maxActiveAssignments: 2,
  enabled:           true,              // global on/off (registrar can flip later)
};

export const TA_REVIEW_NOTES_MAX_LENGTH = 1000;

const normalizeReviewNotes = (value) => {
  const notes = (value ?? '').toString().trim();
  if (notes.length > TA_REVIEW_NOTES_MAX_LENGTH) {
    const error = new Error(`reviewNotes must be ${TA_REVIEW_NOTES_MAX_LENGTH} characters or fewer`);
    error.statusCode = 400;
    throw error;
  }
  return notes || null;
};

const computeCGPA = async (studentId) => {
  const completed = await prisma.enrollment.findMany({
    where: { studentId, gradePoints: { not: null } },
    include: { offering: { select: { course: { select: { creditHours: true } } } } },
  });
  return computeGradePointAverage(completed, (enrollment) => enrollment.offering.course.creditHours || 0);
};

// ─── ELIGIBILITY ────────────────────────────────────────────────
// Returns { eligible, reasons[], cgpa, eligibleCourses: [{ courseId, code, title, semesterSlot, sections: [...] }] }
export const checkEligibility = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { curriculum: { include: { courses: { include: { course: true } } } } },
  });
  if (!student) return { eligible: false, reasons: ['Student not found'] };

  const cgpa = await computeCGPA(studentId);
  const reasons = [];

  if (!TA_CONFIG.enabled) reasons.push('TA program is currently closed');
  if (cgpa == null) reasons.push('No completed courses on record');
  else if (cgpa < TA_CONFIG.minCgpa) reasons.push(`CGPA ${cgpa} is below required ${TA_CONFIG.minCgpa}`);

  const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });

  // Active TA assignments cap scoped to the active term.
  const activeCount = activeTerm
    ? await prisma.tAAssignment.count({
        where: { studentId, status: 'APPROVED', offering: { termId: activeTerm.id } },
      })
    : 0;
  if (activeCount >= TA_CONFIG.maxActiveAssignments) {
    reasons.push(`Already TA for ${activeCount} offerings (max ${TA_CONFIG.maxActiveAssignments})`);
  }

  // Find courses where student earned A/A+ AND semester gap is satisfied
  const completed = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: 'COMPLETED',
      gradeLetter: { in: TA_CONFIG.minCourseGrades },
    },
    include: { offering: { include: { course: true } } },
  });

  // Map course → curriculum semester slot (from student's curriculum)
  const slotByCourseId = {};
  for (const cc of student.curriculum.courses) {
    slotByCourseId[cc.courseId] = cc.semesterSlot;
  }

  // Existing TA assignments (any status) keyed by offeringId for de-dupe
  const existing = await prisma.tAAssignment.findMany({
    where: { studentId },
    select: { offeringId: true, status: true },
  });
  const existingMap = new Map(existing.map((e) => [e.offeringId, e.status]));

  const eligibleCourses = [];

  if (reasons.length === 0 && activeTerm) {
    const completedCourseIds = new Set(completed.map((e) => e.offering.courseId));

    for (const courseId of completedCourseIds) {
      const slot = slotByCourseId[courseId];
      if (slot == null) continue;
      if (student.currentSemester < slot + TA_CONFIG.minSemesterGap) continue;

      // Find offerings of this course in the active term
      const offerings = await prisma.courseOffering.findMany({
        where: { courseId, termId: activeTerm.id, isActive: true },
        include: {
          course: { select: { id: true, code: true, title: true } },
          teacher: { select: { user: { select: { name: true } } } },
        },
      });

      const sections = offerings
        .filter((o) => !existingMap.has(o.id) || existingMap.get(o.id) === 'REJECTED' || existingMap.get(o.id) === 'RELIEVED')
        .map((o) => ({
          offeringId: o.id,
          section: o.section,
          teacher: o.teacher.user.name,
        }));

      if (sections.length === 0) continue;

      const c = offerings[0].course;
      eligibleCourses.push({
        courseId: c.id,
        code: c.code,
        title: c.title,
        semesterSlot: slot,
        sections,
      });
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    cgpa,
    currentSemester: student.currentSemester,
    activeAssignmentCount: activeCount,
    config: TA_CONFIG,
    eligibleCourses,
    activeTerm,
  };
};

// ─── STUDENT ENDPOINTS ──────────────────────────────────────────

// GET /api/ta/eligibility
export const getMyEligibility = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });
    const result = await checkEligibility(student.id);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ta] eligibility error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/ta/applications  body: { offeringId, reason }
export const applyForTA = async (req, res) => {
  try {
    const { offeringId, reason } = req.body;
    if (!offeringId) return res.status(400).json({ success: false, message: 'offeringId is required' });

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      include: { curriculum: { include: { courses: true } } },
    });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: { course: { select: { id: true, code: true, title: true } }, teacher: { select: { userId: true } } },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    // Re-run eligibility (must include this specific offering)
    const elig = await checkEligibility(student.id);
    if (!elig.eligible) {
      return res.status(403).json({ success: false, message: 'Not eligible', reasons: elig.reasons });
    }
    const courseEntry = elig.eligibleCourses.find((c) => c.courseId === offering.course.id);
    const sectionEntry = courseEntry?.sections.find((s) => s.offeringId === offeringId);
    if (!sectionEntry) {
      return res.status(403).json({ success: false, message: 'You are not eligible to TA for this offering' });
    }

    // The course's curriculum slot tells us what semester the student is TA-ing
    const slot = courseEntry.semesterSlot;

    // Avoid duplicate PENDING/APPROVED
    const existing = await prisma.tAAssignment.findUnique({
      where: { studentId_offeringId: { studentId: student.id, offeringId } },
    });
    if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
      return res.status(409).json({ success: false, message: `Already ${existing.status.toLowerCase()} for this offering` });
    }

    let application;
    if (existing) {
      application = await prisma.tAAssignment.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          reason: reason || null,
          appliedAt: new Date(),
          appliedSemester: student.currentSemester,
          targetSemesterMin: 1,
          targetSemesterMax: slot,
          reviewedBy: null,
          reviewNotes: null,
          reviewedAt: null,
          startedAt: null,
          endedAt: null,
        },
      });
    } else {
      application = await prisma.tAAssignment.create({
        data: {
          studentId: student.id,
          offeringId,
          reason: reason || null,
          appliedSemester: student.currentSemester,
          targetSemesterMin: 1,
          targetSemesterMax: slot,
        },
      });
    }

    // Notify teacher
    if (offering.teacher?.userId) {
      await notify({
        userId: offering.teacher.userId,
        type: 'TA_APPLICATION',
        title: `TA application: ${offering.course.code}`,
        body: `${req.user.name} applied to TA for your ${offering.course.code} class.`,
        linkUrl: '/teacher/ta-applications',
        metadata: { applicationId: application.id, offeringId },
      });
    }

    res.status(201).json({ success: true, data: application });
  } catch (err) {
    console.error('[ta] apply error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/ta/my  — student's own TA applications/assignments
export const getMyAssignments = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });

    const assignments = await prisma.tAAssignment.findMany({
      where: { studentId: student.id },
      include: {
        offering: {
          include: {
            course: { select: { code: true, title: true, creditHours: true } },
            term: { select: { code: true, academicYear: true, isActive: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { appliedAt: 'desc' }],
    });
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/ta/my/active  — only APPROVED + active term, used by sidebar
export const getMyActiveAssignments = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.json({ success: true, data: [] });

    const assignments = await prisma.tAAssignment.findMany({
      where: { studentId: student.id, status: 'APPROVED', offering: { term: { isActive: true } } },
      include: {
        offering: {
          include: {
            course: { select: { code: true, title: true } },
            term: { select: { code: true } },
          },
        },
      },
    });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
};

// ─── TEACHER ENDPOINTS ──────────────────────────────────────────

// GET /api/ta/teacher/applications  — pending + history for teacher's offerings
export const getTeacherApplications = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });

    const apps = await prisma.tAAssignment.findMany({
      where: { offering: { teacherId: teacher.id } },
      include: {
        student: {
          select: {
            id: true, studentId: true, currentSemester: true, batch: true,
            user: { select: { name: true, email: true } },
          },
        },
        offering: { include: { course: { select: { code: true, title: true } } } },
      },
      orderBy: [{ status: 'asc' }, { appliedAt: 'desc' }],
    });
    res.json({ success: true, count: apps.length, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const verifyTeacherOwns = async (userId, applicationId) => {
  const app = await prisma.tAAssignment.findUnique({
    where: { id: applicationId },
    include: { offering: { select: { teacherId: true } } },
  });
  if (!app) return { error: 404, message: 'Application not found' };
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher || app.offering.teacherId !== teacher.id) {
    return { error: 403, message: 'Not your offering' };
  }
  return { app };
};

// PUT /api/ta/applications/:id/approve  body: { permissions: [...], reviewNotes }
export const approveApplication = async (req, res) => {
  try {
    const { permissions, reviewNotes } = req.body;
    const cleanReviewNotes = normalizeReviewNotes(reviewNotes);
    const validPerms = ['MARK_ATTENDANCE', 'GRADE_ASSIGNMENTS', 'GRADE_QUIZZES', 'ANSWER_QNA', 'UPLOAD_RESOURCES', 'VIEW_ROSTER'];
    const cleanedPerms = Array.isArray(permissions)
      ? permissions.filter((p) => validPerms.includes(p))
      : ['VIEW_ROSTER'];
    if (!cleanedPerms.includes('VIEW_ROSTER')) cleanedPerms.push('VIEW_ROSTER');

    const { existing, updated } = await runSerializableTransaction(prisma, async (tx) => {
      const application = await tx.tAAssignment.findUnique({
        where: { id: req.params.id },
        include: {
          student: { select: { userId: true } },
          offering: {
            include: {
              course: { select: { code: true } },
            },
          },
        },
      });
      if (!application) {
        const error = new Error('Application not found');
        error.statusCode = 404;
        throw error;
      }

      if (req.user.role === 'teacher') {
        const teacher = await tx.teacher.findUnique({ where: { userId: req.user.id } });
        if (!teacher || application.offering.teacherId !== teacher.id) {
          const error = new Error('Not your offering');
          error.statusCode = 403;
          throw error;
        }
      }

      if (application.status !== 'PENDING') {
        const error = new Error(
          application.status === 'APPROVED'
            ? 'Already approved'
            : `Cannot approve a ${application.status.toLowerCase()} application`
        );
        error.statusCode = 409;
        throw error;
      }

      const activeCount = await tx.tAAssignment.count({
        where: {
          studentId: application.studentId,
          status: 'APPROVED',
          id: { not: application.id },
          offering: { termId: application.offering.termId },
        },
      });
      if (activeCount >= TA_CONFIG.maxActiveAssignments) {
        const error = new Error(
          `Student already has ${activeCount} active TA assignments (max ${TA_CONFIG.maxActiveAssignments})`
        );
        error.statusCode = 409;
        throw error;
      }

      const approved = await tx.tAAssignment.update({
        where: { id: application.id },
        data: {
          status: 'APPROVED',
          permissions: cleanedPerms,
          reviewedBy: req.user.id,
          reviewNotes: cleanReviewNotes,
          reviewedAt: new Date(),
          startedAt: application.startedAt || new Date(),
          endedAt: null,
        },
      });

      return { existing: application, updated: approved };
    });

    await notify({
      userId: existing.student.userId,
      type: 'TA_APPROVED',
      title: `TA application approved: ${existing.offering.course.code}`,
      body: 'You are now a teaching assistant for this course.',
      linkUrl: '/student/ta',
    });

    await AuditLogger.log({
      action: 'TA_APPROVED',
      category: 'ACADEMIC',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'TAAssignment',
      targetId: updated.id,
      newValue: { permissions: cleanedPerms, reviewNotes: cleanReviewNotes },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[ta] approve error:', err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// PUT /api/ta/applications/:id/reject  body: { reviewNotes }
export const rejectApplication = async (req, res) => {
  try {
    const cleanReviewNotes = normalizeReviewNotes(req.body?.reviewNotes);
    if (req.user.role === 'teacher') {
      const check = await verifyTeacherOwns(req.user.id, req.params.id);
      if (check.error) return res.status(check.error).json({ success: false, message: check.message });
    }

    const existing = await prisma.tAAssignment.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { userId: true } }, offering: { include: { course: { select: { code: true } } } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Application not found' });
    if (existing.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: `Cannot reject a ${existing.status.toLowerCase()} application` });
    }

    const updated = await prisma.tAAssignment.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user.id,
        reviewNotes: cleanReviewNotes,
        reviewedAt: new Date(),
      },
    });

    await notify({
      userId: existing.student.userId,
      type: 'TA_DECISION',
      title: `TA application rejected: ${existing.offering.course.code}`,
      body: cleanReviewNotes || 'Your TA application was not approved.',
      linkUrl: '/student/ta',
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[ta] reject error:', err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// PUT /api/ta/applications/:id/relieve  — teacher or admin removes an active TA
export const relieveAssignment = async (req, res) => {
  try {
    const cleanReviewNotes = normalizeReviewNotes(req.body?.reviewNotes);
    if (req.user.role === 'teacher') {
      const check = await verifyTeacherOwns(req.user.id, req.params.id);
      if (check.error) return res.status(check.error).json({ success: false, message: check.message });
    }

    const existing = await prisma.tAAssignment.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { userId: true } }, offering: { include: { course: { select: { code: true } } } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Application not found' });
    if (existing.status !== 'APPROVED') {
      return res.status(409).json({ success: false, message: 'Only active TA assignments can be relieved' });
    }

    const updated = await prisma.tAAssignment.update({
      where: { id: req.params.id },
      data: {
        status: 'RELIEVED',
        endedAt: new Date(),
        reviewNotes: cleanReviewNotes || existing.reviewNotes,
      },
    });

    await notify({
      userId: existing.student.userId,
      type: 'TA_RELIEVED',
      title: `TA assignment ended: ${existing.offering.course.code}`,
      body: cleanReviewNotes || 'Your TA duties for this course have ended.',
      linkUrl: '/student/ta',
    });

    await AuditLogger.log({
      action: 'TA_RELIEVED',
      category: 'ACADEMIC',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'TAAssignment',
      targetId: updated.id,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

// ─── ADMIN ENDPOINTS ────────────────────────────────────────────

// GET /api/ta  — admin oversight
export const getAllAssignments = async (req, res) => {
  try {
    const { status, termId, offeringId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (offeringId) where.offeringId = offeringId;
    if (termId) where.offering = { termId };

    const apps = await prisma.tAAssignment.findMany({
      where,
      include: {
        student: { select: { studentId: true, currentSemester: true, user: { select: { name: true } } } },
        offering: {
          include: {
            course: { select: { code: true, title: true } },
            term: { select: { code: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { appliedAt: 'desc' }],
    });
    res.json({ success: true, count: apps.length, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
