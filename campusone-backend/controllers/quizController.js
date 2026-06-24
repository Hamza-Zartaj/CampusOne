import prisma from '../prisma/client.js';
import { notify, notifyMany, TYPE } from '../services/notificationService.js';
import { getGradingWindowError } from '../utils/gradingWindow.js';
import { validateQuizPayload } from '../utils/quizValidation.js';
import { createQuizImportTemplate, parseQuizQuestionsWorkbook } from '../utils/quizExcel.js';

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

// ─── TEACHER ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/quizzes?offeringId=
export const getQuizzes = async (req, res) => {
  try {
    const { offeringId } = req.query;
    const where = {};

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    if (offeringId) {
      const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } });
      if (!offering) return res.status(403).json({ success: false, message: 'Not your offering' });
      where.offeringId = offeringId;
    } else {
      where.offering = { teacherId: teacher.id };
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
    const { offeringId } = req.body;
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

    const quiz = await prisma.quiz.create({
      data: {
        offeringId,
        title: validated.title,
        description: validated.description ?? null,
        durationMinutes: validated.durationMinutes ?? 30,
        startAt: validated.startAt,
        endAt: validated.endAt,
        status: validated.status || 'DRAFT',
        shuffleQuestions: validated.shuffleQuestions ?? false,
        maxViolations: validated.maxViolations ?? 3,
        allowReview: validated.allowReview ?? true,
        totalMarks,
        questions: { create: validated.questions },
      },
      include: { ...quizInclude, questions: { orderBy: { order: 'asc' } } },
    });

    // Notify enrolled students if published
    if (quiz.status === 'PUBLISHED') {
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

    const data = {
      title: validated.title,
      description: validated.description,
      durationMinutes: validated.durationMinutes,
      startAt: validated.startAt,
      endAt: validated.endAt,
      status: validated.status,
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

    if (check.quiz.status !== 'PUBLISHED' && quiz.status === 'PUBLISHED') {
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

// GET /api/quizzes/:id/attempts  — teacher views all attempts
export const getQuizAttempts = async (req, res) => {
  try {
    const check = await verifyTeacherOwnsQuiz(req.user.id, req.params.id);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: req.params.id },
      include: {
        student: { select: { id: true, studentId: true, user: { select: { name: true, email: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, count: attempts.length, data: attempts });
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
        quiz: { include: { offering: { select: { teacherId: true } }, questions: { orderBy: { order: 'asc' } } } },
        student: { select: { id: true, studentId: true, user: { select: { name: true, email: true } } } },
        answers: { include: { question: true } },
      },
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (attempt.quiz.offering.teacherId !== teacher?.id) {
      return res.status(403).json({ success: false, message: 'Not your quiz' });
    }

    res.json({ success: true, data: attempt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/quizzes/answers/:answerId/grade  — teacher grades a SHORT answer
export const gradeAnswer = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });

    const answer = await prisma.quizAnswer.findUnique({
      where: { id: req.params.answerId },
      include: {
        question: true,
        attempt: {
          include: {
            quiz: {
              include: {
                offering: {
                  select: {
                    teacherId: true,
                    term: { select: { code: true, isActive: true, endDate: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!answer) return res.status(404).json({ success: false, message: 'Answer not found' });
    if (answer.attempt.quiz.offering.teacherId !== teacher.id) {
      return res.status(403).json({ success: false, message: 'Not your quiz' });
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

    const { updated, total, manualPending } = await prisma.$transaction(async (tx) => {
      await tx.quizAnswer.update({
        where: { id: req.params.answerId },
        data: {
          marksAwarded: requestedMarks,
          isCorrect: requestedMarks === answer.question.marks,
          feedback: feedback || null,
        },
      });

      const allAnswers = await tx.quizAnswer.findMany({
        where: { attemptId: answer.attemptId },
        include: { question: { select: { type: true } } },
      });
      const autoScore = allAnswers
        .filter((entry) => entry.question.type !== 'SHORT')
        .reduce((sum, entry) => sum + (entry.marksAwarded || 0), 0);
      const manualScore = allAnswers
        .filter((entry) => entry.question.type === 'SHORT' && entry.isCorrect !== null)
        .reduce((sum, entry) => sum + (entry.marksAwarded || 0), 0);
      const pending = allAnswers.filter(
        (entry) => entry.question.type === 'SHORT' && entry.isCorrect === null
      ).length;
      const totalScore = autoScore + manualScore;
      const attemptUpdate = await tx.quizAttempt.update({
        where: { id: answer.attemptId },
        data: { autoGradedScore: autoScore, manualScore, totalScore },
      });

      return { updated: attemptUpdate, total: totalScore, manualPending: pending };
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
