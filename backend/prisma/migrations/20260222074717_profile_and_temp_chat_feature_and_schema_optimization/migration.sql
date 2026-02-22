/*
  Warnings:

  - You are about to drop the column `createdAt` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `pinned` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `conversationId` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `modelName` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `open_router_api_key` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `open_router_api_key` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `open_router_api_key` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentEventTime` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentSessionId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `rawWebhookPayload` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `system_customizations` table. All the data in the column will be lost.
  - You are about to drop the column `systemBio` on the `system_customizations` table. All the data in the column will be lost.
  - You are about to drop the column `systemName` on the `system_customizations` table. All the data in the column will be lost.
  - You are about to drop the column `systemPrompt` on the `system_customizations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `system_customizations` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `system_customizations` table. All the data in the column will be lost.
  - You are about to drop the column `byokEnable` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isEmailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isPremium` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isbillingPreferencesEnable` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastDailyReset` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastResetMonth` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profilePicture` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `open_router_api_key` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `system_customizations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `profile_id` to the `conversations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `conversations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conversation_id` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `open_router_api_key` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `open_router_api_key` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_id` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `system_prompt` to the `system_customizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `system_customizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `system_customizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_userId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "open_router_api_key" DROP CONSTRAINT "open_router_api_key_userId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_fkey";

-- DropForeignKey
ALTER TABLE "system_customizations" DROP CONSTRAINT "system_customizations_userId_fkey";

-- DropIndex
DROP INDEX "conversations_userId_idx";

-- DropIndex
DROP INDEX "messages_conversationId_idx";

-- DropIndex
DROP INDEX "open_router_api_key_userId_key";

-- DropIndex
DROP INDEX "payments_orderId_key";

-- DropIndex
DROP INDEX "payments_userId_idx";

-- DropIndex
DROP INDEX "system_customizations_userId_key";

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "createdAt",
DROP COLUMN "pinned",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_temporary_chat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profile_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "conversationId",
DROP COLUMN "createdAt",
DROP COLUMN "modelName",
ADD COLUMN     "conversation_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "model_name" TEXT;

-- AlterTable
ALTER TABLE "open_router_api_key" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "createdAt",
DROP COLUMN "orderId",
DROP COLUMN "paymentEventTime",
DROP COLUMN "paymentId",
DROP COLUMN "paymentSessionId",
DROP COLUMN "rawWebhookPayload",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "order_id" TEXT NOT NULL,
ADD COLUMN     "payment_event_time" TIMESTAMP(3),
ADD COLUMN     "payment_id" TEXT,
ADD COLUMN     "payment_session_id" TEXT,
ADD COLUMN     "raw_webhook_payload" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "system_customizations" DROP COLUMN "createdAt",
DROP COLUMN "systemBio",
DROP COLUMN "systemName",
DROP COLUMN "systemPrompt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "system_bio" TEXT,
ADD COLUMN     "system_name" TEXT,
ADD COLUMN     "system_prompt" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "byokEnable",
DROP COLUMN "createdAt",
DROP COLUMN "isEmailVerified",
DROP COLUMN "isPremium",
DROP COLUMN "isbillingPreferencesEnable",
DROP COLUMN "lastDailyReset",
DROP COLUMN "lastResetMonth",
DROP COLUMN "profilePicture",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_billing_preferences_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_byok_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_premium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_daily_reset" TIMESTAMP(3),
ADD COLUMN     "last_monthly_reset" TIMESTAMP(3),
ADD COLUMN     "profile_picture" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "profile_name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_profile_name_key" ON "profiles"("user_id", "profile_name");

-- CreateIndex
CREATE INDEX "conversations_expires_at_idx" ON "conversations"("expires_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "open_router_api_key_user_id_key" ON "open_router_api_key"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_customizations_user_id_key" ON "system_customizations"("user_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_customizations" ADD CONSTRAINT "system_customizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_router_api_key" ADD CONSTRAINT "open_router_api_key_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
