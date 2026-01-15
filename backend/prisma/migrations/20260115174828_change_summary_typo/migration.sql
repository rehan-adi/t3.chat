/*
  Warnings:

  - You are about to drop the column `summery` on the `conversations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "summery",
ADD COLUMN     "summary" TEXT;
