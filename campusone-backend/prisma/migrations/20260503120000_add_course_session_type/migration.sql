-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('LECTURE', 'LAB', 'PROJECT');

-- AlterTable
ALTER TABLE "Course"
ADD COLUMN "sessionType" "SessionType" NOT NULL DEFAULT 'LECTURE';