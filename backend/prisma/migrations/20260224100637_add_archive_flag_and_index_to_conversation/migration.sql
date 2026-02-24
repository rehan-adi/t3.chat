-- DropIndex
DROP INDEX "conversations_expires_at_idx";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "conversations_expires_at_is_archived_idx" ON "conversations"("expires_at", "is_archived");
