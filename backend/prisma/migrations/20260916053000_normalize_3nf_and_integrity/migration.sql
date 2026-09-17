-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_jobPostId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "jobPostId";

-- AlterTable
ALTER TABLE "WorkerProfile" DROP COLUMN "memberSince";

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobPostId_workerId_key" ON "JobApplication"("jobPostId", "workerId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_reviewerId_revieweeId_jobPostId_key" ON "Review"("reviewerId", "revieweeId", "jobPostId");
