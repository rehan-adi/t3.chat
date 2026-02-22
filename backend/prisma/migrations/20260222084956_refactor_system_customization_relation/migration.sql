/*
  Warnings:

  - You are about to drop the column `user_id` on the `system_customizations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[profile_id]` on the table `system_customizations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `profile_id` to the `system_customizations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "system_customizations" DROP CONSTRAINT "system_customizations_user_id_fkey";

-- DropIndex
DROP INDEX "system_customizations_user_id_key";

-- AlterTable
ALTER TABLE "system_customizations" DROP COLUMN "user_id",
ADD COLUMN     "profile_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "system_customizations_profile_id_key" ON "system_customizations"("profile_id");

-- AddForeignKey
ALTER TABLE "system_customizations" ADD CONSTRAINT "system_customizations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
