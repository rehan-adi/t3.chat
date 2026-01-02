-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastDailyReset" TIMESTAMP(3),
ADD COLUMN     "lastResetMonth" TIMESTAMP(3);
