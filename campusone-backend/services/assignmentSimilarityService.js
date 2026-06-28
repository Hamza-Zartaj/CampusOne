import crypto from 'node:crypto';
import path from 'node:path';
import OpenAI from 'openai';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const SHINGLE_SIZE = 5;
const LEXICAL_THRESHOLD = 0.35;
const MIN_LEXICAL_TOKENS = 30;
const SEMANTIC_THRESHOLD = 0.78;
const MIN_SEMANTIC_TEXT_LENGTH = 120;
const MAX_EMBEDDING_INPUT_CHARS = 12_000;
const MAX_SEMANTIC_MATCHES = 30;
const MAX_AI_EXPLANATIONS = 5;

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const normalizeSimilarityText = (value) => String(value || '')
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/\r\n?/g, '\n')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenize = (text) => normalizeSimilarityText(text).split(' ').filter(Boolean);

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

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

const vectorLiteral = (embedding) => `[${embedding.map((value) => Number(value).toFixed(8)).join(',')}]`;

const assertAIConfigured = () => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('Stage 2 AI scan is not configured yet. Add OPENAI_API_KEY to campusone-backend/.env and restart the backend.');
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
};

const generateSubmissionEmbeddings = async (prepared, model) => {
  assertAIConfigured();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embeddings = new Map();

  for (const group of chunk(prepared, 32)) {
    const response = await client.embeddings.create({
      model,
      input: group.map((entry) => entry.normalizedText.slice(0, MAX_EMBEDDING_INPUT_CHARS)),
    });

    response.data.forEach((item, index) => {
      const embedding = item.embedding;
      if (!Array.isArray(embedding) || embedding.length !== 1536) {
        const error = new Error('The configured embedding model must return 1536-dimensional vectors for pgvector storage.');
        error.code = 'AI_INVALID_EMBEDDING';
        throw error;
      }
      embeddings.set(group[index].submission.id, embedding);
    });
  }

  return embeddings;
};

const cacheEmbeddings = async ({ prisma, assignmentId, prepared, model, embeddings }) => {
  for (const entry of prepared) {
    const embedding = embeddings.get(entry.submission.id);
    if (!embedding) continue;
    const id = `simemb_${crypto.randomUUID().replace(/-/g, '')}`;
    const textPreview = entry.normalizedText.slice(0, 500);
    const embeddingText = vectorLiteral(embedding);

    await prisma.$executeRaw`
      INSERT INTO "assignment_similarity_embeddings"
        ("id", "assignmentId", "submissionId", "model", "textHash", "textPreview", "embedding", "createdAt", "updatedAt")
      VALUES
        (${id}, ${assignmentId}, ${entry.submission.id}, ${model}, ${entry.normalizedTextHash}, ${textPreview}, ${embeddingText}::vector, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("assignmentId", "submissionId", "model", "textHash")
      DO UPDATE SET
        "textPreview" = EXCLUDED."textPreview",
        "embedding" = EXCLUDED."embedding",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    await prisma.$executeRaw`
      DELETE FROM "assignment_similarity_embeddings"
      WHERE "assignmentId" = ${assignmentId}
        AND "submissionId" = ${entry.submission.id}
        AND "model" = ${model}
        AND "textHash" <> ${entry.normalizedTextHash}
    `;
  }
};

const fetchSemanticCandidates = async ({ prisma, assignmentId, model }) => prisma.$queryRaw`
  SELECT
    left_embedding."submissionId" AS "submissionAId",
    right_embedding."submissionId" AS "submissionBId",
    1 - (left_embedding."embedding" <=> right_embedding."embedding") AS "semanticScore"
  FROM "assignment_similarity_embeddings" left_embedding
  JOIN "assignment_similarity_embeddings" right_embedding
    ON left_embedding."assignmentId" = right_embedding."assignmentId"
   AND left_embedding."submissionId" < right_embedding."submissionId"
   AND left_embedding."model" = right_embedding."model"
  WHERE left_embedding."assignmentId" = ${assignmentId}
    AND left_embedding."model" = ${model}
    AND 1 - (left_embedding."embedding" <=> right_embedding."embedding") >= ${SEMANTIC_THRESHOLD}
  ORDER BY "semanticScore" DESC
  LIMIT ${MAX_SEMANTIC_MATCHES}
`;

const buildSemanticPassages = (leftText, rightText) => ([
  leftText.slice(0, 350),
  rightText.slice(0, 350),
].filter(Boolean));

const explainSemanticMatch = async ({ left, right, score }) => {
  assertAIConfigured();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_SIMILARITY_MODEL
    || process.env.OPENAI_CHEAP_MODEL
    || process.env.OPENAI_QUIZ_MODEL
    || 'gpt-5.4-nano';

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: [
          'You help teachers review assignment similarity evidence.',
          'Compare the two excerpts and explain the likely conceptual overlap in two concise sentences.',
          'Do not accuse students or call the work plagiarism.',
          'Mention that the teacher should review the original submissions.',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          `Semantic similarity score: ${Math.round(score * 100)}%`,
          `Submission A excerpt:\n${left.normalizedText.slice(0, 1400)}`,
          `Submission B excerpt:\n${right.normalizedText.slice(0, 1400)}`,
        ].join('\n\n'),
      },
    ],
    max_output_tokens: 220,
  });

  return {
    explanation: String(response.output_text || '').trim().slice(0, 1000),
    model,
    usage: response.usage ? {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.total_tokens,
    } : null,
  };
};

export const analyzeSubmissionsStageTwo = async ({
  prisma,
  assignmentId,
  stageOneReport,
  submissions,
  includeExplanations = true,
}) => {
  const prepared = [];
  for (const submission of submissions) {
    const entry = await prepareSubmissionForSimilarity(submission);
    if (entry.normalizedText.length >= MIN_SEMANTIC_TEXT_LENGTH && entry.normalizedTextHash) {
      prepared.push(entry);
    }
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  const preparedById = new Map(prepared.map((entry) => [entry.submission.id, entry]));
  const stageOnePairs = new Set((stageOneReport.matches || [])
    .filter((match) => match.matchType !== 'SEMANTIC')
    .map((match) => [match.submissionAId, match.submissionBId].sort().join(':')));

  if (prepared.length < 2) {
    return {
      matches: [],
      summary: {
        semanticComparedSubmissions: prepared.length,
        semanticPairs: 0,
        semanticThreshold: SEMANTIC_THRESHOLD,
        stage2Model: model,
        stage2CompletedAt: new Date().toISOString(),
      },
    };
  }

  const embeddings = await generateSubmissionEmbeddings(prepared, model);
  await cacheEmbeddings({ prisma, assignmentId, prepared, model, embeddings });

  const candidates = await fetchSemanticCandidates({ prisma, assignmentId, model });
  const semanticMatches = candidates
    .filter((candidate) => {
      const pairKey = [candidate.submissionAId, candidate.submissionBId].sort().join(':');
      return !stageOnePairs.has(pairKey)
        && preparedById.has(candidate.submissionAId)
        && preparedById.has(candidate.submissionBId);
    })
    .map((candidate) => {
      const left = preparedById.get(candidate.submissionAId);
      const right = preparedById.get(candidate.submissionBId);
      const score = Number(candidate.semanticScore);
      return {
        submissionAId: candidate.submissionAId,
        submissionBId: candidate.submissionBId,
        matchType: 'SEMANTIC',
        exactFile: false,
        exactText: false,
        lexicalScore: 0,
        semanticScore: score,
        combinedScore: score,
        matchedPassages: buildSemanticPassages(left.normalizedText, right.normalizedText),
      };
    });

  if (includeExplanations) {
    for (const match of semanticMatches.slice(0, MAX_AI_EXPLANATIONS)) {
      const explanation = await explainSemanticMatch({
        left: preparedById.get(match.submissionAId),
        right: preparedById.get(match.submissionBId),
        score: match.semanticScore,
      });
      match.aiExplanation = explanation.explanation;
      match.aiModel = explanation.model;
      match.aiUsage = explanation.usage;
    }
  }

  return {
    matches: semanticMatches,
    summary: {
      semanticComparedSubmissions: prepared.length,
      semanticPairs: semanticMatches.length,
      semanticThreshold: SEMANTIC_THRESHOLD,
      aiExplainedPairs: semanticMatches.filter((match) => match.aiExplanation).length,
      stage2Model: model,
      stage2CompletedAt: new Date().toISOString(),
    },
  };
};
