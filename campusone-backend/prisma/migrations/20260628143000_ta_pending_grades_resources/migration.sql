CREATE TYPE "TAPendingGradeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "TAPendingGrade" (
  "id" TEXT NOT NULL,
  "taStudentId" TEXT NOT NULL,
  "submissionId" TEXT,
  "answerId" TEXT,
  "marksAwarded" DOUBLE PRECISION NOT NULL,
  "feedback" TEXT,
  "status" "TAPendingGradeStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "appliedGrade" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TAPendingGrade_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TAPendingGrade_submission_or_answer_check" CHECK (
    ("submissionId" IS NOT NULL AND "answerId" IS NULL)
    OR ("submissionId" IS NULL AND "answerId" IS NOT NULL)
  )
);

CREATE TABLE "TAResource" (
  "id" TEXT NOT NULL,
  "offeringId" TEXT NOT NULL,
  "taAssignmentId" TEXT NOT NULL,
  "uploadedByStudentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "filePath" TEXT,
  "mimeType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TAResource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TAPendingGrade_submissionId_taStudentId_key"
  ON "TAPendingGrade"("submissionId", "taStudentId");
CREATE UNIQUE INDEX "TAPendingGrade_answerId_taStudentId_key"
  ON "TAPendingGrade"("answerId", "taStudentId");
CREATE INDEX "TAPendingGrade_status_createdAt_idx"
  ON "TAPendingGrade"("status", "createdAt");
CREATE INDEX "TAPendingGrade_taStudentId_idx"
  ON "TAPendingGrade"("taStudentId");

CREATE INDEX "TAResource_offeringId_createdAt_idx"
  ON "TAResource"("offeringId", "createdAt");
CREATE INDEX "TAResource_taAssignmentId_idx"
  ON "TAResource"("taAssignmentId");
CREATE INDEX "TAResource_uploadedByStudentId_idx"
  ON "TAResource"("uploadedByStudentId");

ALTER TABLE "TAPendingGrade"
  ADD CONSTRAINT "TAPendingGrade_taStudentId_fkey"
  FOREIGN KEY ("taStudentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TAPendingGrade"
  ADD CONSTRAINT "TAPendingGrade_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TAPendingGrade"
  ADD CONSTRAINT "TAPendingGrade_answerId_fkey"
  FOREIGN KEY ("answerId") REFERENCES "QuizAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TAResource"
  ADD CONSTRAINT "TAResource_offeringId_fkey"
  FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TAResource"
  ADD CONSTRAINT "TAResource_taAssignmentId_fkey"
  FOREIGN KEY ("taAssignmentId") REFERENCES "TAAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TAResource"
  ADD CONSTRAINT "TAResource_uploadedByStudentId_fkey"
  FOREIGN KEY ("uploadedByStudentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
