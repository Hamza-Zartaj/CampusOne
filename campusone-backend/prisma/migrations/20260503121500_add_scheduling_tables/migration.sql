-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('LECTURE', 'LAB', 'SEMINAR');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateTable
CREATE TABLE "ScheduleConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lectureDurationMin" INTEGER NOT NULL DEFAULT 90,
    "breakDurationMin" INTEGER NOT NULL DEFAULT 15,
    "dayStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workingDays" JSONB NOT NULL DEFAULT '["MON","TUE","WED","THU","FRI","SAT"]',
    "regularLecturesPerDay" INTEGER NOT NULL DEFAULT 4,
    "maxTeacherLecturesPerDay" INTEGER NOT NULL DEFAULT 3,
    "defaultSessionsPerCourse" INTEGER NOT NULL DEFAULT 2,
    "dayOverrides" JSONB NOT NULL DEFAULT '{"FRI":{"lecturesPerDay":3,"jummahAfterSlot":2,"jummahMin":60}}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "type" "RoomType" NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "building" TEXT,
    "floor" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "termId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_type_isActive_idx" ON "Room"("type", "isActive");

-- CreateIndex
CREATE INDEX "Room_building_floor_idx" ON "Room"("building", "floor");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_offeringId_dayOfWeek_slotIndex_key" ON "ClassSession"("offeringId", "dayOfWeek", "slotIndex");

-- CreateIndex
CREATE INDEX "ClassSession_roomId_dayOfWeek_slotIndex_idx" ON "ClassSession"("roomId", "dayOfWeek", "slotIndex");

-- CreateIndex
CREATE INDEX "ClassSession_offeringId_idx" ON "ClassSession"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_name_key" ON "Holiday"("date", "name");

-- CreateIndex
CREATE INDEX "Holiday_termId_idx" ON "Holiday"("termId");

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;