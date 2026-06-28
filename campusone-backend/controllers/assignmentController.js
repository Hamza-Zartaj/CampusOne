import prisma from '../prisma/client.js';
import { uploadToStorage, deleteFromStorage, pathFromUrl } from '../utils/supabaseStorage.js';
import { v4 as uuidv4 } from 'uuid';
import { notify, notifyMany, TYPE } from '../services/notificationService.js';
import { getGradingWindowError } from '../utils/gradingWindow.js';

const BUCKET = 'assignments';

const getApprovedTAAssignment = async ({ userId, offeringId, permission }) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) return null;
  const ta = await prisma.tAAssignment.findUnique({
    where: { studentId_offeringId: { studentId: student.id, offeringId } },
    include: { offering: { include: { teacher: { select: { userId: true } }, course: { select: { code: true, title: true } } } } },
  });
  if (!ta || ta.status !== 'APPROVED' || !ta.permissions.includes(permission)) return null;
  return { student, ta };
};

const assignmentInclude = {
  offering: {
    select: {
      id: true, section: true,
      course: { select: { id: true, code: true, title: true } },
      term: {
        select: {
          id: true,
          code: true,
          season: true,
          academicYear: true,
          isActive: true,
          endDate: true,
        },
      },
    },
  },
  _count: { select: { submissions: true } },
};

// ─── TEACHER ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/assignments?offeringId=  (teacher: own offerings; admin: all)
export const getAssignments = async (req, res) => {
  try {
    const { offeringId } = req.query;
    const where = {};

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

      if (offeringId) {
        // Verify teacher owns this offering
        const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } });
        if (!offering) return res.status(403).json({ success: false, message: 'Not your offering' });
        where.offeringId = offeringId;
      } else {
        where.offering = { teacherId: teacher.id };
      }
    } else if (req.user.role === 'student' && offeringId) {
      const taAccess = await getApprovedTAAssignment({
        userId: req.user.id,
        offeringId,
        permission: 'GRADE_ASSIGNMENTS',
      });
      if (!taAccess) return res.status(403).json({ success: false, message: 'Not authorised for this offering' });
      where.offeringId = offeringId;
    } else if (req.user.role === 'admin' && offeringId) {
      where.offeringId = offeringId;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: { dueDate: 'asc' },
    });
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/assignments/my  (student: assignments for their enrolled offerings)
export const getMyAssignments = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: { in: ['ENROLLED', 'COMPLETED'] } },
      select: { offeringId: true },
    });
    const offeringIds = enrollments.map((e) => e.offeringId);

    const assignments = await prisma.assignment.findMany({
      where: { offeringId: { in: offeringIds }, status: { not: 'DRAFT' } },
      include: {
        ...assignmentInclude,
        submissions: {
          where: { studentId: student.id },
          select: { id: true, status: true, obtainedMarks: true, feedback: true, submittedAt: true, attachmentUrl: true, submissionText: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/assignments/:id
export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: assignmentInclude,
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/assignments  — teacher creates; supports optional file upload
export const createAssignment = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });

    const { offeringId, title, description, totalMarks, dueDate, allowLate, status } = req.body;
    if (!offeringId || !title || !dueDate) {
      return res.status(400).json({ success: false, message: 'offeringId, title, and dueDate are required' });
    }

    const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } });
    if (!offering) return res.status(403).json({ success: false, message: 'Not your offering' });

    let attachmentUrl = null;
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const filePath = `teacher-files/${offeringId}/${uuidv4()}.${ext}`;
      attachmentUrl = await uploadToStorage(BUCKET, filePath, req.file.buffer, req.file.mimetype);
    }

    const assignment = await prisma.assignment.create({
      data: {
        offeringId,
        title,
        description: description || null,
        totalMarks: totalMarks ? +totalMarks : 100,
        dueDate: new Date(dueDate),
        allowLate: allowLate === 'true' || allowLate === true,
        attachmentUrl,
        status: status || 'PUBLISHED',
      },
      include: assignmentInclude,
    });

    // Notify enrolled students (only if PUBLISHED)
    if (assignment.status === 'PUBLISHED') {
      (async () => {
        const enrollments = await prisma.enrollment.findMany({
          where: { offeringId, status: 'ENROLLED' },
          select: { student: { select: { userId: true } } },
        });
        const userIds = enrollments.map((e) => e.student?.userId).filter(Boolean);
        const courseCode = assignment.offering?.course?.code || '';
        notifyMany({
          userIds,
          type: TYPE.ASSIGNMENT_NEW,
          title: `New assignment: ${assignment.title}`,
          body: `${courseCode} · Due ${new Date(assignment.dueDate).toLocaleDateString()}`,
          linkUrl: '/student/assignments',
          metadata: { assignmentId: assignment.id, offeringId },
        });
      })();
    }

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/assignments/:id
export const updateAssignment = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { offering: { select: { teacherId: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (existing.offering.teacherId !== teacher?.id) {
      return res.status(403).json({ success: false, message: 'Not your assignment' });
    }

    const { title, description, totalMarks, dueDate, allowLate, status } = req.body;

    let attachmentUrl = existing.attachmentUrl;
    if (req.file) {
      // Delete old file if exists
      if (existing.attachmentUrl) {
        const oldPath = pathFromUrl(existing.attachmentUrl, BUCKET);
        if (oldPath) await deleteFromStorage(BUCKET, oldPath);
      }
      const ext = req.file.originalname.split('.').pop();
      const filePath = `teacher-files/${existing.offeringId}/${uuidv4()}.${ext}`;
      attachmentUrl = await uploadToStorage(BUCKET, filePath, req.file.buffer, req.file.mimetype);
    }

    const assignment = await prisma.assignment.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        totalMarks: totalMarks !== undefined ? +totalMarks : existing.totalMarks,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        allowLate: allowLate !== undefined ? (allowLate === 'true' || allowLate === true) : existing.allowLate,
        status: status ?? existing.status,
        attachmentUrl,
      },
      include: assignmentInclude,
    });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/assignments/:id
export const deleteAssignment = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { offering: { select: { teacherId: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (existing.offering.teacherId !== teacher?.id) {
      return res.status(403).json({ success: false, message: 'Not your assignment' });
    }

    if (existing.attachmentUrl) {
      const oldPath = pathFromUrl(existing.attachmentUrl, BUCKET);
      if (oldPath) await deleteFromStorage(BUCKET, oldPath);
    }

    await prisma.assignment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/assignments/:id/submissions  — teacher views all submissions
export const getSubmissions = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { offering: { select: { id: true, teacherId: true, _count: { select: { enrollments: true } } } } },
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    let allowed = req.user.role === 'admin';
    if (!allowed && req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      allowed = teacher && assignment.offering.teacherId === teacher.id;
    }
    if (!allowed && req.user.role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student) {
        const ta = await prisma.tAAssignment.findUnique({
          where: { studentId_offeringId: { studentId: student.id, offeringId: assignment.offering.id } },
        });
        allowed = ta && ta.status === 'APPROVED' && ta.permissions.includes('GRADE_ASSIGNMENTS');
      }
    }
    if (!allowed) return res.status(403).json({ success: false, message: 'Not authorised' });

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: req.params.id },
      include: {
        student: { select: { id: true, studentId: true, user: { select: { name: true, email: true } } } },
        taPendingGrades: {
          where: req.user.role === 'student' ? { taStudent: { is: { userId: req.user.id } } } : undefined,
          include: { taStudent: { select: { id: true, studentId: true, user: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });
    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/submissions/:id/grade  — teacher (or TA with GRADE_ASSIGNMENTS) grades a submission
export const gradeSubmission = async (req, res) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        assignment: {
          include: {
            offering: {
              select: {
                id: true,
                teacherId: true,
                term: { select: { code: true, isActive: true, endDate: true } },
              },
            },
          },
        },
      },
    });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    let graderId = null; // teacher.id, student.id (TA), or user.id (admin)
    let allowed = false;
    let isTAGrader = false;
    if (req.user.role === 'admin') { allowed = true; graderId = req.user.id; }
    if (!allowed && req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (teacher && submission.assignment.offering.teacherId === teacher.id) {
        allowed = true; graderId = teacher.id;
      }
    }
    if (!allowed && req.user.role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (student) {
        const ta = await prisma.tAAssignment.findUnique({
          where: { studentId_offeringId: { studentId: student.id, offeringId: submission.assignment.offering.id } },
        });
        if (ta && ta.status === 'APPROVED' && ta.permissions.includes('GRADE_ASSIGNMENTS')) {
          allowed = true;
          isTAGrader = true;
          graderId = student.id;
        }
      }
    }
    if (!allowed) return res.status(403).json({ success: false, message: 'Not authorised to grade this submission' });
    if (isTAGrader && graderId === submission.studentId) {
      return res.status(403).json({ success: false, message: 'Teaching assistants cannot grade their own submissions' });
    }

    const gradingWindowError = getGradingWindowError(submission.assignment.offering.term);
    if (gradingWindowError) {
      return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
    }

    const { obtainedMarks, feedback } = req.body;
    const requestedMarks = Number(obtainedMarks);
    if (!Number.isFinite(requestedMarks) || requestedMarks < 0 || requestedMarks > submission.assignment.totalMarks) {
      return res.status(400).json({
        success: false,
        message: `obtainedMarks must be between 0 and ${submission.assignment.totalMarks}`,
      });
    }
    const cleanFeedback = feedback === undefined ? null : String(feedback).trim().slice(0, 4000);

    if (isTAGrader) {
      const pending = await prisma.tAPendingGrade.upsert({
        where: { submissionId_taStudentId: { submissionId: submission.id, taStudentId: graderId } },
        create: {
          submissionId: submission.id,
          taStudentId: graderId,
          marksAwarded: requestedMarks,
          feedback: cleanFeedback,
        },
        update: {
          marksAwarded: requestedMarks,
          feedback: cleanFeedback,
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          appliedGrade: null,
        },
      });

      const teacher = await prisma.teacher.findUnique({
        where: { id: submission.assignment.offering.teacherId },
        select: { userId: true },
      });
      if (teacher?.userId) {
        await notify({
          userId: teacher.userId,
          type: TYPE.GENERAL,
          title: 'TA grade pending approval',
          body: `${req.user.name} graded ${submission.assignment.title}. Review it before students see the mark.`,
          linkUrl: '/teacher/assignments',
          metadata: { pendingGradeId: pending.id, submissionId: submission.id, assignmentId: submission.assignmentId },
        });
      }

      return res.json({
        success: true,
        pendingApproval: true,
        message: 'Grade saved for teacher approval',
        data: pending,
      });
    }

    const updated = await prisma.submission.update({
      where: { id: req.params.id },
      data: {
        obtainedMarks: requestedMarks,
        feedback: cleanFeedback,
        status: 'GRADED',
        gradedAt: new Date(),
        gradedBy: graderId,
      },
    });

    // Notify student
    (async () => {
      const student = await prisma.student.findUnique({ where: { id: submission.studentId }, select: { userId: true } });
      const assignment = await prisma.assignment.findUnique({
        where: { id: submission.assignmentId },
        include: { offering: { include: { course: true } } },
      });
      if (student?.userId && assignment) {
        notify({
          userId: student.userId,
          type: TYPE.ASSIGNMENT_GRADED,
          title: `Assignment graded: ${assignment.title}`,
          body: `${assignment.offering?.course?.code || ''} · ${updated.obtainedMarks ?? '—'} / ${assignment.totalMarks}`,
          linkUrl: '/student/assignments',
          metadata: { assignmentId: assignment.id, submissionId: updated.id },
        });
      }
    })();

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const assertCanReviewPendingSubmissionGrade = async (user, pendingId) => {
  const pending = await prisma.tAPendingGrade.findUnique({
    where: { id: pendingId },
    include: {
      taStudent: { select: { userId: true, user: { select: { name: true } } } },
      submission: {
        include: {
          student: { select: { userId: true } },
          assignment: {
            include: {
              offering: {
                include: {
                  teacher: { select: { id: true, userId: true } },
                  course: { select: { code: true } },
                  term: { select: { code: true, isActive: true, endDate: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!pending || !pending.submission) return { error: 404, message: 'Pending grade not found' };
  if (pending.status !== 'PENDING') return { error: 409, message: `Pending grade is already ${pending.status.toLowerCase()}` };
  if (user.role === 'admin') return { pending };
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
  if (!teacher || pending.submission.assignment.offering.teacherId !== teacher.id) {
    return { error: 403, message: 'Not authorised to review this grade' };
  }
  return { pending };
};

// PUT /api/assignments/pending-grades/:id/approve
export const approvePendingSubmissionGrade = async (req, res) => {
  try {
    const access = await assertCanReviewPendingSubmissionGrade(req.user, req.params.id);
    if (access.error) return res.status(access.error).json({ success: false, message: access.message });
    const { pending } = access;

    const gradingWindowError = getGradingWindowError(pending.submission.assignment.offering.term);
    if (gradingWindowError) {
      return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
    }

    const [updatedSubmission, updatedPending] = await prisma.$transaction([
      prisma.submission.update({
        where: { id: pending.submissionId },
        data: {
          obtainedMarks: pending.marksAwarded,
          feedback: pending.feedback,
          status: 'GRADED',
          gradedAt: new Date(),
          gradedBy: pending.taStudentId,
        },
      }),
      prisma.tAPendingGrade.update({
        where: { id: pending.id },
        data: {
          status: 'APPROVED',
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          reviewNotes: req.body.reviewNotes ? String(req.body.reviewNotes).trim().slice(0, 1000) : null,
          appliedGrade: pending.marksAwarded,
        },
      }),
    ]);

    if (pending.submission.student?.userId) {
      await notify({
        userId: pending.submission.student.userId,
        type: TYPE.ASSIGNMENT_GRADED,
        title: `Assignment graded: ${pending.submission.assignment.title}`,
        body: `${pending.submission.assignment.offering.course.code} · ${updatedSubmission.obtainedMarks} / ${pending.submission.assignment.totalMarks}`,
        linkUrl: '/student/assignments',
        metadata: { assignmentId: pending.submission.assignmentId, submissionId: updatedSubmission.id },
      });
    }
    if (pending.taStudent?.userId) {
      await notify({
        userId: pending.taStudent.userId,
        type: TYPE.GENERAL,
        title: 'TA grade approved',
        body: `${pending.submission.assignment.title}: ${pending.marksAwarded} mark(s) approved.`,
        linkUrl: '/student/ta',
        metadata: { pendingGradeId: pending.id, submissionId: pending.submissionId },
      });
    }

    res.json({ success: true, data: { submission: updatedSubmission, pendingGrade: updatedPending } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/assignments/pending-grades/:id/reject
export const rejectPendingSubmissionGrade = async (req, res) => {
  try {
    const access = await assertCanReviewPendingSubmissionGrade(req.user, req.params.id);
    if (access.error) return res.status(access.error).json({ success: false, message: access.message });
    const { pending } = access;
    const updated = await prisma.tAPendingGrade.update({
      where: { id: pending.id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reviewNotes: req.body.reviewNotes ? String(req.body.reviewNotes).trim().slice(0, 1000) : null,
      },
    });

    if (pending.taStudent?.userId) {
      await notify({
        userId: pending.taStudent.userId,
        type: TYPE.GENERAL,
        title: 'TA grade rejected',
        body: pending.submission?.assignment?.title || 'A pending TA grade was rejected.',
        linkUrl: '/student/ta',
        metadata: { pendingGradeId: pending.id, submissionId: pending.submissionId },
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STUDENT ENDPOINTS ────────────────────────────────────────────────────────

// POST /api/assignments/:id/submit  — student submits
export const submitAssignment = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.status === 'DRAFT') return res.status(400).json({ success: false, message: 'Assignment not published yet' });
    if (assignment.status === 'CLOSED') {
      return res.status(409).json({
        success: false,
        code: 'SUBMISSIONS_CLOSED',
        message: 'Submissions have been closed by the teacher',
      });
    }

    const isLate = new Date() > new Date(assignment.dueDate);
    if (isLate && !assignment.allowLate) {
      return res.status(400).json({ success: false, message: 'Deadline has passed and late submissions are not allowed' });
    }

    const { submissionText } = req.body;
    if (!submissionText && !req.file) {
      return res.status(400).json({ success: false, message: 'Provide submissionText or upload a file' });
    }

    let attachmentUrl = null;
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const filePath = `submissions/${assignment.offeringId}/${student.id}/${uuidv4()}.${ext}`;
      attachmentUrl = await uploadToStorage(BUCKET, filePath, req.file.buffer, req.file.mimetype);
    }

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    });

    let submission;
    if (existing) {
      // Re-submission — replace old file if any
      if (existing.attachmentUrl && attachmentUrl) {
        const oldPath = pathFromUrl(existing.attachmentUrl, BUCKET);
        if (oldPath) await deleteFromStorage(BUCKET, oldPath);
      }
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          submissionText: submissionText ?? existing.submissionText,
          attachmentUrl: attachmentUrl ?? existing.attachmentUrl,
          isLate,
          status: isLate ? 'LATE' : 'SUBMITTED',
          submittedAt: new Date(),
          // Reset grading on re-submit
          obtainedMarks: null,
          feedback: null,
          gradedAt: null,
          gradedBy: null,
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          submissionText: submissionText ?? null,
          attachmentUrl,
          isLate,
          status: isLate ? 'LATE' : 'SUBMITTED',
        },
      });
    }
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/assignments/:id/my-submission
export const getMySubmission = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const submission = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: req.params.id, studentId: student.id } },
    });
    res.json({ success: true, data: submission ?? null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
