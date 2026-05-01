-- Drop all tables in CampusOne (reverse dependency order)
-- Run this on Supabase via the SQL Editor

-- Drop in order: dependent tables first, then their dependencies

DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "QuizAnswer" CASCADE;
DROP TABLE IF EXISTS "QuizAttempt" CASCADE;
DROP TABLE IF EXISTS "QuizQuestion" CASCADE;
DROP TABLE IF EXISTS "Quiz" CASCADE;
DROP TABLE IF EXISTS "QnaReply" CASCADE;
DROP TABLE IF EXISTS "QnaThread" CASCADE;
DROP TABLE IF EXISTS "Attendance" CASCADE;
DROP TABLE IF EXISTS "Submission" CASCADE;
DROP TABLE IF EXISTS "Assignment" CASCADE;
DROP TABLE IF EXISTS "Enrollment" CASCADE;
DROP TABLE IF EXISTS "SemesterIncharge" CASCADE;
DROP TABLE IF EXISTS "CourseOffering" CASCADE;
DROP TABLE IF EXISTS "CurriculumCourse" CASCADE;
DROP TABLE IF EXISTS "_CoursePrereq" CASCADE;  -- Prisma implicit M:N table
DROP TABLE IF EXISTS "Course" CASCADE;
DROP TABLE IF EXISTS "Curriculum" CASCADE;
DROP TABLE IF EXISTS "Term" CASCADE;
DROP TABLE IF EXISTS "Program" CASCADE;
DROP TABLE IF EXISTS "AdmissionApplication" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Announcement" CASCADE;
DROP TABLE IF EXISTS "AdmissionSettings" CASCADE;
DROP TABLE IF EXISTS "Admin" CASCADE;
DROP TABLE IF EXISTS "Teacher" CASCADE;
DROP TABLE IF EXISTS "Student" CASCADE;
DROP TABLE IF EXISTS "TrustedDevice" CASCADE;
DROP TABLE IF EXISTS "Department" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Optional: drop any _prisma_migrations records if you want a completely fresh start
TRUNCATE TABLE "_prisma_migrations" CASCADE;
