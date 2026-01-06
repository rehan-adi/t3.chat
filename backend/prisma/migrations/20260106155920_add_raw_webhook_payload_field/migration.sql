/*
  Warnings:

  - The `paymentSessionId` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "rawWebhookPayload" JSONB,
DROP COLUMN "paymentSessionId",
ADD COLUMN     "paymentSessionId" TEXT;
