-- AlterTable: Rename columns in-place to preserve existing data
ALTER TABLE "RefreshToken" RENAME COLUMN "token" TO "tokenHash";
ALTER TABLE "RefreshToken" RENAME COLUMN "familyId" TO "sessionId";

-- AlterTable: Add nullable revokedReason column
ALTER TABLE "RefreshToken" ADD COLUMN "revokedReason" TEXT;

-- RenameIndex: Rename unique index on token to tokenHash
ALTER INDEX "RefreshToken_token_key" RENAME TO "RefreshToken_tokenHash_key";

-- RenameIndex: Rename index on familyId to sessionId
ALTER INDEX "RefreshToken_familyId_idx" RENAME TO "RefreshToken_sessionId_idx";

-- CreateIndex: Add index on userId
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex: Add index on expiresAt
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
