-- CreateTable: Append-only status transition history for job applications
CREATE TABLE "JobApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonNote" TEXT,
    "changedByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplicationStatusHistory_applicationId_createdAt_idx" ON "JobApplicationStatusHistory"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_jobPostId_status_idx" ON "JobApplication"("jobPostId", "status");

-- CreateIndex
CREATE INDEX "JobApplication_workerId_status_idx" ON "JobApplication"("workerId", "status");

-- AddForeignKey (Restrict prevents deleting a JobApplication if history exists)
ALTER TABLE "JobApplicationStatusHistory" ADD CONSTRAINT "JobApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationStatusHistory" ADD CONSTRAINT "JobApplicationStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill baseline history entries for pre-existing JobApplication records.
-- Baseline timestamp choice: uses ja."updatedAt" (falling back to ja."appliedAt" / CURRENT_TIMESTAMP)
-- because updatedAt is the latest known persisted state timestamp for each legacy application
-- and guarantees baseline entries sort before any post-migration Feature 4 transitions
-- without fabricating historical intermediate transitions.
INSERT INTO "JobApplicationStatusHistory" (
    "id",
    "applicationId",
    "fromStatus",
    "toStatus",
    "reasonCode",
    "reasonNote",
    "changedByUserId",
    "metadata",
    "createdAt"
)
SELECT
    gen_random_uuid()::text AS "id",
    ja."id" AS "applicationId",
    NULL AS "fromStatus",
    ja."status" AS "toStatus",
    'legacy_baseline' AS "reasonCode",
    'Baseline snapshot of existing application status created during migration' AS "reasonNote",
    NULL AS "changedByUserId",
    NULL AS "metadata",
    COALESCE(ja."updatedAt", ja."appliedAt", CURRENT_TIMESTAMP) AS "createdAt"
FROM "JobApplication" ja
WHERE NOT EXISTS (
    SELECT 1
    FROM "JobApplicationStatusHistory" h
    WHERE h."applicationId" = ja."id"
);
