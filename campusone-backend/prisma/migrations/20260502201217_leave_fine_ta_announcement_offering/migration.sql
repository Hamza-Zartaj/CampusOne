-- CreateEnum
CREATE TYPE "TAStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RELIEVED');

-- CreateEnum
CREATE TYPE "TAPermission" AS ENUM ('MARK_ATTENDANCE', 'GRADE_ASSIGNMENTS', 'GRADE_QUIZZES', 'ANSWER_QNA', 'UPLOAD_RESOURCES', 'VIEW_ROSTER');

-- CreateTable
CREATE TABLE "TAAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "status" "TAStatus" NOT NULL DEFAULT 'PENDING',
    "permissions" "TAPermission"[] DEFAULT ARRAY['VIEW_ROSTER']::"TAPermission"[],
    "appliedSemester" INTEGER NOT NULL,
    "targetSemesterMin" INTEGER NOT NULL,
    "targetSemesterMax" INTEGER NOT NULL,
    "reason" TEXT,
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TAAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TAAssignment_offeringId_status_idx" ON "TAAssignment"("offeringId", "status");

-- CreateIndex
CREATE INDEX "TAAssignment_studentId_status_idx" ON "TAAssignment"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TAAssignment_studentId_offeringId_key" ON "TAAssignment"("studentId", "offeringId");

-- AddForeignKey
ALTER TABLE "TAAssignment" ADD CONSTRAINT "TAAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TAAssignment" ADD CONSTRAINT "TAAssignment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
