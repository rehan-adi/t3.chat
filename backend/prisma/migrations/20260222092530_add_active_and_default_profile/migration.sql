-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_profile_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_profile_id_fkey" FOREIGN KEY ("active_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
