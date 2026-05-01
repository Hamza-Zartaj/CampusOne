import prisma from '../prisma/client.js';

// Strip correctAnswer from questions before sending to student
const sanitizeQuestion = (q) => ({
  id: q.id,
  type: q.type,
  questionText: q.questionText,
  options: q.options,
  marks: q.marks,
  order: q.order,
});

// Auto-grade an answer for MCQ / TRUE_FALSE
const autoGrade = (question, submittedAnswer) => {
  if (question.type === 'SHORT') return { isCorrect: null, marksAwarded: 0 };
  if (submittedAnswer === null || submittedAnswer === undefined) return { isCorrect: false, marksAwarded: 0 };
  const correct = question.correctAnswer;
  const isCorrect = Number(submittedAnswer) === Number(correct);
  return { isCorrect, marksAwarded: isCorrect ? question.marks : 0 };
};

const isQuizOpen = (quiz) => {
  const now = new Date();
  return quiz.status === 'PUBLISHED' && now >= new Date(quiz.startAt) && now <= new Date(quiz.endAt);
};

const isAttemptExpired = (attempt) => {
  const deadline = new Date(attempt.startedAt).getTime() + attempt.quiz.durationMinutes * 60_000;
  const quizEnd = new Date(attempt.quiz.endAt).getTime();
  return Date.now() >= Math.min(deadline, quizEnd);
};

// ─── STUDENT ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/quizzes/my  — list quizzes for student's enrolled offerings
export const getMyQuizzes = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: { in: ['ENROLLED', 'COMPLETED'] } },
      select: { offeringId: true },
    });
    const offeringIds = enrollments.map((e) => e.offeringId);

    const quizzes = await prisma.quiz.findMany({
      where: { offeringId: { in: offeringIds }, status: { not: 'DRAFT' } },
      include: {
        offering: {
          select: {
            id: true, section: true,
            course: { select: { id: true, code: true, title: true } },
          },
        },
        _count: { select: { questions: true } },
        attempts: {
          where: { studentId: student.id },
          select: { id: true, status: true, startedAt: true, submittedAt: true, totalScore: true, violations: true },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    res.json({ success: true, count: quizzes.length, data: quizzes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/quizzes/:id/start  — start or resume an attempt
export const startAttempt = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // Verify enrollment
    const enrolled = await prisma.enrollment.findFirst({
      where: { studentId: student.id, offeringId: quiz.offeringId, status: { in: ['ENROLLED', 'COMPLETED'] } },
    });
    if (!enrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });

    if (!isQuizOpen(quiz)) {
      return res.status(400).json({ success: false, message: 'Quiz is not currently open' });
    }

    let attempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId: quiz.id, studentId: student.id } },
    });

    if (attempt && attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'You have already submitted this quiz' });
    }

    if (!attempt) {
      attempt = await prisma.quizAttempt.create({
        data: { quizId: quiz.id, studentId: student.id, status: 'IN_PROGRESS' },
      });
    }

    let questions = quiz.questions.map(sanitizeQuestion);
    if (quiz.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Load any saved answers
    const savedAnswers = await prisma.quizAnswer.findMany({
      where: { attemptId: attempt.id },
      select: { questionId: true, answer: true },
    });

    const deadline = new Date(
      Math.min(
        new Date(attempt.startedAt).getTime() + quiz.durationMinutes * 60_000,
        new Date(quiz.endAt).getTime()
      )
    );

    res.json({
      success: true,
      data: {
        attemptId: attempt.id,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          totalMarks: quiz.totalMarks,
          durationMinutes: quiz.durationMinutes,
          maxViolations: quiz.maxViolations,
          startAt: quiz.startAt,
          endAt: quiz.endAt,
        },
        questions,
        savedAnswers,
        startedAt: attempt.startedAt,
        deadline,
        violations: attempt.violations,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/quizzes/attempts/:attemptId/answer  — save a single answer (autosave)
export const saveAnswer = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: { quiz: true },
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    if (attempt.studentId !== student.id) return res.status(403).json({ success: false, message: 'Not your attempt' });
    if (attempt.status !== 'IN_PROGRESS') return res.status(400).json({ success: false, message: 'Attempt already submitted' });

    const { questionId, answer } = req.body;
    if (!questionId) return res.status(400).json({ success: false, message: 'questionId required' });

    const question = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.quizId !== attempt.quizId) {
      return res.status(400).json({ success: false, message: 'Invalid question' });
    }

    await prisma.quizAnswer.upsert({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
      create: { attemptId: attempt.id, questionId, answer },
      update: { answer },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/quizzes/attempts/:attemptId/violation  — log anti-cheat violation
export const logViolation = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: { quiz: true },
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    if (attempt.studentId !== student.id) return res.status(403).json({ success: false, message: 'Not your attempt' });
    if (attempt.status !== 'IN_PROGRESS') return res.json({ success: true, data: { autoSubmitted: false } });

    const { type } = req.body;
    const log = Array.isArray(attempt.violationLog) ? attempt.violationLog : [];
    log.push({ type: type || 'UNKNOWN', at: new Date().toISOString() });

    const newCount = attempt.violations + 1;
    const shouldAutoSubmit = newCount >= attempt.quiz.maxViolations;

    if (shouldAutoSubmit) {
      const finalized = await finalizeAttempt(attempt.id, 'AUTO_SUBMITTED', { violations: newCount, violationLog: log });
      return res.json({ success: true, data: { autoSubmitted: true, totalScore: finalized.totalScore } });
    }

    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { violations: newCount, violationLog: log },
    });

    res.json({ success: true, data: { autoSubmitted: false, violations: newCount, max: attempt.quiz.maxViolations } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/quizzes/attempts/:attemptId/submit
export const submitAttempt = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: { quiz: true },
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    if (attempt.studentId !== student.id) return res.status(403).json({ success: false, message: 'Not your attempt' });
    if (attempt.status !== 'IN_PROGRESS') return res.status(400).json({ success: false, message: 'Already submitted' });

    // Optionally accept final answers payload
    const { answers } = req.body;
    if (Array.isArray(answers)) {
      for (const a of answers) {
        if (!a.questionId) continue;
        await prisma.quizAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: a.questionId } },
          create: { attemptId: attempt.id, questionId: a.questionId, answer: a.answer },
          update: { answer: a.answer },
        });
      }
    }

    const finalized = await finalizeAttempt(attempt.id, 'SUBMITTED');
    res.json({ success: true, data: finalized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Internal: grade all auto-gradable answers and compute totals
const finalizeAttempt = async (attemptId, status, extra = {}) => {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { questions: true } }, answers: true },
  });

  let autoScore = 0;
  let manualPending = 0;
  let needsManualGrading = false;

  for (const question of attempt.quiz.questions) {
    const ans = attempt.answers.find((a) => a.questionId === question.id);
    if (question.type === 'SHORT') {
      needsManualGrading = true;
      continue;
    }
    const submitted = ans?.answer;
    const { isCorrect, marksAwarded } = autoGrade(question, submitted);
    autoScore += marksAwarded;

    if (ans) {
      await prisma.quizAnswer.update({
        where: { id: ans.id },
        data: { isCorrect, marksAwarded },
      });
    } else {
      await prisma.quizAnswer.create({
        data: { attemptId: attempt.id, questionId: question.id, answer: null, isCorrect: false, marksAwarded: 0 },
      });
    }
  }

  const totalScore = needsManualGrading ? autoScore : autoScore;

  const updated = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      status,
      submittedAt: new Date(),
      autoGradedScore: autoScore,
      manualScore: 0,
      totalScore,
      ...extra,
    },
  });

  return updated;
};

// GET /api/quizzes/attempts/:attemptId/result  — student views own result
export const getMyAttemptResult = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: {
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
        answers: true,
      },
    });
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
    if (attempt.studentId !== student.id) return res.status(403).json({ success: false, message: 'Not your attempt' });
    if (attempt.status === 'IN_PROGRESS') return res.status(400).json({ success: false, message: 'Quiz still in progress' });

    const allowReview = attempt.quiz.allowReview;

    res.json({
      success: true,
      data: {
        attemptId: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        totalScore: attempt.totalScore,
        totalMarks: attempt.quiz.totalMarks,
        violations: attempt.violations,
        allowReview,
        questions: allowReview ? attempt.quiz.questions.map((q) => {
          const ans = attempt.answers.find((a) => a.questionId === q.id);
          return {
            ...sanitizeQuestion(q),
            correctAnswer: q.correctAnswer,
            yourAnswer: ans?.answer,
            isCorrect: ans?.isCorrect,
            marksAwarded: ans?.marksAwarded,
            feedback: ans?.feedback,
          };
        }) : undefined,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Re-export internal helper for external auto-submit on stale attempts (optional cron usage)
export { finalizeAttempt, isAttemptExpired };
