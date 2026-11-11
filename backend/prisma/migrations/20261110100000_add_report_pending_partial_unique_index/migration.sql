-- CreateIndex: Partial unique index to enforce one pending report per reporter per job post
CREATE UNIQUE INDEX "Report_reporterId_jobPostId_pending_key"
ON "Report"("reporterId", "jobPostId")
WHERE "status" = 'pending' AND "jobPostId" IS NOT NULL;

