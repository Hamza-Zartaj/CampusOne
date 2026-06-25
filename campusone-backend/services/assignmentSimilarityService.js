import crypto from 'node:crypto';
import path from 'node:path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const SHINGLE_SIZE = 5;
const LEXICAL_THRESHOLD = 0.35;
const MIN_LEXICAL_TOKENS = 30;

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
