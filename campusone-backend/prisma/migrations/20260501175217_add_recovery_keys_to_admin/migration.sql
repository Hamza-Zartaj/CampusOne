-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "recoveryKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
