ALTER TABLE "QuizAttempt"
  ADD COLUMN "reopenedUntil" TIMESTAMP(3),
  ADD COLUMN "reopenedBy" TEXT,
  ADD COLUMN "reopenedAt" TIMESTAMP(3),
  ADD COLUMN "reopenGrantId" TEXT;

CREATE TABLE "QuizReopenGrant" (
  "id" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "grantedBy" TEXT NOT NULL,
  "until" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QuizReopenGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuizReopenGrant_quizId_studentId_key"
  ON "QuizReopenGrant"("quizId", "studentId");

CREATE INDEX "QuizReopenGrant_quizId_until_idx"
  ON "QuizReopenGrant"("quizId", "until");

CREATE INDEX "QuizReopenGrant_studentId_until_idx"
  ON "QuizReopenGrant"("studentId", "until");

ALTER TABLE "QuizReopenGrant"
  ADD CONSTRAINT "QuizReopenGrant_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizReopenGrant"
  ADD CONSTRAINT "QuizReopenGrant_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
