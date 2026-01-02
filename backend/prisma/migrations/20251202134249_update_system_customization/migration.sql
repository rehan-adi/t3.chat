/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `SystemCustomization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isbillingPreferencesEnable" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "SystemCustomization_userId_key" ON "SystemCustomization"("userId");
