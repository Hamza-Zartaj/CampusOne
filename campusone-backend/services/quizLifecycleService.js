import prisma from '../prisma/client.js';
import { getQuizMarkTotal, syncCourseworkMark, syncQuizAttemptMark } from '../utils/courseworkMarks.js';

const hasShortAnswerText = (answer) => (
  answer !== null
  && answer !== undefined
  && String(answer).trim() !== ''
);

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

const autoGrade = (question, submittedAnswer) => {
  if (question.type === 'SHORT') return { isCorrect: null, marksAwarded: 0 };
  if (submittedAnswer === null || submittedAnswer === undefined) return { isCorrect: false, marksAwarded: 0 };
  const isCorrect = Number(submittedAnswer) === Number(question.correctAnswer);
  return { isCorrect, marksAwarded: isCorrect ? question.marks : 0 };
};

export const getAttemptDeadline = (attempt) => new Date(Math.min(
  new Date(attempt.startedAt).getTime() + attempt.quiz.durationMinutes * 60_000,
  new Date(attempt.quiz.endAt).getTime(),
));

export const isAttemptExpired = (attempt) => Date.now() >= getAttemptDeadline(attempt).getTime();

export const finalizeAttempt = async (attemptId, status, extra = {}, finalAnswers = []) => {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: true } }, answers: true },
    });
    if (!attempt) throw new Error('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS') return attempt;

    const claimed = await tx.quizAttempt.updateMany({
      where: { id: attemptId, status: 'IN_PROGRESS' },
      data: { status, submittedAt: new Date() },
    });
    if (claimed.count === 0) {
      return tx.quizAttempt.findUnique({ where: { id: attemptId } });
    }

    const questionsById = new Map(attempt.quiz.questions.map((question) => [question.id, question]));
    const answersByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));

    for (const submitted of finalAnswers) {
      if (!submitted?.questionId || !questionsById.has(submitted.questionId)) {
        throw new Error('Invalid question in final answers');
      }
      const question = questionsById.get(submitted.questionId);
      const answer = normalizeAnswer(question, submitted.answer);
      const saved = await tx.quizAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: question.id } },
        create: { attemptId, questionId: question.id, answer },
        update: { answer },
      });
      answersByQuestion.set(question.id, saved);
    }

    let autoScore = 0;
    let manualPending = 0;
    for (const question of attempt.quiz.questions) {
      const savedAnswer = answersByQuestion.get(question.id);
      if (question.type === 'SHORT') {
        if (hasShortAnswerText(savedAnswer?.answer)) {
          manualPending += 1;
          await tx.quizAnswer.update({
            where: { id: savedAnswer.id },
            data: { isCorrect: null, marksAwarded: 0 },
          });
          continue;
        }

        if (!savedAnswer) {
          const created = await tx.quizAnswer.create({
            data: {
              attemptId,
              questionId: question.id,
              answer: null,
              isCorrect: false,
              marksAwarded: 0,
            },
          });
          answersByQuestion.set(question.id, created);
        } else {
          await tx.quizAnswer.update({
            where: { id: savedAnswer.id },
            data: { isCorrect: false, marksAwarded: 0 },
          });
        }
        continue;
      }

      const grade = autoGrade(question, savedAnswer?.answer);
      autoScore += grade.marksAwarded;
      if (savedAnswer) {
        await tx.quizAnswer.update({
          where: { id: savedAnswer.id },
          data: grade,
        });
      } else {
        await tx.quizAnswer.create({
          data: {
            attemptId,
            questionId: question.id,
            answer: null,
            ...grade,
          },
        });
      }
    }

    const updated = await tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: new Date(),
        autoGradedScore: autoScore,
        manualScore: 0,
        totalScore: autoScore,
        ...extra,
      },
    });
    await syncQuizAttemptMark({ client: tx, attempt, totalScore: autoScore, manualPending });

    return {
      ...updated,
      gradingStatus: manualPending > 0 ? 'PENDING_MANUAL' : 'FINAL',
      manualPending,
    };
  });
};

export const finalizeExpiredQuizAttempts = async ({ studentId, offeringId } = {}) => {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      status: 'IN_PROGRESS',
      ...(studentId ? { studentId } : {}),
      ...(offeringId ? { quiz: { offeringId } } : {}),
    },
    include: { quiz: true },
  });

  let finalized = 0;
  for (const attempt of attempts) {
    if (!isAttemptExpired(attempt)) continue;
    await finalizeAttempt(attempt.id, 'AUTO_SUBMITTED');
    finalized += 1;
  }
  return finalized;
};

export const normalizeLegacyQuizScale = async ({ studentId, offeringId, activeTermOnly = false } = {}) => {
  const offerings = await prisma.courseOffering.findMany({
    where: {
      ...(offeringId ? { id: offeringId } : {}),
      ...(activeTermOnly ? { term: { isActive: true } } : {}),
      ...(studentId ? { enrollments: { some: { studentId } } } : {}),
    },
    select: {
      id: true,
      course: {
        select: {
          gradeComponents: {
            where: {
              kind: 'QUIZ',
              count: 4,
              totalPerInstance: 20,
              weightPercent: 10,
              aggregation: 'AVERAGE',
            },
            select: { id: true },
          },
        },
      },
    },
  });

  const componentIds = [...new Set(
    offerings.flatMap((offering) => offering.course.gradeComponents.map((component) => component.id)),
  )];
  if (componentIds.length === 0) return { components: 0, markRows: 0 };

  const [componentResult, ...markResults] = await prisma.$transaction([
    prisma.courseGradeComponent.updateMany({
      where: { id: { in: componentIds } },
      data: { totalPerInstance: 10 },
    }),
    ...offerings.map((offering) => prisma.markComponent.updateMany({
      where: {
        kind: 'QUIZ',
        totalMarks: 20,
        enrollment: { offeringId: offering.id },
      },
      data: { totalMarks: 10 },
    })),
  ]);

  return {
    components: componentResult.count,
    markRows: markResults.reduce((sum, result) => sum + result.count, 0),
  };
};

export const syncMissedQuizMarks = async ({ studentId, offeringId, activeTermOnly = false } = {}) => {
  const now = new Date();
  const quizzes = await prisma.quiz.findMany({
    where: {
      deliveryMode: 'ONLINE',
      status: { in: ['PUBLISHED', 'CLOSED'] },
      componentIndex: { not: null },
      endAt: { lte: now },
      ...(offeringId ? { offeringId } : {}),
      ...(activeTermOnly ? { offering: { term: { isActive: true } } } : {}),
    },
    include: {
      attempts: { select: { studentId: true } },
      offering: {
        include: {
          course: {
            select: {
              gradeComponents: {
                where: { kind: 'QUIZ' },
                select: {
                  kind: true,
                  count: true,
                  totalPerInstance: true,
                  weightPercent: true,
                  aggregation: true,
                },
              },
            },
          },
          enrollments: {
            where: {
              status: { in: ['ENROLLED', 'COMPLETED', 'INCOMPLETE'] },
              ...(studentId ? { studentId } : {}),
            },
            select: { id: true, studentId: true },
          },
        },
      },
    },
  });

  let synced = 0;
  for (const quiz of quizzes) {
    const component = quiz.offering.course.gradeComponents[0];
    if (!component) continue;
    const totalPerInstance = getQuizMarkTotal(component);
    const attemptedStudentIds = new Set(quiz.attempts.map((attempt) => attempt.studentId));

    for (const enrollment of quiz.offering.enrollments) {
      if (attemptedStudentIds.has(enrollment.studentId)) continue;

      const existing = await prisma.markComponent.findUnique({
        where: {
          enrollmentId_kind_index: {
            enrollmentId: enrollment.id,
            kind: 'QUIZ',
            index: quiz.componentIndex,
          },
        },
      });
      if (existing?.obtainedMarks !== null && existing?.obtainedMarks !== undefined) continue;

      if (existing) {
        await prisma.markComponent.update({
          where: { id: existing.id },
          data: {
            title: quiz.title,
            date: quiz.endAt,
            totalMarks: totalPerInstance,
            obtainedMarks: 0,
          },
        });
      } else {
        await syncCourseworkMark({
          client: prisma,
          offeringId: quiz.offeringId,
          studentId: enrollment.studentId,
          kind: 'QUIZ',
          componentIndex: quiz.componentIndex,
          title: quiz.title,
          date: quiz.endAt,
          totalMarks: totalPerInstance,
          obtainedMarks: 0,
        });
      }
      synced += 1;
    }
  }
  return synced;
};

export const syncFinalizedQuizAttemptMarks = async ({ studentId, offeringId, activeTermOnly = false } = {}) => {
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
      totalScore: { not: null },
      ...(studentId ? { studentId } : {}),
      quiz: {
        deliveryMode: 'ONLINE',
        componentIndex: { not: null },
        ...(offeringId ? { offeringId } : {}),
        ...(activeTermOnly ? { offering: { term: { isActive: true } } } : {}),
      },
    },
    include: {
      answers: { include: { question: { select: { type: true } } } },
      quiz: {
        select: {
          id: true,
          title: true,
          offeringId: true,
          componentIndex: true,
          totalMarks: true,
          endAt: true,
        },
      },
    },
  });

  let synced = 0;
  for (const attempt of attempts) {
    const manualPending = attempt.answers.filter(
      (answer) => answer.question.type === 'SHORT' && answer.isCorrect === null && hasShortAnswerText(answer.answer),
    ).length;
    const saved = await syncQuizAttemptMark({
      client: prisma,
      attempt,
      totalScore: attempt.totalScore,
      manualPending,
    });
    if (saved) synced += 1;
  }
  return synced;
};

export const runQuizExpiryMaintenance = async (options = {}) => {
  const normalized = await normalizeLegacyQuizScale(options);
  const [finalized, missed, syncedAttempts] = await Promise.all([
    finalizeExpiredQuizAttempts(options),
    syncMissedQuizMarks(options),
    syncFinalizedQuizAttemptMarks(options),
  ]);
  return { finalized, missed, syncedAttempts, normalized };
};
