import prisma from '../prisma/client.js';
import { notify, notifyMany, TYPE } from '../services/notificationService.js';
import { runQuizExpiryMaintenance } from '../services/quizLifecycleService.js';
import { getGradingWindowError } from '../utils/gradingWindow.js';
import { validateQuizPayload } from '../utils/quizValidation.js';
import { createQuizImportTemplate, parseQuizQuestionsWorkbook } from '../utils/quizExcel.js';
import { syncQuizAttemptMark, validateCourseworkSlot } from '../utils/courseworkMarks.js';

const quizInclude = {
  offering: {
    select: {
      id: true, section: true,
      course: { select: { id: true, code: true, title: true } },
      term: { select: { id: true, code: true, season: true, academicYear: true } },
    },
  },
  _count: { select: { questions: true, attempts: true } },
};

const verifyTeacherOwnsOffering = async (userId, offeringId) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) return { error: 'Teacher profile not found', status: 403 };
  const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } });
  if (!offering) return { error: 'Not your offering', status: 403 };
  return { teacher };
};

const verifyTeacherOwnsQuiz = async (userId, quizId) => {
  const teacher = await prisma.teacher.findUnique({ where: { userId } });
  if (!teacher) return { error: 'Teacher profile not found', status: 403 };
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { offering: { select: { teacherId: true } } },
  });
  if (!quiz) return { error: 'Quiz not found', status: 404 };
  if (quiz.offering.teacherId !== teacher.id) return { error: 'Not your quiz', status: 403 };
  return { teacher, quiz };
};

const getApprovedTAAssignment = async ({ userId, offeringId, permission }) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) return null;
  const ta = await prisma.tAAssignment.findUnique({
    where: { studentId_offeringId: { studentId: student.id, offeringId } },
    include: { offering: { include: { teacher: { select: { userId: true } }, course: { select: { code: true } } } } },
  });
  if (!ta || ta.status !== 'APPROVED' || !ta.permissions.includes(permission)) return null;
  return { student, ta };
};

const verifyQuizGradingAccess = async (user, quizId) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      offering: {
        include: {
          teacher: { select: { id: true, userId: true } },
          course: { select: { code: true, title: true } },
          term: { select: { code: true, isActive: true, endDate: true } },
        },
      },
    },
  });
  if (!quiz) return { error: 'Quiz not found', status: 404 };
  if (user.role === 'admin') return { quiz };
  if (user.role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher || quiz.offering.teacherId !== teacher.id) return { error: 'Not your quiz', status: 403 };
    return { quiz, teacher };
  }
  if (user.role === 'student') {
    const taAccess = await getApprovedTAAssignment({
      userId: user.id,
      offeringId: quiz.offeringId,
      permission: 'GRADE_QUIZZES',
    });
    if (!taAccess) return { error: 'Not authorised to grade quizzes for this offering', status: 403 };
    return { quiz, taAccess };
  }
  return { error: 'Not authorised', status: 403 };
};

const hasShortAnswerText = (answer) => (
  answer !== null
  && answer !== undefined
  && String(answer).trim() !== ''
);

const recomputeAttemptScores = async (tx, attemptId) => {
  const allAnswers = await tx.quizAnswer.findMany({
    where: { attemptId },
    include: { question: { select: { type: true } } },
  });
  const autoScore = allAnswers
    .filter((entry) => entry.question.type !== 'SHORT')
    .reduce((sum, entry) => sum + (entry.marksAwarded || 0), 0);
  const manualScore = allAnswers
    .filter((entry) => entry.question.type === 'SHORT' && entry.isCorrect !== null)
    .reduce((sum, entry) => sum + (entry.marksAwarded || 0), 0);
  const pending = allAnswers.filter(
    (entry) => entry.question.type === 'SHORT' && entry.isCorrect === null && hasShortAnswerText(entry.answer)
  ).length;
  const totalScore = autoScore + manualScore;
  const attempt = await tx.quizAttempt.update({
    where: { id: attemptId },
    data: { autoGradedScore: autoScore, manualScore, totalScore },
    include: {
      quiz: {
        select: {
          offeringId: true,
          componentIndex: true,
          title: true,
          endAt: true,
          totalMarks: true,
        },
      },
    },
  });
  await syncQuizAttemptMark({ client: tx, attempt, totalScore, manualPending: pending });
  return { attempt, totalScore, manualPending: pending };
};

// ─── TEACHER ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/quizzes?offeringId=
export const getQuizzes = async (req, res) => {
  try {
    const { offeringId } = req.query;
    const where = {};

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

      if (offeringId) {
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
        permission: 'GRADE_QUIZZES',
      });
      if (!taAccess) return res.status(403).json({ success: false, message: 'Not authorised for this offering' });
      where.offeringId = offeringId;
    } else if (req.user.role === 'admin' && offeringId) {
      where.offeringId = offeringId;
    } else if (req.user.role === 'admin') {
      // admin may list all quizzes
    } else {
      return res.status(400).json({ success: false, message: 'offeringId is required for TA quiz access' });
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: quizInclude,
      orderBy: { startAt: 'desc' },
    });
    res.json({ success: true, count: quizzes.length, data: quizzes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/quizzes/:id  (teacher view — includes correct answers)
export const getQuizById = async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        ...quizInclude,
        questions: { orderBy: { order: 'asc' } },
      },
    });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    const owns = teacher && await prisma.courseOffering.findFirst({
      where: { id: quiz.offeringId, teacherId: teacher.id },
      select: { id: true },
    });
    if (!owns) return res.status(403).json({ success: false, message: 'Not your quiz' });

    res.json({ success: true, data: quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/quizzes
export const createQuiz = async (req, res) => {
  try {
    const { offeringId, componentIndex } = req.body;
    if (!offeringId || !req.body.title || !req.body.startAt || !req.body.endAt) {
      return res.status(400).json({ success: false, message: 'offeringId, title, startAt, endAt are required' });
    }

    const check = await verifyTeacherOwnsOffering(req.user.id, offeringId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    let validated;
    try {
      validated = validateQuizPayload(req.body);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    const totalMarks = validated.questions.reduce((sum, question) => sum + question.marks, 0);
    const slot = await validateCourseworkSlot({
      client: prisma,
      offeringId,
      kind: 'QUIZ',
      componentIndex,
      model: 'quiz',
    });
    if (slot.error) return res.status(400).json({ success: false, message: slot.error });

    const quiz = await prisma.quiz.create({
      data: {
        offeringId,
        componentIndex: slot.index,
        title: validated.title,
        description: validated.description ?? null,
        durationMinutes: validated.durationMinutes ?? 30,
        startAt: validated.startAt,
        endAt: validated.endAt,
        status: validated.status || 'DRAFT',
        deliveryMode: validated.deliveryMode || 'ONLINE',
        shuffleQuestions: validated.shuffleQuestions ?? false,
        maxViolations: validated.maxViolations ?? 3,
        allowReview: validated.allowReview ?? true,
        totalMarks,
        questions: { create: validated.questions },
      },
      include: { ...quizInclude, questions: { orderBy: { order: 'asc' } } },
    });

    // Notify enrolled students if published
    if (quiz.status === 'PUBLISHED' && quiz.deliveryMode === 'ONLINE') {
      (async () => {
        const enrollments = await prisma.enrollment.findMany({
          where: { offeringId, status: 'ENROLLED' },
          select: { student: { select: { userId: true } } },
        });
        const userIds = enrollments.map((e) => e.student?.userId).filter(Boolean);
        notifyMany({
          userIds,
          type: TYPE.QUIZ_NEW,
          title: `New quiz: ${quiz.title}`,
          body: `${quiz.offering?.course?.code || ''} · Opens ${new Date(quiz.startAt).toLocaleString()}`,
          linkUrl: '/student/quizzes',
          metadata: { quizId: quiz.id, offeringId },
        });
      })();
    }

    res.status(201).json({ success: true, data: quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/quizzes/:id  — update quiz metadata + replace questions
export const updateQuiz = async (req, res) => {
  try {
    const check = await verifyTeacherOwnsQuiz(req.user.id, req.params.id);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    let validated;
    try {
      validated = validateQuizPayload(req.body, { partial: true });
      const prospectiveStart = validated.startAt || check.quiz.startAt;
      const prospectiveEnd = validated.endAt || check.quiz.endAt;
      if (prospectiveEnd <= prospectiveStart) throw new Error('endAt must be after startAt');
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Block question edits after any attempt has started
    if (validated.questions) {
      const attemptCount = await prisma.quizAttempt.count({ where: { quizId: req.params.id } });
      if (attemptCount > 0) {
        return res.status(400).json({ success: false, message: 'Cannot modify questions after students have attempted' });
      }
    }

    const totalMarks = validated.questions
      ? validated.questions.reduce((sum, question) => sum + question.marks, 0)
      : undefined;
    const nextComponentIndex = req.body.componentIndex !== undefined ? req.body.componentIndex : check.quiz.componentIndex;
    const slot = await validateCourseworkSlot({
      client: prisma,
      offeringId: check.quiz.offeringId,
      kind: 'QUIZ',
      componentIndex: nextComponentIndex,
      model: 'quiz',
      excludeId: check.quiz.id,
    });
    if (slot.error) return res.status(400).json({ success: false, message: slot.error });

    const data = {
      componentIndex: slot.index,
      title: validated.title,
      description: validated.description,
      durationMinutes: validated.durationMinutes,
      startAt: validated.startAt,
      endAt: validated.endAt,
      status: validated.status,
      deliveryMode: validated.deliveryMode,
      shuffleQuestions: validated.shuffleQuestions,
      maxViolations: validated.maxViolations,
      allowReview: validated.allowReview,
      totalMarks,
    };

    if (validated.questions) {
      data.questions = {
        deleteMany: {},
        create: validated.questions,
      };
    }

    const quiz = await prisma.$transaction((tx) => tx.quiz.update({
      where: { id: req.params.id },
      data,
      include: { ...quizInclude, questions: { orderBy: { order: 'asc' } } },
    }));

    if (check.quiz.status !== 'PUBLISHED' && quiz.status === 'PUBLISHED' && quiz.deliveryMode === 'ONLINE') {
      (async () => {
        const enrollments = await prisma.enrollment.findMany({
          where: { offeringId: quiz.offeringId, status: 'ENROLLED' },
          select: { student: { select: { userId: true } } },
        });
        notifyMany({
          userIds: enrollments.map((entry) => entry.student?.userId).filter(Boolean),
          type: TYPE.QUIZ_NEW,
          title: `New quiz: ${quiz.title}`,
          body: `${quiz.offering?.course?.code || ''} · Opens ${new Date(quiz.startAt).toLocaleString()}`,
          linkUrl: '/student/quizzes',
          metadata: { quizId: quiz.id, offeringId: quiz.offeringId },
        });
      })();
    }

    res.json({ success: true, data: quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/quizzes/:id
export const deleteQuiz = async (req, res) => {
  try {
    const check = await verifyTeacherOwnsQuiz(req.user.id, req.params.id);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    await prisma.quiz.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/quizzes/import-excel  — bulk import questions from Excel
// Excel columns: type | questionText | option1 | option2 | option3 | option4 | correctAnswer | marks
export const importQuestionsFromExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Excel file is required' });
    const questions = parseQuizQuestionsWorkbook(req.file.buffer);

    res.json({ success: true, count: questions.length, data: questions });
  } catch (err) {
    res.status(400).json({ success: false, message: `Invalid Excel data: ${err.message}` });
  }
};

// GET /api/quizzes/import-excel/template — download a workbook matching the importer
export const downloadQuizImportTemplate = async (req, res) => {
  try {
    const buffer = createQuizImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=campusone_quiz_import_template.xlsx');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/quizzes/:id/attempts  — teacher views the full student roster with attempt state
export const getQuizAttempts = async (req, res) => {
  try {
    const check = await verifyQuizGradingAccess(req.user, req.params.id);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    await runQuizExpiryMaintenance({ offeringId: check.quiz.offeringId });

    const [enrollments, attempts, grants] = await Promise.all([
      prisma.enrollment.findMany({
        where: { offeringId: check.quiz.offeringId, status: { in: ['ENROLLED', 'COMPLETED'] } },
        include: {
          student: { select: { id: true, studentId: true, user: { select: { name: true, email: true } } } },
        },
        orderBy: { student: { studentId: 'asc' } },
      }),
      prisma.quizAttempt.findMany({
        where: { quizId: req.params.id },
        include: {
          student: { select: { id: true, studentId: true, user: { select: { name: true, email: true } } } },
        },
      }),
      prisma.quizReopenGrant.findMany({
        where: { quizId: req.params.id },
      }),
    ]);
    const attemptsByStudentId = new Map(attempts.map((attempt) => [attempt.studentId, attempt]));
    const grantsByStudentId = new Map(grants.map((grant) => [grant.studentId, grant]));
    const now = Date.now();
    const roster = enrollments.map((enrollment) => {
      const attempt = attemptsByStudentId.get(enrollment.studentId) || null;
      const reopenGrant = grantsByStudentId.get(enrollment.studentId) || null;
      const grantActive = reopenGrant && new Date(reopenGrant.until).getTime() > now;
      return {
        id: attempt?.id || `student-${enrollment.studentId}`,
        enrollmentId: enrollment.id,
        enrollmentStatus: enrollment.status,
        student: enrollment.student,
        attempt,
        reopenGrant,
        reopenedUntil: attempt?.reopenedUntil || reopenGrant?.until || null,
        status: attempt?.status || (grantActive ? 'REOPENED' : 'NOT_STARTED'),
        totalScore: attempt?.totalScore ?? null,
        submittedAt: attempt?.submittedAt ?? null,
        startedAt: attempt?.startedAt ?? null,
        violations: attempt?.violations ?? 0,
      };
    });

    res.json({ success: true, count: roster.length, attemptedCount: attempts.length, data: roster });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/quizzes/:id/reopen — teacher grants one student a personal reopen window
export const grantQuizReopen = async (req, res) => {
  try {
    const access = await verifyQuizGradingAccess(req.user, req.params.id);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    if (access.taAccess) {
      return res.status(403).json({ success: false, message: 'Teaching assistants cannot reopen quizzes' });
    }
    const { quiz } = access;
    if (quiz.deliveryMode !== 'ONLINE') {
      return res.status(400).json({ success: false, message: 'Only online quizzes can be reopened' });
    }

    const studentId = String(req.body.studentId || '').trim();
    const minutes = req.body.minutes === undefined || req.body.minutes === ''
      ? quiz.durationMinutes
      : Number(req.body.minutes);
    const reason = req.body.reason ? String(req.body.reason).trim().slice(0, 500) : null;

    if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required' });
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 10080) {
      return res.status(400).json({ success: false, message: 'Minutes must be between 1 and 10080' });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, offeringId: quiz.offeringId, status: { in: ['ENROLLED', 'COMPLETED', 'INCOMPLETE'] } },
      select: { id: true },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Student is not enrolled in this offering' });

    const existingAttempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId: quiz.id, studentId } },
    });
    if (existingAttempt && existingAttempt.status !== 'IN_PROGRESS') {
      return res.status(409).json({ success: false, message: 'This student already has a submitted attempt' });
    }

    const until = new Date(Date.now() + minutes * 60_000);
    const result = await prisma.$transaction(async (tx) => {
      const grant = await tx.quizReopenGrant.upsert({
        where: { quizId_studentId: { quizId: quiz.id, studentId } },
        create: {
          quizId: quiz.id,
          studentId,
          grantedBy: req.user.id,
          until,
          reason,
        },
        update: {
          grantedBy: req.user.id,
          until,
          reason,
          usedAt: null,
        },
      });

      if (existingAttempt?.status === 'IN_PROGRESS') {
        await tx.quizAttempt.update({
          where: { id: existingAttempt.id },
          data: {
            reopenedUntil: until,
            reopenedBy: req.user.id,
            reopenedAt: new Date(),
            reopenGrantId: grant.id,
          },
        });
      }

      if (quiz.componentIndex) {
        await tx.markComponent.updateMany({
          where: {
            enrollmentId: enrollment.id,
            kind: 'QUIZ',
            index: quiz.componentIndex,
          },
          data: {
            title: quiz.title,
            date: quiz.endAt,
            obtainedMarks: null,
          },
        });
      }

      return grant;
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/quizzes/:id/offline-marks — teacher records a printed/written quiz mark
export const saveOfflineQuizMark = async (req, res) => {
  try {
    const access = await verifyQuizGradingAccess(req.user, req.params.id);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    if (access.taAccess) {
      return res.status(403).json({ success: false, message: 'Teaching assistants cannot record offline quiz marks' });
    }
    const { quiz } = access;
    if (quiz.deliveryMode !== 'OFFLINE') {
      return res.status(400).json({ success: false, message: 'Offline marks can only be recorded for printed/offline quizzes' });
    }

    const gradingWindowError = getGradingWindowError(quiz.offering.term);
    if (gradingWindowError) {
      return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
    }

    const studentId = String(req.body.studentId || '').trim();
    const marksAwarded = Number(req.body.marksAwarded);
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required' });
    if (!Number.isFinite(marksAwarded) || marksAwarded < 0 || marksAwarded > quiz.totalMarks) {
      return res.status(400).json({ success: false, message: `Marks must be between 0 and ${quiz.totalMarks}` });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, offeringId: quiz.offeringId, status: { in: ['ENROLLED', 'COMPLETED'] } },
      select: { id: true, student: { select: { userId: true } } },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Student is not enrolled in this offering' });

    const attempt = await prisma.$transaction(async (tx) => {
      const savedAttempt = await tx.quizAttempt.upsert({
        where: { quizId_studentId: { quizId: quiz.id, studentId } },
        create: {
          quizId: quiz.id,
          studentId,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          totalScore: marksAwarded,
          manualScore: marksAwarded,
          autoGradedScore: 0,
          questionOrder: [],
        },
        update: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          totalScore: marksAwarded,
          manualScore: marksAwarded,
          autoGradedScore: 0,
        },
        include: {
          student: { select: { id: true, studentId: true, user: { select: { name: true, email: true } } } },
          quiz: { select: { id: true, title: true, totalMarks: true, offeringId: true, componentIndex: true, endAt: true } },
        },
      });
      await syncQuizAttemptMark({ client: tx, attempt: savedAttempt, totalScore: marksAwarded, manualPending: 0 });
      return savedAttempt;
    });

    if (enrollment.student?.userId) {
      await notify({
        userId: enrollment.student.userId,
        type: TYPE.QUIZ_GRADED,
        title: `Quiz graded: ${quiz.title}`,
        body: `${marksAwarded} / ${quiz.totalMarks}`,
        linkUrl: '/student/grades',
        metadata: { quizId: quiz.id, attemptId: attempt.id, offline: true },
      });
    }

    res.json({ success: true, data: attempt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/quizzes/attempts/:attemptId  — teacher views single attempt with answers
export const getAttemptDetail = async (req, res) => {
  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: {
        quiz: {
          include: {
            offering: {
              include: {
                teacher: { select: { id: true, userId: true } },
                course: { select: { code: true, title: true } },
              },
            },
            questions: { orderBy: { order: 'asc' } },
          },
        },
        student: { select: { id: true, studentId: true, user: { select: { name: true, email: true } } } },
        answers: {
          include: {
            question: true,
            taPendingGrades: {
              where: req.user.role === 'student' ? { taStudent: { is: { userId: req.user.id } } } : undefined,
              include: { taStudent: { select: { id: true, studentId: true, user: { select: { name: true } } } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    const check = await verifyQuizGradingAccess(req.user, attempt.quizId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });
    if (check.taAccess && check.taAccess.student.id === attempt.studentId) {
      return res.status(403).json({ success: false, message: 'Teaching assistants cannot grade their own quiz attempt' });
    }

    res.json({ success: true, data: attempt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/quizzes/answers/:answerId/grade  — teacher grades a SHORT answer
export const gradeAnswer = async (req, res) => {
  try {
    const answer = await prisma.quizAnswer.findUnique({
      where: { id: req.params.answerId },
      include: {
        question: true,
        attempt: {
          include: {
            quiz: {
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
            student: { select: { userId: true } },
          },
        },
      },
    });
    if (!answer) return res.status(404).json({ success: false, message: 'Answer not found' });

    const access = await verifyQuizGradingAccess(req.user, answer.attempt.quizId);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });
    if (access.taAccess && access.taAccess.student.id === answer.attempt.studentId) {
      return res.status(403).json({ success: false, message: 'Teaching assistants cannot grade their own quiz attempt' });
    }

    const gradingWindowError = getGradingWindowError(answer.attempt.quiz.offering.term);
    if (gradingWindowError) {
      return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
    }

    if (answer.question.type !== 'SHORT') {
      return res.status(400).json({ success: false, message: 'Only short answers can be graded manually' });
    }

    const requestedMarks = Number(req.body.marksAwarded);
    if (!Number.isFinite(requestedMarks) || requestedMarks < 0 || requestedMarks > answer.question.marks) {
      return res.status(400).json({
        success: false,
        message: `marksAwarded must be between 0 and ${answer.question.marks}`,
      });
    }
    const feedback = req.body.feedback === undefined ? null : String(req.body.feedback).trim().slice(0, 4000);

    if (access.taAccess) {
      const pending = await prisma.tAPendingGrade.upsert({
        where: { answerId_taStudentId: { answerId: answer.id, taStudentId: access.taAccess.student.id } },
        create: {
          answerId: answer.id,
          taStudentId: access.taAccess.student.id,
          marksAwarded: requestedMarks,
          feedback: feedback || null,
        },
        update: {
          marksAwarded: requestedMarks,
          feedback: feedback || null,
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
          appliedGrade: null,
        },
      });

      if (answer.attempt.quiz.offering.teacher?.userId) {
        await notify({
          userId: answer.attempt.quiz.offering.teacher.userId,
          type: TYPE.GENERAL,
          title: 'TA quiz grade pending approval',
          body: `${req.user.name} graded a short answer in ${answer.attempt.quiz.title}. Review it before students see the mark.`,
          linkUrl: '/teacher/quizzes',
          metadata: { pendingGradeId: pending.id, answerId: answer.id, attemptId: answer.attemptId, quizId: answer.attempt.quizId },
        });
      }

      return res.json({
        success: true,
        pendingApproval: true,
        message: 'Quiz grade saved for teacher approval',
        data: pending,
      });
    }

    const { updated, total, manualPending } = await prisma.$transaction(async (tx) => {
      await tx.quizAnswer.update({
        where: { id: req.params.answerId },
        data: {
          marksAwarded: requestedMarks,
          isCorrect: requestedMarks === answer.question.marks,
          feedback: feedback || null,
        },
      });

      const recomputed = await recomputeAttemptScores(tx, answer.attemptId);
      return { updated: recomputed.attempt, total: recomputed.totalScore, manualPending: recomputed.manualPending };
    });

    // Notify the student
    (async () => {
      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: answer.attemptId },
        include: { student: { select: { userId: true } }, quiz: { select: { id: true, title: true, totalMarks: true } } },
      });
      if (attempt?.student?.userId) {
        notify({
          userId: attempt.student.userId,
          type: TYPE.QUIZ_GRADED,
          title: `Quiz graded: ${attempt.quiz.title}`,
          body: manualPending > 0
            ? `${total} / ${attempt.quiz.totalMarks} so far · ${manualPending} answer(s) pending`
            : `${total} / ${attempt.quiz.totalMarks}`,
          linkUrl: '/student/quizzes',
          metadata: { quizId: attempt.quiz.id, attemptId: attempt.id },
        });
      }
    })();

    res.json({
      success: true,
      data: {
        ...updated,
        gradingStatus: manualPending > 0 ? 'PENDING_MANUAL' : 'FINAL',
        manualPending,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const assertCanReviewPendingQuizGrade = async (user, pendingId) => {
  const pending = await prisma.tAPendingGrade.findUnique({
    where: { id: pendingId },
    include: {
      taStudent: { select: { userId: true, user: { select: { name: true } } } },
      answer: {
        include: {
          question: true,
          attempt: {
            include: {
              student: { select: { userId: true } },
              quiz: {
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
      },
    },
  });
  if (!pending || !pending.answer) return { error: 404, message: 'Pending quiz grade not found' };
  if (pending.status !== 'PENDING') return { error: 409, message: `Pending grade is already ${pending.status.toLowerCase()}` };
  if (user.role === 'admin') return { pending };
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
  if (!teacher || pending.answer.attempt.quiz.offering.teacherId !== teacher.id) {
    return { error: 403, message: 'Not authorised to review this grade' };
  }
  return { pending };
};

// PUT /api/quizzes/pending-grades/:id/approve
export const approvePendingQuizGrade = async (req, res) => {
  try {
    const access = await assertCanReviewPendingQuizGrade(req.user, req.params.id);
    if (access.error) return res.status(access.error).json({ success: false, message: access.message });
    const { pending } = access;

    const gradingWindowError = getGradingWindowError(pending.answer.attempt.quiz.offering.term);
    if (gradingWindowError) {
      return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.quizAnswer.update({
        where: { id: pending.answerId },
        data: {
          marksAwarded: pending.marksAwarded,
          isCorrect: pending.marksAwarded === pending.answer.question.marks,
          feedback: pending.feedback,
        },
      });
      const recomputed = await recomputeAttemptScores(tx, pending.answer.attemptId);
      const updatedPending = await tx.tAPendingGrade.update({
        where: { id: pending.id },
        data: {
          status: 'APPROVED',
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          reviewNotes: req.body.reviewNotes ? String(req.body.reviewNotes).trim().slice(0, 1000) : null,
          appliedGrade: pending.marksAwarded,
        },
      });
      return { ...recomputed, pendingGrade: updatedPending };
    });

    if (pending.answer.attempt.student?.userId) {
      await notify({
        userId: pending.answer.attempt.student.userId,
        type: TYPE.QUIZ_GRADED,
        title: `Quiz graded: ${pending.answer.attempt.quiz.title}`,
        body: result.manualPending > 0
          ? `${result.totalScore} / ${pending.answer.attempt.quiz.totalMarks} so far · ${result.manualPending} answer(s) pending`
          : `${result.totalScore} / ${pending.answer.attempt.quiz.totalMarks}`,
        linkUrl: '/student/quizzes',
        metadata: { quizId: pending.answer.attempt.quizId, attemptId: pending.answer.attemptId },
      });
    }
    if (pending.taStudent?.userId) {
      await notify({
        userId: pending.taStudent.userId,
        type: TYPE.GENERAL,
        title: 'TA quiz grade approved',
        body: `${pending.answer.attempt.quiz.title}: ${pending.marksAwarded} mark(s) approved.`,
        linkUrl: '/student/ta',
        metadata: { pendingGradeId: pending.id, answerId: pending.answerId },
      });
    }

    res.json({
      success: true,
      data: {
        ...result.attempt,
        pendingGrade: result.pendingGrade,
        gradingStatus: result.manualPending > 0 ? 'PENDING_MANUAL' : 'FINAL',
        manualPending: result.manualPending,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/quizzes/pending-grades/:id/reject
export const rejectPendingQuizGrade = async (req, res) => {
  try {
    const access = await assertCanReviewPendingQuizGrade(req.user, req.params.id);
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
        title: 'TA quiz grade rejected',
        body: pending.answer?.attempt?.quiz?.title || 'A pending TA quiz grade was rejected.',
        linkUrl: '/student/ta',
        metadata: { pendingGradeId: pending.id, answerId: pending.answerId },
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
