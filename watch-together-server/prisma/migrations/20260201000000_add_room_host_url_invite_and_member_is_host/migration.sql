-- AlterTable (IF NOT EXISTS for idempotency when columns were added manually or by prior run)
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "hostId" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "currentUrl" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "inviteLink" TEXT;

-- AlterTable
ALTER TABLE "RoomMember" ADD COLUMN IF NOT EXISTS "isHost" BOOLEAN NOT NULL DEFAULT false;
