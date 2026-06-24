import OpenAI from 'openai';
import { z } from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import { validateQuestions } from '../utils/quizValidation.js';

const MIXES = new Set(['BALANCED', 'MCQ_ONLY', 'MCQ_TRUE_FALSE', 'ALL_TYPES']);
const DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD', 'MIXED']);

const buildQuestionSchema = () => z.discriminatedUnion('type', [
  z.object({
    type: z.literal('MCQ'),
    questionText: z.string().min(1),
    options: z.array(z.string().min(1)).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    marks: z.number().positive().max(100),
  }),
  z.object({
    type: z.literal('TRUE_FALSE'),
    questionText: z.string().min(1),
    options: z.tuple([z.literal('True'), z.literal('False')]),
    correctAnswer: z.number().int().min(0).max(1),
    marks: z.number().positive().max(100),
  }),
  z.object({
    type: z.literal('SHORT'),
    questionText: z.string().min(1),
    options: z.array(z.string()).length(0),
    correctAnswer: z.string().min(1),
    marks: z.number().positive().max(100),
  }),
]);

export const buildAIQuizResponseSchema = (questionCount) => z.object({
  questions: z.array(buildQuestionSchema()).length(questionCount),
});

export const validateAIQuizRequest = (body) => {
  const prompt = String(body.prompt || '').trim();
  if (prompt.length < 10) throw new Error('Describe the quiz you want in at least 10 characters');

  const maxPromptChars = Math.min(
    Math.max(Number(process.env.AI_MAX_QUIZ_PROMPT_CHARS) || 10_000, 500),
    20_000
  );
  if (prompt.length > maxPromptChars) {
    throw new Error(`Prompt cannot exceed ${maxPromptChars.toLocaleString()} characters`);
  }

  const questionCount = Number(body.questionCount ?? 5);
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 30) {
    throw new Error('Question count must be between 1 and 30');
  }

  const mix = String(body.mix || 'BALANCED').toUpperCase();
  if (!MIXES.has(mix)) throw new Error('Invalid question mix');

  const difficulty = String(body.difficulty || 'MIXED').toUpperCase();
  if (!DIFFICULTIES.has(difficulty)) throw new Error('Invalid difficulty');

  const marksPerQuestion = Number(body.marksPerQuestion ?? 1);
  if (!Number.isFinite(marksPerQuestion) || marksPerQuestion <= 0 || marksPerQuestion > 100) {
    throw new Error('Marks per question must be between 0 and 100');
  }

  const existingQuestionTexts = Array.isArray(body.existingQuestionTexts)
    ? body.existingQuestionTexts
      .slice(0, 100)
      .map((text) => String(text).trim().slice(0, 500))
      .filter(Boolean)
    : [];

  return { prompt, questionCount, mix, difficulty, marksPerQuestion, existingQuestionTexts };
};

const mixInstruction = {
  BALANCED: 'Use mostly MCQs, with some true/false and short-answer questions where appropriate.',
  MCQ_ONLY: 'Generate only MCQ questions.',
  MCQ_TRUE_FALSE: 'Generate a useful mix of MCQ and TRUE_FALSE questions; do not generate SHORT questions.',
  ALL_TYPES: 'Use MCQ, TRUE_FALSE, and SHORT questions in a balanced way.',
};

export const normalizeGeneratedQuestions = (questions, marksPerQuestion) => validateQuestions(
  questions.map((question, index) => ({
    ...question,
    marks: marksPerQuestion ?? question.marks,
    order: index,
  }))
);

export const generateQuizQuestions = async ({
  courseCode,
  courseTitle,
  prompt,
  questionCount,
  mix,
  difficulty,
  marksPerQuestion,
  existingQuestionTexts,
}) => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('AI quiz generation is not configured yet. Add OPENAI_API_KEY to campusone-backend/.env and restart the backend.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }

  const model = process.env.OPENAI_QUIZ_MODEL || 'gpt-5.4-mini';
  const schema = buildAIQuizResponseSchema(questionCount);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const duplicateContext = existingQuestionTexts.length
    ? `Avoid duplicating these existing questions:\n${existingQuestionTexts.map((text) => `- ${text}`).join('\n')}`
    : 'There are no existing questions to avoid.';

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: 'system',
        content: [
          'You create accurate university quiz questions for a teacher.',
          'Return exactly the requested number of questions using the supplied schema.',
          'Use the course code and title only as context. Do not claim to have read course files.',
          'MCQs must have exactly four distinct, plausible options and one unambiguous answer.',
          'TRUE_FALSE options must be exactly ["True", "False"].',
          'SHORT correctAnswer must be a concise expected answer suitable as a grading reference.',
          'Avoid trick questions, vague wording, repeated questions, and "all/none of the above".',
          'Do not include markdown, numbering prefixes, or answer hints in questionText.',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          `Course: ${courseCode} — ${courseTitle}`,
          `Teacher request: ${prompt}`,
          `Question count: ${questionCount}`,
          `Question mix: ${mixInstruction[mix]}`,
          `Difficulty: ${difficulty === 'MIXED' ? 'Use a reasonable mix of easy, medium, and hard questions.' : difficulty}`,
          `Use ${marksPerQuestion} mark(s) for every question.`,
          duplicateContext,
        ].join('\n\n'),
      },
    ],
    text: {
      format: zodTextFormat(schema, 'campusone_quiz_questions'),
    },
    max_output_tokens: Math.min(16_000, 800 + questionCount * 500),
  });

  if (!response.output_parsed?.questions) {
    const error = new Error('The AI did not return usable quiz questions. Please adjust the prompt and try again.');
    error.code = 'AI_INVALID_OUTPUT';
    throw error;
  }

  return {
    questions: normalizeGeneratedQuestions(response.output_parsed.questions, marksPerQuestion),
    model,
    usage: response.usage ? {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.total_tokens,
    } : null,
  };
};
