-- CampusOne Schema Redesign Migration
-- Removes TA, fixes relations, adds proper tables

-- ============ REMOVE TA ============
DROP TABLE IF EXISTS "TA" CASCADE;
DROP TABLE IF EXISTS "TAEligibility" CASCADE;

-- ============ TRUSTED DEVICES ============
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrustedDevice_userId_deviceId_key" ON "TrustedDevice"("userId", "deviceId");
CREATE INDEX "TrustedDevice_userId_idx" ON "TrustedDevice"("userId");
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ DEPARTMENT HOD FK ============
ALTER TABLE "Department" ADD CONSTRAINT "Department_headOfDepartmentId_fkey"
    FOREIGN KEY ("headOfDepartmentId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============ COURSE PREREQUISITES TABLE ============
CREATE TABLE "CoursePrerequisite" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoursePrerequisite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CoursePrerequisite_courseId_prerequisiteId_key"
    ON "CoursePrerequisite"("courseId", "prerequisiteId");
CREATE INDEX "CoursePrerequisite_courseId_idx" ON "CoursePrerequisite"("courseId");
CREATE INDEX "CoursePrerequisite_prerequisiteId_idx" ON "CoursePrerequisite"("prerequisiteId");
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_prerequisiteId_fkey"
    FOREIGN KEY ("prerequisiteId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old JSON prerequisites column from Course
ALTER TABLE "Course" DROP COLUMN IF EXISTS "prerequisites";

-- ============ REMOVE CourseOffering.tas JSON ============
ALTER TABLE "CourseOffering" DROP COLUMN IF EXISTS "tas";

-- ============ REMOVE REDUNDANT STUDENT FIELDS ============
ALTER TABLE "Student" DROP COLUMN IF EXISTS "enrolledCourses";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "completedCourses";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "cgpa";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "totalCredits";

-- ============ REMOVE REDUNDANT TEACHER FIELDS ============
ALTER TABLE "Teacher" DROP COLUMN IF EXISTS "teachingCourses";

-- ============ PROGRAM CURRICULUM ENTRY TABLE ============
CREATE TABLE "ProgramCurriculumEntry" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "semesterNumber" INTEGER NOT NULL,
    "isElective" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramCurriculumEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProgramCurriculumEntry_programId_courseId_semesterNumber_key"
    ON "ProgramCurriculumEntry"("programId", "courseId", "semesterNumber");
CREATE INDEX "ProgramCurriculumEntry_programId_idx" ON "ProgramCurriculumEntry"("programId");
CREATE INDEX "ProgramCurriculumEntry_courseId_idx" ON "ProgramCurriculumEntry"("courseId");
ALTER TABLE "ProgramCurriculumEntry" ADD CONSTRAINT "ProgramCurriculumEntry_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramCurriculumEntry" ADD CONSTRAINT "ProgramCurriculumEntry_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old JSON curriculum column from Program
ALTER TABLE "Program" DROP COLUMN IF EXISTS "curriculum";

-- ============ ATTENDANCE RECORD TABLE (replaces Attendance with JSON) ============
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AttendanceRecord_courseOfferingId_studentId_date_key"
    ON "AttendanceRecord"("courseOfferingId", "studentId", "date");
CREATE INDEX "AttendanceRecord_courseId_idx" ON "AttendanceRecord"("courseId");
CREATE INDEX "AttendanceRecord_studentId_idx" ON "AttendanceRecord"("studentId");
CREATE INDEX "AttendanceRecord_courseOfferingId_idx" ON "AttendanceRecord"("courseOfferingId");
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_courseOfferingId_fkey"
    FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old Attendance table
DROP TABLE IF EXISTS "Attendance" CASCADE;

-- ============ NOTIFICATION FK ============
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ MAKE Course.programId NULLABLE ============
ALTER TABLE "Course" ALTER COLUMN "programId" DROP NOT NULL;
