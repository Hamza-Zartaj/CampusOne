CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  CREATE TYPE "SimilarityReportStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SimilarityMatchType" AS ENUM ('EXACT_FILE', 'EXACT_TEXT', 'HIGH_LEXICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SimilarityReport" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "status" "SimilarityReportStatus" NOT NULL DEFAULT 'RUNNING',
  "submissionSnapshot" JSONB NOT NULL,
  "summary" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "SimilarityReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SimilarityReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SimilarityReport_assignmentId_createdAt_idx"
  ON "SimilarityReport"("assignmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "SimilarityReport_status_idx"
  ON "SimilarityReport"("status");

CREATE TABLE IF NOT EXISTS "SimilarityMatch" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "submissionAId" TEXT NOT NULL,
  "submissionBId" TEXT NOT NULL,
  "matchType" "SimilarityMatchType" NOT NULL,
  "exactFile" BOOLEAN NOT NULL DEFAULT false,
  "exactText" BOOLEAN NOT NULL DEFAULT false,
  "lexicalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "combinedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "matchedPassages" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SimilarityMatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SimilarityMatch_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SimilarityReport"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SimilarityMatch_submissionAId_fkey" FOREIGN KEY ("submissionAId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SimilarityMatch_submissionBId_fkey" FOREIGN KEY ("submissionBId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SimilarityMatch_reportId_submissionAId_submissionBId_key"
  ON "SimilarityMatch"("reportId", "submissionAId", "submissionBId");
CREATE INDEX IF NOT EXISTS "SimilarityMatch_reportId_combinedScore_idx"
  ON "SimilarityMatch"("reportId", "combinedScore");
CREATE INDEX IF NOT EXISTS "SimilarityMatch_submissionAId_idx"
  ON "SimilarityMatch"("submissionAId");
CREATE INDEX IF NOT EXISTS "SimilarityMatch_submissionBId_idx"
  ON "SimilarityMatch"("submissionBId");

ALTER TYPE "SimilarityMatchType" ADD VALUE IF NOT EXISTS 'SEMANTIC';

CREATE TYPE "SimilarityReviewDecision" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'DISMISSED',
  'NEEDS_DISCUSSION'
);

ALTER TABLE "SimilarityMatch"
  ADD COLUMN "semanticScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "aiExplanation" TEXT,
  ADD COLUMN "aiModel" TEXT,
  ADD COLUMN "aiUsage" JSONB;

CREATE TABLE "SimilarityMatchReview" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "decision" "SimilarityReviewDecision" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "reviewedById" TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SimilarityMatchReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SimilarityMatchReview_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "SimilarityMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SimilarityMatchReview_matchId_key" ON "SimilarityMatchReview"("matchId");
CREATE INDEX "SimilarityMatchReview_decision_idx" ON "SimilarityMatchReview"("decision");
CREATE INDEX "SimilarityMatchReview_reviewedById_idx" ON "SimilarityMatchReview"("reviewedById");

CREATE TABLE "assignment_similarity_embeddings" (
  "id" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "textHash" TEXT NOT NULL,
  "textPreview" TEXT,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "assignment_similarity_embeddings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assignment_similarity_embeddings_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "assignment_similarity_embeddings_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "assignment_similarity_embeddings_assignmentId_submissionId_model_textHash_key"
  ON "assignment_similarity_embeddings"("assignmentId", "submissionId", "model", "textHash");
CREATE INDEX "assignment_similarity_embeddings_assignmentId_model_idx"
  ON "assignment_similarity_embeddings"("assignmentId", "model");
CREATE INDEX "assignment_similarity_embeddings_vector_idx"
  ON "assignment_similarity_embeddings" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
