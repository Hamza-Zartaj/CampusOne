const QUIZ_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'CLOSED']);
const QUESTION_TYPES = new Set(['MCQ', 'TRUE_FALSE', 'SHORT']);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const parseQuizDate = (value, fieldName) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date and time`);
  }
  return date;
};

export const validateQuestions = (questions, { requireQuestions = true } = {}) => {
  if (!Array.isArray(questions)) {
    throw new Error('questions must be an array');
  }
  if (requireQuestions && questions.length === 0) {
    throw new Error('At least one question is required');
  }

  return questions.map((question, index) => {
    const type = String(question.type || '').toUpperCase();
    const label = `Question ${index + 1}`;
    if (!QUESTION_TYPES.has(type)) throw new Error(`${label} has an invalid type`);
    if (!isNonEmptyString(question.questionText)) throw new Error(`${label} text is required`);

    const marks = Number(question.marks);
    if (!Number.isFinite(marks) || marks <= 0 || marks > 1000) {
      throw new Error(`${label} marks must be greater than 0`);
    }

    let options = Array.isArray(question.options)
      ? question.options.map((option) => String(option).trim())
      : [];
    let correctAnswer = question.correctAnswer;

    if (type === 'MCQ') {
      if (options.length < 2 || options.length > 10 || options.some((option) => !option)) {
        throw new Error(`${label} must have between 2 and 10 non-empty options`);
      }
      if (new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length) {
        throw new Error(`${label} options must be distinct`);
      }
      correctAnswer = Number(correctAnswer);
      if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
        throw new Error(`${label} has an invalid correct-answer index`);
      }
    } else if (type === 'TRUE_FALSE') {
      options = ['True', 'False'];
      correctAnswer = Number(correctAnswer);
      if (correctAnswer !== 0 && correctAnswer !== 1) {
        throw new Error(`${label} must use True or False as its correct answer`);
      }
    } else {
      options = [];
      correctAnswer = String(correctAnswer ?? '').trim();
      if (!correctAnswer) throw new Error(`${label} requires an expected answer`);
    }

    return {
      type,
      questionText: question.questionText.trim(),
      options,
      correctAnswer,
      marks,
      order: index,
    };
  });
};

export const validateQuizPayload = (payload, { partial = false } = {}) => {
  if (!partial || payload.title !== undefined) {
    if (!isNonEmptyString(payload.title)) throw new Error('Quiz title is required');
  }

  const status = payload.status === undefined
    ? undefined
    : String(payload.status).toUpperCase();
  if (status && !QUIZ_STATUSES.has(status)) throw new Error('Invalid quiz status');

  const durationMinutes = payload.durationMinutes === undefined
    ? undefined
    : Number(payload.durationMinutes);
  if (durationMinutes !== undefined && (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440)) {
    throw new Error('Duration must be between 1 and 1440 minutes');
  }

  const maxViolations = payload.maxViolations === undefined
    ? undefined
    : Number(payload.maxViolations);
  if (maxViolations !== undefined && (!Number.isInteger(maxViolations) || maxViolations < 1 || maxViolations > 100)) {
    throw new Error('Maximum violations must be between 1 and 100');
  }

  const startAt = payload.startAt === undefined ? undefined : parseQuizDate(payload.startAt, 'startAt');
  const endAt = payload.endAt === undefined ? undefined : parseQuizDate(payload.endAt, 'endAt');
  if (startAt && endAt && endAt <= startAt) throw new Error('endAt must be after startAt');

  const questions = payload.questions === undefined
    ? undefined
    : validateQuestions(payload.questions);

  return {
    title: payload.title === undefined ? undefined : payload.title.trim(),
    description: payload.description === undefined
      ? undefined
      : (isNonEmptyString(payload.description) ? payload.description.trim() : null),
    durationMinutes,
    startAt,
    endAt,
    status,
    shuffleQuestions: payload.shuffleQuestions === undefined ? undefined : Boolean(payload.shuffleQuestions),
    maxViolations,
    allowReview: payload.allowReview === undefined ? undefined : Boolean(payload.allowReview),
    questions,
  };
};
