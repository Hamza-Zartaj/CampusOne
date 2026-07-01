ALTER TABLE "Course"
ADD COLUMN "expectedLectureCount" INTEGER;

CREATE TABLE "AttendancePolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "freeQuota" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "fineQuota" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "finePerAbsent" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "lateWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "excusedAbsenceReducesTotal" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AttendancePolicy" (
    "id",
    "freeQuota",
    "fineQuota",
    "finePerAbsent",
    "lateWeight",
    "excusedAbsenceReducesTotal",
    "updatedAt"
)
VALUES ('default', 4, 6, 500, 0.5, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
