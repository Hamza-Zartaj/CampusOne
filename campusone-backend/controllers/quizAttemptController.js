import prisma from '../prisma/client.js';
import {
  finalizeAttempt,
  getAttemptDeadline,
  isAttemptExpired,
  runQuizExpiryMaintenance,
} from '../services/quizLifecycleService.js';

// Strip correctAnswer from questions before sending to student
const sanitizeQuestion = (q) => ({
  id: q.id,
  type: q.type,
  questionText: q.questionText,
  options: q.options,
  marks: q.marks,
  order: q.order,
});

const normalizeAnswer = (question, answer) => {
  if (answer === null || answer === undefined || answer === '') return null;
  if (question.type === 'SHORT') {
    const value = String(answer).trim();
    if (value.length > 10_000) throw new Error('Short answer exceeds the 10,000 character limit');
    return value || null;
  }

  const value = Number(answer);
  const options = Array.isArray(question.options) ? question.options : [];
  if (!Number.isInteger(value) || value < 0 || value >= options.length) {
    throw new Error('Invalid answer option');
  }
  return value;
};

const shuffled = (values) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const isQuizOpen = (quiz) => {
  const now = new Date();
  return quiz.status === 'PUBLISHED' && now >= new Date(quiz.startAt) && now <= new Date(quiz.endAt);
};

const hasShortAnswerText = (answer) => (
  answer !== null
  && answer !== undefined
  && String(answer).trim() !== ''
);

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

    await runQuizExpiryMaintenance({ studentId: student.id });

    const quizzes = await prisma.quiz.findMany({
      where: { offeringId: { in: offeringIds }, status: { not: 'DRAFT' }, deliveryMode: 'ONLINE' },
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
    if (quiz.deliveryMode !== 'ONLINE') {
      return res.status(400).json({ success: false, message: 'This quiz is marked as offline/printed' });
    }

    // Verify enrollment
    const enrolled = await prisma.enrollment.findFirst({
      where: { studentId: student.id, offeringId: quiz.offeringId, status: { in: ['ENROLLED', 'COMPLETED'] } },
    });
    if (!enrolled) return res.status(403).json({ success: false, message: 'Not enrolled in this course' });

    let attempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId: quiz.id, studentId: student.id } },
    });

    if (attempt && attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, message: 'You have already submitted this quiz' });
    }

    if (attempt && isAttemptExpired({ ...attempt, quiz })) {
      const finalized = await finalizeAttempt(attempt.id, 'AUTO_SUBMITTED');
      return res.status(409).json({
        success: false,
        code: 'ATTEMPT_EXPIRED',
        message: 'This quiz attempt has expired and was submitted automatically',
        data: finalized,
      });
    }

    if (!isQuizOpen(quiz)) {
      return res.status(400).json({ success: false, message: 'Quiz is not currently open' });
    }

    if (!attempt) {
      const questionOrder = quiz.shuffleQuestions
        ? shuffled(quiz.questions.map((question) => question.id))
        : quiz.questions.map((question) => question.id);
      attempt = await prisma.quizAttempt.create({
        data: { quizId: quiz.id, studentId: student.id, status: 'IN_PROGRESS', questionOrder },
      });
    }

    let questionOrder = Array.isArray(attempt.questionOrder) ? attempt.questionOrder : [];
    if (questionOrder.length !== quiz.questions.length) {
      questionOrder = quiz.shuffleQuestions
        ? shuffled(quiz.questions.map((question) => question.id))
        : quiz.questions.map((question) => question.id);
      attempt = await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: { questionOrder },
      });
    }
    const orderIndex = new Map(questionOrder.map((questionId, index) => [questionId, index]));
    const questions = quiz.questions
      .map(sanitizeQuestion)
      .sort((left, right) => (orderIndex.get(left.id) ?? left.order) - (orderIndex.get(right.id) ?? right.order));

    // Load any saved answers
    const savedAnswers = await prisma.quizAnswer.findMany({
      where: { attemptId: attempt.id },
      select: { questionId: true, answer: true },
    });

    const deadline = getAttemptDeadline({ ...attempt, quiz });

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
    if (isAttemptExpired(attempt)) {
      const finalized = await finalizeAttempt(attempt.id, 'AUTO_SUBMITTED');
      return res.status(409).json({
        success: false,
        code: 'ATTEMPT_EXPIRED',
        message: 'The deadline passed; your saved work was submitted automatically',
        data: finalized,
      });
    }

    const { questionId, answer } = req.body;
    if (!questionId) return res.status(400).json({ success: false, message: 'questionId required' });

    const question = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.quizId !== attempt.quizId) {
      return res.status(400).json({ success: false, message: 'Invalid question' });
    }

    let normalizedAnswer;
    try {
      normalizedAnswer = normalizeAnswer(question, answer);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    await prisma.quizAnswer.upsert({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
      create: { attemptId: attempt.id, questionId, answer: normalizedAnswer },
      update: { answer: normalizedAnswer },
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
    if (isAttemptExpired(attempt)) {
      const finalized = await finalizeAttempt(attempt.id, 'AUTO_SUBMITTED');
      return res.json({
        success: true,
        data: { autoSubmitted: true, expired: true, totalScore: finalized.totalScore },
      });
    }

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

    const { answers } = req.body;
    if (answers !== undefined && !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'answers must be an array' });
    }

    const expired = isAttemptExpired(attempt);
    const finalized = await finalizeAttempt(
      attempt.id,
      expired ? 'AUTO_SUBMITTED' : 'SUBMITTED',
      {},
      expired ? [] : (answers || [])
    );
    res.json({ success: true, data: { ...finalized, expired } });
  } catch (err) {
    const status = err.message?.startsWith('Invalid question') || err.message?.startsWith('Invalid answer')
      || err.message?.includes('character limit') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
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

    const shortQuestionIds = new Set(
      attempt.quiz.questions.filter((question) => question.type === 'SHORT').map((question) => question.id)
    );
    const manualPending = attempt.answers.filter(
      (answer) => shortQuestionIds.has(answer.questionId) && answer.isCorrect === null && hasShortAnswerText(answer.answer)
    ).length;
    const allowReview = attempt.quiz.allowReview
      && (attempt.quiz.status === 'CLOSED' || Date.now() > new Date(attempt.quiz.endAt).getTime());
    const questionOrder = Array.isArray(attempt.questionOrder) ? attempt.questionOrder : [];
    const orderIndex = new Map(questionOrder.map((questionId, index) => [questionId, index]));
    const orderedQuestions = [...attempt.quiz.questions].sort(
      (left, right) => (orderIndex.get(left.id) ?? left.order) - (orderIndex.get(right.id) ?? right.order)
    );

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
        autoGradedScore: attempt.autoGradedScore,
        manualScore: attempt.manualScore,
        gradingStatus: manualPending > 0 ? 'PENDING_MANUAL' : 'FINAL',
        manualPending,
        allowReview,
        reviewAvailableAt: attempt.quiz.allowReview ? attempt.quiz.endAt : null,
        questions: allowReview ? orderedQuestions.map((q) => {
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
