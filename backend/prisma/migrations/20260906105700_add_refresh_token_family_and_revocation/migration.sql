-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN "familyId" TEXT NOT NULL,
ADD COLUMN "revokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
