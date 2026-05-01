import prisma from '../prisma/client.js';
import xlsx from 'xlsx';

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
    } else if (offeringId) {
      where.offeringId = offeringId;
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

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (quiz.offering && quiz.offering.id) {
        const owns = await prisma.courseOffering.findFirst({ where: { id: quiz.offering.id, teacherId: teacher?.id } });
        if (!owns) return res.status(403).json({ success: false, message: 'Not your quiz' });
      }
    }

    res.json({ success: true, data: quiz });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/quizzes
export const createQuiz = async (req, res) => {
  try {
    const { offeringId, title, description, durationMinutes, startAt, endAt, status, shuffleQuestions, maxViolations, allowReview, questions } = req.body;
    if (!offeringId || !title || !startAt || !endAt) {
      return res.status(400).json({ success: false, message: 'offeringId, title, startAt, endAt are required' });
    }

    const check = await verifyTeacherOwnsOffering(req.user.id, offeringId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const totalMarks = (questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0);

    const quiz = await prisma.quiz.create({
      data: {
        offeringId,
        title,
        description: description || null,
        durationMinutes: durationMinutes ? +durationMinutes : 30,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        status: status || 'PUBLISHED',
        shuffleQuestions: !!shuffleQuestions,
        maxViolations: maxViolations !== undefined ? +maxViolations : 3,
        allowReview: allowReview !== undefined ? !!allowReview : true,
        totalMarks,
        questions: questions && questions.length > 0 ? {
          create: questions.map((q, idx) => ({
            type: q.type,
            questionText: q.questionText,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            marks: Number(q.marks) || 1,
            order: q.order !== undefined ? q.order : idx,
          })),
        } : undefined,
      },
      include: { ...quizInclude, questions: { orderBy: { order: 'asc' } } },
    });

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

    const { title, description, durationMinutes, startAt, endAt, status, shuffleQuestions, maxViolations, allowReview, questions } = req.body;

    // Block question edits after any attempt has started
    if (questions) {
      const attemptCount = await prisma.quizAttempt.count({ where: { quizId: req.params.id } });
      if (attemptCount > 0) {
        return res.status(400).json({ success: false, message: 'Cannot modify questions after students have attempted' });
      }
    }

    const totalMarks = questions ? questions.reduce((s, q) => s + (Number(q.marks) || 0), 0) : undefined;

    const data = {
      title: title ?? undefined,
      description: description !== undefined ? description : undefined,
      durationMinutes: durationMinutes !== undefined ? +durationMinutes : undefined,
      startAt: startAt ? new Date(startAt) : undefined,
      endAt: endAt ? new Date(endAt) : undefined,
      status: status ?? undefined,
      shuffleQuestions: shuffleQuestions !== undefined ? !!shuffleQuestions : undefined,
      maxViolations: maxViolations !== undefined ? +maxViolations : undefined,
      allowReview: allowReview !== undefined ? !!allowReview : undefined,
      totalMarks,
    };

    if (questions) {
      await prisma.quizQuestion.deleteMany({ where: { quizId: req.params.id } });
      data.questions = {
        create: questions.map((q, idx) => ({
          type: q.type,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          marks: Number(q.marks) || 1,
          order: q.order !== undefined ? q.order : idx,
        })),
      };
    }

    const quiz = await prisma.quiz.update({
      where: { id: req.params.id },
      data,
      include: { ...quizInclude, questions: { orderBy: { order: 'asc' } } },
    });

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
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const questions = rows.map((row, idx) => {
      const type = String(row.type || row.Type || 'MCQ').toUpperCase();
      const questionText = row.questionText || row.question || row.Question || '';
      const options = [row.option1, row.option2, row.option3, row.option4]
        .filter((o) => o !== undefined && o !== null && o !== '');
      const correctRaw = row.correctAnswer ?? row.correct ?? row.Correct;
      const marks = Number(row.marks ?? row.Marks ?? 1);

      let correctAnswer;
      if (type === 'MCQ') {
        // accept 1-based index, 0-based, or letter (a/b/c/d)
        if (typeof correctRaw === 'string' && /^[a-dA-D]$/.test(correctRaw.trim())) {
          correctAnswer = correctRaw.trim().toLowerCase().charCodeAt(0) - 97;
        } else {
          const n = Number(correctRaw);
          correctAnswer = n >= 1 && n <= 4 ? n - 1 : n;
        }
      } else if (type === 'TRUE_FALSE' || type === 'TF') {
        const v = String(correctRaw).toLowerCase().trim();
        correctAnswer = (v === 'true' || v === '1' || v === 't') ? 0 : 1;
      } else {
        correctAnswer = String(correctRaw ?? '').trim();
      }

      return {
        type: type === 'TF' ? 'TRUE_FALSE' : type,
        questionText: String(questionText),
        options: type === 'TRUE_FALSE' || type === 'TF' ? ['True', 'False'] : options,
        correctAnswer,
        marks: isNaN(marks) ? 1 : marks,
        order: idx,
      };
    }).filter((q) => q.questionText);

    res.json({ success: true, count: questions.length, data: questions });
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

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (attempt.quiz.offering.teacherId !== teacher?.id) {
        return res.status(403).json({ success: false, message: 'Not your quiz' });
      }
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
        attempt: { include: { quiz: { include: { offering: { select: { teacherId: true } } } } } },
      },
    });
    if (!answer) return res.status(404).json({ success: false, message: 'Answer not found' });
    if (answer.attempt.quiz.offering.teacherId !== teacher.id) {
      return res.status(403).json({ success: false, message: 'Not your quiz' });
    }

    const { marksAwarded, feedback } = req.body;
    const marks = Math.max(0, Math.min(answer.question.marks, +marksAwarded || 0));

    await prisma.quizAnswer.update({
      where: { id: req.params.answerId },
      data: {
        marksAwarded: marks,
        isCorrect: marks > 0,
        feedback: feedback ?? null,
      },
    });

    // Recompute attempt totals
    const allAnswers = await prisma.quizAnswer.findMany({ where: { attemptId: answer.attemptId } });
    const total = allAnswers.reduce((s, a) => s + (a.marksAwarded || 0), 0);
    const updated = await prisma.quizAttempt.update({
      where: { id: answer.attemptId },
      data: { totalScore: total, manualScore: allAnswers.filter((a) => a.id === answer.id ? true : a.marksAwarded > 0).reduce((s, a) => s + a.marksAwarded, 0) },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
