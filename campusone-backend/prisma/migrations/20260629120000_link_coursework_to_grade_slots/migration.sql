-- Link assignments and quizzes to numbered grade-component slots.
ALTER TABLE "Assignment" ADD COLUMN "componentIndex" INTEGER;
ALTER TABLE "Quiz" ADD COLUMN "componentIndex" INTEGER;

CREATE UNIQUE INDEX "Assignment_offeringId_componentIndex_key" ON "Assignment"("offeringId", "componentIndex");
CREATE UNIQUE INDEX "Quiz_offeringId_componentIndex_key" ON "Quiz"("offeringId", "componentIndex");
