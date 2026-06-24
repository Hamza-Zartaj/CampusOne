-- Add a stable identity for each generated fine unit so concurrent
-- leave/attendance re-evaluations cannot create duplicate charges.
ALTER TABLE "Fine" ADD COLUMN "quotaUnit" INTEGER;

-- Preserve existing rows by assigning a deterministic unit number within
-- each student/offering group before the unique index is created.
WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "studentId", "offeringId"
            ORDER BY "createdAt", "id"
        ) AS unit
    FROM "Fine"
)
UPDATE "Fine" AS fine
SET "quotaUnit" = ranked.unit
FROM ranked
WHERE fine."id" = ranked."id";

CREATE UNIQUE INDEX "Fine_studentId_offeringId_quotaUnit_key"
ON "Fine"("studentId", "offeringId", "quotaUnit");
