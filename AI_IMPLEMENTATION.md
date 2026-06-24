# CampusOne AI Implementation Guide

> Design and implementation roadmap for AI quiz generation and assignment similarity analysis.
>
> Last reviewed: June 25, 2026

## 1. Scope and Product Rules

CampusOne can use AI for:

- Generating draft quiz questions from a teacher prompt with the selected course name as context
- Producing answer explanations and learning-objective metadata
- Suggesting difficulty and Bloom taxonomy levels
- Finding duplicate or near-duplicate questions
- Finding suspicious similarity between assignment submissions
- Summarizing similarity evidence for teacher review

AI output must always be treated as a suggestion. It must never:

- Publish a quiz without teacher review
- Assign plagiarism guilt automatically
- make disciplinary decisions
- expose one student's submission to another student

## 2. Recommended Models

Use model names through environment variables so they can be changed without editing source code.

| Workload | Default | Why |
|---|---|---|
| Quiz generation | `gpt-5.4-mini` | Best default balance of quality and price |
| Cheap classification and metadata | `gpt-5.4-nano` | Very low cost for tagging, filtering, and simple drafts |
| Difficult specialist topics | `gpt-5.5` | Optional escalation, not the default |
| Assignment semantic similarity | `text-embedding-3-small` | Very inexpensive vector embeddings |

Approximate standard API pricing at the time of this review:

| Model | Input per 1M tokens | Output per 1M tokens |
|---|---:|---:|
| GPT-5.4 mini | $0.75 | $4.50 |
| GPT-5.4 nano | $0.20 | $1.25 |
| GPT-5.5 | $2.50 | $15.00 |
| text-embedding-3-small | $0.02 | Not applicable |

Prompt-based quiz generation is inexpensive because no course documents are attached. Exact cost depends on prompt length, question count, and answer/explanation length. Assignment similarity remains text-only: PDF page images, vision input, image analysis, and OCR are outside the planned scope.

## 3. Getting an OpenAI API Key

1. Sign in or create an account at the [OpenAI API Platform](https://platform.openai.com/).
2. Create a dedicated project for CampusOne from the project selector.
3. Configure billing and a conservative monthly usage limit.
4. Open the project's [API Keys page](https://platform.openai.com/api-keys).
5. Create a new secret key with only the permissions CampusOne needs.
6. Copy the key immediately; the complete secret is normally shown only once.
7. Add it to `campusone-backend/.env`:

```env
OPENAI_API_KEY=your_secret_key_here
OPENAI_QUIZ_MODEL=gpt-5.4-mini
OPENAI_CHEAP_MODEL=gpt-5.4-nano
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AI_MONTHLY_BUDGET_USD=10
AI_MAX_QUIZ_PROMPT_CHARS=10000
```

8. Restart the backend after changing the environment file.

Never:

- put the key in `campusone-frontend`
- prefix it with `VITE_`
- commit it to Git
- send it to the browser
- share one personal key among developers

All OpenAI requests must pass through CampusOne's backend. Rotate the key immediately if it is exposed. See OpenAI's [API-key safety guidance](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety).

## 4. AI Quiz Generation

### Implementation status

Implemented on June 25, 2026:

- teacher-only `POST /api/quizzes/ai/generate`
- offering ownership verification
- prompt, count, mix, difficulty, and marks validation
- automatic course-code and course-title context
- OpenAI Responses API with strict Structured Outputs
- second-pass CampusOne question validation
- duplicate-question context and client-side duplicate filtering
- per-teacher generation rate limiting
- token-usage return data
- graceful `AI_NOT_CONFIGURED` behavior until `OPENAI_API_KEY` is added
- compact collapsible generator inside the quiz editor
- generated questions enter the normal editable draft list and are never auto-published

### Teacher workflow

1. Open a course offering and choose **Generate with AI**.
2. CampusOne automatically supplies the selected course code and course title as context.
3. Write a generation prompt. For example:

   ```text
   Create 10 conceptual MCQs about database normalization.
   Focus on identifying 1NF, 2NF, and 3NF violations.
   Avoid definition-only questions and include plausible distractors.
   ```

4. Choose:
   - number of questions
   - MCQ, true/false, and short-answer mix
   - difficulty distribution
   - Bloom levels
   - topics or learning outcomes
   - marks and language
5. Start a background generation job.
6. Review the generated questions and explanations.
7. Edit, accept, or reject each question.
8. Add accepted questions to a draft quiz.
9. Publish through the normal quiz workflow.

### Generation context

There is one generation mode only: **Prompt generation**.

CampusOne sends:

- the teacher's prompt
- the selected course code
- the selected course title
- the requested question count and type mix
- difficulty, Bloom level, marks, and language settings

CampusOne does not send lecture files, assignment files, uploaded course material, PDFs, images, or extracted document text for quiz generation. The course name is contextual guidance, not a factual source, so every generated question still requires teacher review.

### Required structured result

Use the Responses API with strict Structured Outputs. The generated JSON should follow this shape:

```json
{
  "questions": [
    {
      "type": "MCQ",
      "questionText": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why the answer is correct",
      "marks": 1,
      "difficulty": "MEDIUM",
      "bloomLevel": "UNDERSTAND",
      "learningObjective": "Explain the concept"
    }
  ]
}
```

### Deterministic validation

Never rely on the model alone. CampusOne must reject generated output when:

- the question type is unsupported
- text is empty
- options are empty or duplicated
- the answer index is outside the options
- marks are non-positive
- the question duplicates an existing question
- requested question counts are not satisfied

### Suggested database models

```text
AIQuizGenerationJob
  id, offeringId, createdById, status
  model, prompt, courseCode, courseTitle, settings
  inputTokens, outputTokens, estimatedCost, error

GeneratedQuizQuestion
  id, jobId, payload
  validationStatus, reviewStatus, reviewedById
```

### Backend endpoints

```text
POST /api/ai/quiz-jobs
GET  /api/ai/quiz-jobs/:id
POST /api/ai/quiz-jobs/:id/cancel
PUT  /api/ai/generated-questions/:id/review
POST /api/ai/quiz-jobs/:id/accept
```

Authorization must confirm that the teacher owns the selected course offering. A TA should require an explicit future AI-generation permission.

## 5. Assignment Similarity and Plagiarism Review

This service should find evidence of similarity, not pronounce a plagiarism verdict.

### Teacher workflow

1. Open a particular assignment.
2. Click **Close Submissions** to freeze the submission set.
3. Click **Check Similarity**.
4. CampusOne records an immutable snapshot of submission IDs, update times, and file hashes.
5. CampusOne runs free/local duplicate and lexical checks first.
6. CampusOne runs embedding-based semantic analysis only where it adds value.
7. An optional language model summarizes the strongest flagged evidence.
8. The teacher reviews side-by-side matches and records a conclusion.

Similarity scanning should normally require the assignment to be `CLOSED`. Reopening submissions or changing a submission makes the previous report stale.

### Stage 1 — Internal checks without AI tokens

Run these checks before any OpenAI request:

- Compute SHA-256 from original file bytes. Identical PDFs are immediately marked `EXACT_FILE_DUPLICATE`, even if their filenames differ.
- Hash directly entered submission text.
- Extract text locally from PDF, DOCX, TXT, and supported archives.
- Ignore embedded images and image-only pages.
- Mark submissions with no extractable text as `NO_EXTRACTABLE_TEXT`; do not send them to OpenAI.
- Normalize Unicode, whitespace, headers, footers, and known assignment templates.
- Hash normalized text to catch the same content saved with different PDF metadata or formatting.
- Use file size and MIME type as cheap candidate hints.
- Generate token shingles and compare them with Jaccard, MinHash, or winnowing.
- For code, normalize comments, formatting, and identifiers before token or AST comparison.

Exact duplicates should not be sent to an LLM just to rediscover that they are identical. Show the hash match and file metadata directly as evidence.

### Stage 2 — AI-assisted semantic checks

1. Split unresolved extracted text into chunks of roughly 300 to 800 tokens.
2. Generate `text-embedding-3-small` embeddings.
3. Cache embeddings by normalized-content checksum so identical content is embedded once.
4. Store embeddings in PostgreSQL with `pgvector`.
5. Retrieve likely matches instead of comparing every possible pair with a language model.
6. Combine exact, lexical, semantic, and longest-passage scores.
7. Show matching passages side by side to the teacher.

An optional GPT-5.4 nano call may explain only the strongest candidate passages in plain language. It must not receive every complete submission or produce a misconduct verdict.

```text
Exact file/text hash
  -> normalized-content comparison
  -> lexical/code fingerprints
  -> embedding similarity
  -> optional LLM explanation of top matches
  -> teacher decision
```

Record the teacher's review separately from every machine-generated score.

For 100 submissions containing 2,500 tokens each, the initial embedding cost is approximately $0.005. Vector comparison then happens locally in PostgreSQL.

### Code assignments

For programming submissions, add:

- comment and formatting removal
- identifier normalization
- token sequence fingerprints
- language-aware AST comparison
- JPlag-style matching where supported

Embeddings can supplement code comparison but should not be the primary evidence.

### Suggested database models

```text
SubmissionFingerprint
  id, submissionId, contentHash, normalizedTextPath
  extractorVersion, createdAt

SubmissionChunkEmbedding
  id, submissionId, chunkIndex, text
  embedding, pageOrLineStart, pageOrLineEnd

SimilarityReport
  id, assignmentId, status, algorithmVersion
  comparisonScope, submissionSnapshot, createdById, createdAt
  staleAt, completedAt

SimilarityMatch
  id, reportId, submissionAId, submissionBId
  matchType, exactScore, lexicalScore, semanticScore, combinedScore
  matchedPassages, reviewStatus, reviewerNotes
```

### Comparison scope

Teachers should explicitly choose:

- current assignment only
- current course offering
- authorized previous cohorts
- institution-wide internal corpus

CampusOne's local database cannot detect copying from arbitrary public websites. Web-wide checking requires a separate licensed search or plagiarism-data provider.

Do not market AI-writing detection as reliable plagiarism evidence. It can produce serious false positives.

## 6. Cost, Reliability, and Security Controls

- Keep AI routes teacher-only by default.
- Queue generation and similarity jobs instead of holding HTTP requests open.
- Set per-user and per-offering rate limits.
- Enforce quiz-prompt length, submission file-size, and token limits.
- Record model, token usage, cost estimate, latency, and failure reason.
- Add a global monthly AI budget circuit breaker.
- Cache submission text extraction and embeddings by checksum.
- Retry transient failures with exponential backoff.
- Never log API keys, complete submissions, or sensitive prompts.
- Never send images, PDF page renderings, screenshots, or OCR output to OpenAI.
- Redact personal information where it is not needed for analysis.
- Define retention and deletion rules for extracted text and embeddings.
- Make similarity reports visible only to authorized academic staff.
- Use Batch processing for non-urgent jobs when the delay is acceptable.

## 7. Implementation Phases

### Phase 1 — Foundation

- Add the OpenAI backend SDK
- Add environment configuration and startup validation
- Add private assignment-submission access
- Add text-only submission extraction, checksums, chunks, unsupported-file states, and job tables
- Add an asynchronous job runner
- Add token and cost accounting

### Phase 2 — Quiz generation

- [x] Add a prompt-first teacher generation form
- [x] Automatically include the selected course code and title as context
- [x] Implement strict structured generation
- [x] Add validation and duplicate detection
- [x] Add review/edit workflow through the existing question editor
- [x] Insert generated questions into draft quizzes

### Phase 3 — Assignment similarity

- Add direct Close/Reopen Submissions controls
- Require a closed submission snapshot for each scan
- Add exact original-file and normalized-content hashing
- Enable `pgvector`
- Implement extraction and normalization
- Add lexical fingerprints
- Add embeddings and candidate retrieval
- Add side-by-side evidence reports
- Add teacher review records and audit logs

### Phase 4 — Quality and operations

- Build a reviewed evaluation set
- Measure unsupported-answer and duplicate rates
- Compare mini and nano quality using reviewed CampusOne quiz prompts
- Add model fallback rules
- Add monitoring, budgets, retention, and administrator controls

## 8. Definition of Done

AI quiz generation is complete only when:

- malformed output is rejected
- course code and title are included automatically
- no course or lecture files are accepted by the quiz generator
- teachers review before publication
- token usage and model name are returned for cost monitoring
- failures are recoverable without duplicate jobs

Similarity analysis is complete only when:

- exact, lexical, and semantic methods are combined
- teachers can inspect the matching passages
- access is restricted and audited
- the UI calls results similarity evidence rather than a plagiarism verdict
- code submissions use language-aware comparison

## 9. Official References

- [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart)
- [Latest model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [Pricing](https://developers.openai.com/api/docs/pricing)
- [API Keys](https://platform.openai.com/api-keys)
- [API-key safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Batch processing](https://developers.openai.com/api/docs/guides/batch)
