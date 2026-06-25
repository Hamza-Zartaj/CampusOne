# CampusOne AI Implementation

> Last updated: June 25, 2026

## Implemented

### AI quiz generation

- Teacher enters a prompt inside the quiz editor.
- CampusOne adds the selected course code and title as context.
- Supports MCQ, true/false, short-answer, difficulty, count, and marks settings.
- Uses `gpt-5.4-mini` through the OpenAI Responses API.
- Uses strict structured output and CampusOne validation.
- Generated questions are added to the editable draft quiz.
- Existing question text is supplied to reduce duplicates.
- Teacher ownership, prompt limits, and rate limits are enforced.
- Missing or invalid API keys return clear errors.
- AI never publishes a quiz automatically.
- Course files, PDFs, lecture material, and images are not used.

### Assignment similarity — Stage 1

- Runs inside the **View Submissions** popup.
- Teacher can close or reopen submissions from the same popup.
- Requires a closed assignment and at least two submissions.
- Detects identical files with SHA-256.
- Detects identical normalized text.
- Detects high text overlap using local word shingles.
- Extracts text locally from TXT, PDF, and DOCX.
- Images and files without extractable text are marked unsupported.
- ZIP submissions are not accepted.
- Reports and matched student pairs are stored in PostgreSQL.
- Reports become stale if submissions change.
- Stage 1 uses no OpenAI calls or AI tokens.
- Results are evidence for teacher review, not a plagiarism verdict.

## Not Implemented Yet

### Assignment similarity — Stage 2

- `pgvector` and text embeddings
- Semantic similarity for unresolved matches
- Optional AI explanation of the strongest matched passages
- Teacher review decisions and audit logs

## OpenAI Configuration

Create a key at [OpenAI API Keys](https://platform.openai.com/api-keys), then add:

```env
OPENAI_API_KEY=your_key_here
OPENAI_QUIZ_MODEL=gpt-5.4-mini
AI_MAX_QUIZ_PROMPT_CHARS=10000
```

Restart the backend after editing `campusone-backend/.env`.

Never place the API key in frontend code or a `VITE_` variable.
