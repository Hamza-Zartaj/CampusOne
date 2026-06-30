CREATE TYPE "QuizDeliveryMode" AS ENUM ('ONLINE', 'OFFLINE');

ALTER TABLE "Quiz"
ADD COLUMN "deliveryMode" "QuizDeliveryMode" NOT NULL DEFAULT 'ONLINE';
