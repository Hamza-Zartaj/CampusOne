const KIND_LABEL = {
  ASSIGNMENT: 'Assignment',
  QUIZ: 'Quiz',
};

export const parseComponentIndex = (value) => {
  const index = Number(value);
  return Number.isInteger(index) && index > 0 ? index : null;
};

export const getCourseworkComponent = async (client, offeringId, kind) => {
  const offering = await client.courseOffering.findUnique({
    where: { id: offeringId },
    select: {
      course: {
        select: {
          gradeComponents: {
            where: { kind },
            select: {
              kind: true,
              label: true,
              count: true,
              totalPerInstance: true,
            },
          },
        },
      },
    },
  });
  return offering?.course?.gradeComponents?.[0] || null;
};

export const validateCourseworkSlot = async ({
  client,
  offeringId,
  kind,
  componentIndex,
  model,
  excludeId,
}) => {
  const label = KIND_LABEL[kind] || kind;
  const index = parseComponentIndex(componentIndex);
  if (!index) {
    return { error: `${label} number is required` };
  }

  const component = await getCourseworkComponent(client, offeringId, kind);
  if (!component) {
    return { error: `This course has no ${label.toLowerCase()} grade component configured` };
  }
  if (index > component.count) {
    return { error: `${label} number must be between 1 and ${component.count}` };
  }

  const existingCount = await client[model].count({
    where: {
      offeringId,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (existingCount >= component.count) {
    return { error: `${label} limit reached for this course (${component.count})` };
  }

  const duplicate = await client[model].findFirst({
    where: {
      offeringId,
      componentIndex: index,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, title: true },
  });
  if (duplicate) {
    return { error: `${label} ${index} is already used by "${duplicate.title}"` };
  }

  return { component, index };
};

export const syncCourseworkMark = async ({
  client,
  offeringId,
  studentId,
  kind,
  componentIndex,
  title,
  date,
  totalMarks,
  obtainedMarks,
}) => {
  const index = parseComponentIndex(componentIndex);
  if (!index) return null;

  const enrollment = await client.enrollment.findUnique({
    where: { studentId_offeringId: { studentId, offeringId } },
    select: { id: true },
  });
  if (!enrollment) return null;

  return client.markComponent.upsert({
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
      date: date ? new Date(date) : null,
      totalMarks,
      obtainedMarks,
    },
    update: {
      title,
      date: date ? new Date(date) : null,
      totalMarks,
      obtainedMarks,
    },
  });
};

const scaleScore = (score, fromTotal, toTotal) => {
  if (!Number.isFinite(score) || !Number.isFinite(fromTotal) || fromTotal <= 0) return null;
  const scaled = (score / fromTotal) * toTotal;
  return Math.round(scaled * 100) / 100;
};

export const syncQuizAttemptMark = async ({ client, attempt, totalScore, manualPending }) => {
  if (manualPending > 0) return null;
  if (!attempt?.quiz) return null;

  const component = await getCourseworkComponent(client, attempt.quiz.offeringId, 'QUIZ');
  if (!component) return null;

  const obtainedMarks = scaleScore(totalScore, attempt.quiz.totalMarks, component.totalPerInstance);
  if (obtainedMarks === null) return null;

  return syncCourseworkMark({
    client,
    offeringId: attempt.quiz.offeringId,
    studentId: attempt.studentId,
    kind: 'QUIZ',
    componentIndex: attempt.quiz.componentIndex,
    title: attempt.quiz.title,
    date: attempt.quiz.endAt,
    totalMarks: component.totalPerInstance,
    obtainedMarks,
  });
};
