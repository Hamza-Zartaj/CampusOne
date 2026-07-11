-- CreateEnum
CREATE TYPE "ComponentKind" AS ENUM ('ASSIGNMENT', 'QUIZ', 'MID', 'FINAL', 'PROJECT_PRESENTATION', 'PARTICIPATION', 'LAB_WORK');

-- DropIndex
DROP INDEX "assignment_similarity_embeddings_vector_idx";

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "audienceFilters" JSONB;

-- AlterTable
ALTER TABLE "CourseOffering" DROP COLUMN "schedule";

-- AlterTable
ALTER TABLE "Quiz" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "questionOrder" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "assignment_similarity_embeddings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CourseGradeComponent" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "kind" "ComponentKind" NOT NULL,
    "label" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "totalPerInstance" DOUBLE PRECISION NOT NULL,
    "weightPercent" DOUBLE PRECISION NOT NULL,
    "aggregation" TEXT NOT NULL DEFAULT 'AVERAGE',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "marksReleased" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGradeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkComponent" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "kind" "ComponentKind" NOT NULL,
    "index" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "date" DATE,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "obtainedMarks" DOUBLE PRECISION,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "materialUrl" TEXT,
    "materialName" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseGradeComponent_courseId_idx" ON "CourseGradeComponent"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseGradeComponent_courseId_kind_key" ON "CourseGradeComponent"("courseId", "kind");

-- CreateIndex
CREATE INDEX "MarkComponent_enrollmentId_idx" ON "MarkComponent"("enrollmentId");

-- CreateIndex
CREATE INDEX "MarkComponent_kind_idx" ON "MarkComponent"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "MarkComponent_enrollmentId_kind_index_key" ON "MarkComponent"("enrollmentId", "kind", "index");

-- CreateIndex
CREATE INDEX "Lecture_offeringId_date_idx" ON "Lecture"("offeringId", "date");

-- AddForeignKey
ALTER TABLE "CourseGradeComponent" ADD CONSTRAINT "CourseGradeComponent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkComponent" ADD CONSTRAINT "MarkComponent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecture" ADD CONSTRAINT "Lecture_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "assignment_similarity_embeddings_assignmentId_submissionId_mode" RENAME TO "assignment_similarity_embeddings_assignmentId_submissionId__key";
