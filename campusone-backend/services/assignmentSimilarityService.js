import crypto from 'node:crypto';
import path from 'node:path';
import OpenAI from 'openai';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const SHINGLE_SIZE = 5;
const LEXICAL_THRESHOLD = 0.35;
const MIN_LEXICAL_TOKENS = 30;
const MAX_AI_REVIEWS = 10;
const MAX_AI_REVIEW_CHARS = 1800;
const ASSIGNMENT_COMMON_TOKEN_RATIO = 0.4;
const MIN_ASSIGNMENT_COMMON_SUBMISSIONS = 3;
const GLOBAL_COMMON_TOKENS = new Set([
  'this', 'that', 'with', 'from', 'have', 'will', 'your', 'their', 'there', 'then',
  'than', 'when', 'where', 'what', 'which', 'also', 'into', 'each', 'only', 'more',
  'some', 'such', 'same', 'should', 'would', 'could', 'about', 'after', 'before',
  'student', 'students', 'assignment', 'question', 'answer', 'result', 'results',
]);

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const normalizeSimilarityText = (value) => String(value || '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/\r\n?/g, '\n')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenize = (text) => normalizeSimilarityText(text).split(' ').filter(Boolean);

export const createShingles = (text, size = SHINGLE_SIZE) => {
  const tokens = tokenize(text);
  const shingles = new Set();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    shingles.add(tokens.slice(index, index + size).join(' '));
  }
  return shingles;
};

export const jaccardSimilarity = (left, right) => {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
};

const sharedPassages = (leftShingles, rightShingles, limit = 5) => {
  const matches = [];
  for (const passage of leftShingles) {
    if (rightShingles.has(passage)) matches.push(passage);
    if (matches.length >= limit) break;
  }
  return matches;
};

const extensionFromUrl = (url) => {
  try {
    return path.extname(decodeURIComponent(new URL(url).pathname)).toLocaleLowerCase();
  } catch {
    return '';
  }
};

const downloadSubmissionFile = async (url) => {
  const fileUrl = new URL(url);
  const storageOrigin = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : null;
  if (!storageOrigin || fileUrl.origin !== storageOrigin) {
    throw new Error('Submission file is outside the configured CampusOne storage origin');
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`File download failed with HTTP ${response.status}`);
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_FILE_BYTES) throw new Error('File exceeds the 20 MB analysis limit');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_FILE_BYTES) throw new Error('File exceeds the 20 MB analysis limit');
  return { buffer, mimeType: response.headers.get('content-type') || '' };
};

export const extractTextFromBuffer = async ({ buffer, extension, mimeType }) => {
  if (extension === '.txt' || mimeType.startsWith('text/plain')) {
    return buffer.toString('utf8');
  }
  if (extension === '.pdf' || mimeType.includes('application/pdf')) {
    const result = await pdf(buffer, { max: 0 });
    return result.text || '';
  }
  if (extension === '.docx' || mimeType.includes('wordprocessingml.document')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  throw new Error('Unsupported text format. Stage 1 supports TXT, PDF, and DOCX only');
};

export const prepareSubmissionForSimilarity = async (submission) => {
  const directText = String(submission.submissionText || '').trim();
  let fileHash = null;
  let extractedFileText = '';
  let extractionStatus = submission.attachmentUrl ? 'PENDING' : 'NO_FILE';
  let extractionError = null;

  if (submission.attachmentUrl) {
    try {
      const { buffer, mimeType } = await downloadSubmissionFile(submission.attachmentUrl);
      fileHash = sha256(buffer);
      extractedFileText = await extractTextFromBuffer({
        buffer,
        extension: extensionFromUrl(submission.attachmentUrl),
        mimeType,
      });
      extractionStatus = extractedFileText.trim() ? 'EXTRACTED' : 'NO_EXTRACTABLE_TEXT';
    } catch (error) {
      extractionStatus = 'UNSUPPORTED_OR_FAILED';
      extractionError = error.message.slice(0, 300);
    }
  }

  const normalizedText = normalizeSimilarityText([directText, extractedFileText].filter(Boolean).join('\n'));
  const tokens = tokenize(normalizedText);
  return {
    submission,
    fileHash,
    normalizedText,
    normalizedTextHash: normalizedText.length >= 30 ? sha256(normalizedText) : null,
    tokens,
    shingles: tokens.length >= MIN_LEXICAL_TOKENS ? createShingles(normalizedText) : new Set(),
    extractionStatus,
    extractionError,
  };
};

export const comparePreparedSubmissions = (left, right) => {
  const exactFile = Boolean(left.fileHash && right.fileHash && left.fileHash === right.fileHash);
  const exactText = Boolean(
    left.normalizedTextHash
    && right.normalizedTextHash
    && left.normalizedTextHash === right.normalizedTextHash
  );
  const lexicalScore = exactText ? 1 : jaccardSimilarity(left.shingles, right.shingles);
  if (!exactFile && !exactText && lexicalScore < LEXICAL_THRESHOLD) return null;

  const matchType = exactFile
    ? 'EXACT_FILE'
    : exactText
      ? 'EXACT_TEXT'
      : 'HIGH_LEXICAL';
  const combinedScore = exactFile || exactText ? 1 : lexicalScore;

  return {
    submissionAId: left.submission.id,
    submissionBId: right.submission.id,
    matchType,
    exactFile,
    exactText,
    lexicalScore,
    combinedScore,
    matchedPassages: sharedPassages(left.shingles, right.shingles),
  };
};

export const analyzeSubmissionsStageOne = async (submissions) => {
  const prepared = [];
  for (const submission of submissions) {
    prepared.push(await prepareSubmissionForSimilarity(submission));
  }
  const matches = [];

  for (let leftIndex = 0; leftIndex < prepared.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < prepared.length; rightIndex += 1) {
      const match = comparePreparedSubmissions(prepared[leftIndex], prepared[rightIndex]);
      if (match) matches.push(match);
    }
  }

  matches.sort((left, right) => right.combinedScore - left.combinedScore);
  const unsupported = prepared.filter(
    (entry) => ['NO_EXTRACTABLE_TEXT', 'UNSUPPORTED_OR_FAILED'].includes(entry.extractionStatus)
      && !entry.normalizedText
  );

  return {
    matches,
    snapshot: prepared.map((entry) => ({
      submissionId: entry.submission.id,
      updatedAt: entry.submission.updatedAt,
      fileHash: entry.fileHash,
      normalizedTextHash: entry.normalizedTextHash,
      extractionStatus: entry.extractionStatus,
      extractionError: entry.extractionError,
      textLength: entry.normalizedText.length,
    })),
    summary: {
      submissionCount: submissions.length,
      comparedPairs: (submissions.length * (submissions.length - 1)) / 2,
      flaggedPairs: matches.length,
      exactFilePairs: matches.filter((match) => match.exactFile).length,
      exactTextPairs: matches.filter((match) => match.exactText).length,
      lexicalPairs: matches.filter((match) => match.matchType === 'HIGH_LEXICAL').length,
      unsupportedCount: unsupported.length,
    },
  };
};

const assertAIConfigured = () => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('Stage 2 AI review is not configured yet. Add OPENAI_API_KEY to campusone-backend/.env and restart the backend.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
};

const isReviewTokenCandidate = (token) => (
  token.length >= 4
  && !GLOBAL_COMMON_TOKENS.has(token)
  && !/^\d+$/.test(token)
);

const buildAssignmentCommonTokens = (prepared) => {
  const tokenSubmissionCounts = new Map();
  const threshold = Math.max(
    MIN_ASSIGNMENT_COMMON_SUBMISSIONS,
    Math.ceil(prepared.length * ASSIGNMENT_COMMON_TOKEN_RATIO)
  );

  if (prepared.length < MIN_ASSIGNMENT_COMMON_SUBMISSIONS) return new Set();

  for (const entry of prepared) {
    const uniqueTokens = new Set(entry.tokens.filter(isReviewTokenCandidate));
    for (const token of uniqueTokens) {
      tokenSubmissionCounts.set(token, (tokenSubmissionCounts.get(token) || 0) + 1);
    }
  }

  return new Set(
    [...tokenSubmissionCounts.entries()]
      .filter(([, count]) => count >= threshold)
      .map(([token]) => token)
  );
};

const getSharedDistinctiveTokens = (left, right, assignmentCommonTokens, limit = 14) => {
  const rightTokens = new Set(right.tokens);
  const shared = [];
  const seen = new Set();

  for (const token of left.tokens) {
    if (
      !isReviewTokenCandidate(token)
      || assignmentCommonTokens.has(token)
      || !rightTokens.has(token)
      || seen.has(token)
    ) {
      continue;
    }
    seen.add(token);
    shared.push(token);
    if (shared.length >= limit) break;
  }

  return shared;
};

const riskFromLocalEvidence = (match) => {
  if (match.exactFile || match.exactText) return 'high';
  if (Number(match.lexicalScore || match.combinedScore || 0) >= 0.65) return 'high';
  if (Number(match.lexicalScore || match.combinedScore || 0) >= 0.45) return 'medium';
  return 'low';
};

const safeJsonParse = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  const jsonText = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
};

const formatAIReview = (review, fallbackText) => {
  if (!review) return String(fallbackText || '').trim().slice(0, 1000);

  const risk = String(review.risk || 'medium').toUpperCase();
  const reason = String(review.reason || '').trim();
  const evidence = Array.isArray(review.shared_unique_evidence)
    ? review.shared_unique_evidence.join('; ')
    : String(review.shared_unique_evidence || '').trim();
  const templateOverlap = review.likely_assignment_template === true
    ? 'yes'
    : review.likely_assignment_template === false
      ? 'no'
      : 'unclear';
  const note = String(review.teacher_review_note || '').trim();

  return [
    `AI review: ${risk} risk.`,
    reason ? `Reason: ${reason}` : '',
    evidence ? `Distinctive evidence: ${evidence}` : '',
    `Assignment-template overlap: ${templateOverlap}.`,
    note ? `Teacher note: ${note}` : 'Teacher note: Review the original submissions before deciding.',
  ].filter(Boolean).join(' ').slice(0, 1000);
};

const reviewSimilarityMatchWithAI = async ({ match, left, right, assignmentCommonTokens }) => {
  assertAIConfigured();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_SIMILARITY_REVIEW_MODEL
    || process.env.OPENAI_SIMILARITY_MODEL
    || process.env.OPENAI_CHEAP_MODEL
    || process.env.OPENAI_QUIZ_MODEL
    || 'gpt-5.4-nano';
  const localRisk = riskFromLocalEvidence(match);
  const sharedDistinctiveTokens = getSharedDistinctiveTokens(left, right, assignmentCommonTokens);
  const assignmentCommonExamples = [...assignmentCommonTokens].slice(0, 20);

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          'You help teachers review Stage 1 assignment similarity evidence.',
          'Do not accuse students or decide plagiarism.',
          'Separate ordinary assignment-template similarity from distinctive shared evidence such as identical mistakes, unusual wording, unusual identifiers, comments, formatting, or control-flow/order.',
          'Return only compact JSON with keys: risk, reason, shared_unique_evidence, likely_assignment_template, teacher_review_note.',
          'risk must be low, medium, or high.',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          `Stage 1 match type: ${match.matchType}`,
          `Local evidence risk baseline: ${localRisk}`,
          `Exact file: ${match.exactFile ? 'yes' : 'no'}`,
          `Exact normalized text: ${match.exactText ? 'yes' : 'no'}`,
          `Lexical overlap score: ${Math.round(Number(match.lexicalScore || match.combinedScore || 0) * 100)}%`,
          `Shared phrase evidence: ${(match.matchedPassages || []).slice(0, 3).join(' | ') || 'none'}`,
          `Assignment-common tokens ignored: ${assignmentCommonExamples.join(', ') || 'none'}`,
          `Shared distinctive tokens: ${sharedDistinctiveTokens.join(', ') || 'none'}`,
          `Submission A excerpt:\n${left.normalizedText.slice(0, MAX_AI_REVIEW_CHARS)}`,
          `Submission B excerpt:\n${right.normalizedText.slice(0, MAX_AI_REVIEW_CHARS)}`,
        ].join('\n\n'),
      },
    ],
    max_output_tokens: 350,
  });

  const outputText = String(response.output_text || '').trim();
  const parsed = safeJsonParse(outputText);
  return {
    explanation: formatAIReview(parsed, outputText),
    model,
    usage: response.usage ? {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.total_tokens,
    } : null,
  };
};

export const analyzeSubmissionsStageTwo = async ({
  stageOneReport,
  submissions,
  includeExplanations = true,
}) => {
  const prepared = [];
  for (const submission of submissions) {
    prepared.push(await prepareSubmissionForSimilarity(submission));
  }

  const preparedById = new Map(prepared.map((entry) => [entry.submission.id, entry]));
  const assignmentCommonTokens = buildAssignmentCommonTokens(prepared);
  const reviewableMatches = (stageOneReport.matches || [])
    .filter((match) => match.matchType !== 'SEMANTIC')
    .filter((match) => preparedById.has(match.submissionAId) && preparedById.has(match.submissionBId))
    .sort((left, right) => Number(right.combinedScore || 0) - Number(left.combinedScore || 0));

  if (!includeExplanations || reviewableMatches.length === 0) {
    return {
      reviews: [],
      summary: {
        aiReviewCandidatePairs: reviewableMatches.length,
        aiReviewedPairs: 0,
        stage2Mode: 'AI_REVIEW',
        stage2CompletedAt: new Date().toISOString(),
      },
    };
  }

  const reviews = [];
  for (const match of reviewableMatches.slice(0, MAX_AI_REVIEWS)) {
    const review = await reviewSimilarityMatchWithAI({
      match,
      left: preparedById.get(match.submissionAId),
      right: preparedById.get(match.submissionBId),
      assignmentCommonTokens,
    });
    reviews.push({
      matchId: match.id,
      aiExplanation: review.explanation,
      aiModel: review.model,
      aiUsage: review.usage,
    });
  }

  const reviewedRisks = reviews.reduce((counts, review) => {
    const explanation = String(review.aiExplanation || '').toUpperCase();
    if (explanation.includes('HIGH risk'.toUpperCase())) {
      counts.high += 1;
    } else if (explanation.includes('LOW risk'.toUpperCase())) {
      counts.low += 1;
    } else {
      counts.medium += 1;
    }
    return counts;
  }, { high: 0, medium: 0, low: 0 });

  return {
    reviews,
    summary: {
      aiReviewCandidatePairs: reviewableMatches.length,
      aiReviewedPairs: reviews.length,
      aiReviewHighRiskPairs: reviewedRisks.high,
      aiReviewMediumRiskPairs: reviewedRisks.medium,
      aiReviewLowRiskPairs: reviewedRisks.low,
      assignmentCommonTokenCount: assignmentCommonTokens.size,
      stage2Mode: 'AI_REVIEW',
      stage2Model: reviews[0]?.aiModel || null,
      stage2CompletedAt: new Date().toISOString(),
    },
  };
};
