-- Preserve course-scoped announcement history while enforcing referential integrity.
UPDATE "Announcement" AS announcement
SET "offeringId" = NULL
WHERE "offeringId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "CourseOffering" AS offering
    WHERE offering."id" = announcement."offeringId"
  );

ALTER TABLE "Announcement"
ADD CONSTRAINT "Announcement_offeringId_fkey"
FOREIGN KEY ("offeringId")
REFERENCES "CourseOffering"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- These casts intentionally fail if existing strings are not real calendar dates.
ALTER TABLE "Attendance"
ALTER COLUMN "date" TYPE DATE
USING "date"::date;

ALTER TABLE "LeaveApplication"
ALTER COLUMN "fromDate" TYPE DATE
USING "fromDate"::date;

ALTER TABLE "LeaveApplication"
ALTER COLUMN "toDate" TYPE DATE
USING "toDate"::date;

ALTER TABLE "LeaveApplication"
ADD CONSTRAINT "LeaveApplication_date_range_check"
CHECK ("fromDate" <= "toDate");

ALTER TABLE "TAAssignment"
ALTER COLUMN "reviewNotes" TYPE VARCHAR(1000);
