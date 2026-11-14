import * as fs from 'fs';
import * as path from 'path';
import { PrismaJobApplicationStatusHistoryRepository } from './prisma-job-application-status-history.repository';
import { PrismaService } from '../prisma/prisma.service';
import { JobApplicationStatus } from '../../domain/enums/job-application-status.enum';
import { JobApplicationReasonCode } from '../../domain/enums/job-application-reason-code.enum';

describe('PrismaJobApplicationStatusHistoryRepository', () => {
  let repository: PrismaJobApplicationStatusHistoryRepository;
  let mockPrisma: {
    jobApplicationStatusHistory: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const mockRecord = {
    id: 'hist-uuid-1',
    applicationId: 'app-uuid-1',
    fromStatus: null,
    toStatus: 'pending',
    reasonCode: 'application_submitted',
    reasonNote: null,
    changedByUserId: 'user-uuid-1',
    metadata: null,
    createdAt: new Date('2026-11-12T08:00:00.000Z'),
  };

  beforeEach(() => {
    mockPrisma = {
      jobApplicationStatusHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    repository = new PrismaJobApplicationStatusHistoryRepository(
      mockPrisma as unknown as PrismaService,
    );
  });

  it('appends a status history entry and maps fields to domain entity', async () => {
    mockPrisma.jobApplicationStatusHistory.create.mockResolvedValue(mockRecord);

    const result = await repository.append({
      applicationId: 'app-uuid-1',
      fromStatus: null,
      toStatus: JobApplicationStatus.PENDING,
      reasonCode: JobApplicationReasonCode.APPLICATION_SUBMITTED,
      changedByUserId: 'user-uuid-1',
    });

    expect(mockPrisma.jobApplicationStatusHistory.create).toHaveBeenCalledWith({
      data: {
        applicationId: 'app-uuid-1',
        fromStatus: null,
        toStatus: JobApplicationStatus.PENDING,
        reasonCode: 'application_submitted',
        reasonNote: null,
        changedByUserId: 'user-uuid-1',
      },
    });
    expect(result.id).toBe('hist-uuid-1');
    expect(result.applicationId).toBe('app-uuid-1');
    expect(result.fromStatus).toBeNull();
    expect(result.toStatus).toBe(JobApplicationStatus.PENDING);
    expect(result.reasonCode).toBe('application_submitted');
    expect(result.changedByUserId).toBe('user-uuid-1');
    expect(result.metadata).toBeNull();
  });

  it('retrieves history ordered chronologically by createdAt asc, id asc', async () => {
    const secondRecord = {
      id: 'hist-uuid-2',
      applicationId: 'app-uuid-1',
      fromStatus: 'pending',
      toStatus: 'shortlisted',
      reasonCode: 'recruiter_shortlisted',
      reasonNote: 'Strong portfolio',
      changedByUserId: 'recruiter-user-1',
      metadata: { stage: 1 },
      createdAt: new Date('2026-11-12T09:00:00.000Z'),
    };
    mockPrisma.jobApplicationStatusHistory.findMany.mockResolvedValue([
      mockRecord,
      secondRecord,
    ]);

    const history = await repository.findByApplicationId('app-uuid-1');

    expect(
      mockPrisma.jobApplicationStatusHistory.findMany,
    ).toHaveBeenCalledWith({
      where: { applicationId: 'app-uuid-1' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(history).toHaveLength(2);
    expect(history[0].fromStatus).toBeNull();
    expect(history[0].toStatus).toBe(JobApplicationStatus.PENDING);
    expect(history[1].fromStatus).toBe(JobApplicationStatus.PENDING);
    expect(history[1].toStatus).toBe(JobApplicationStatus.SHORTLISTED);
    expect(history[1].metadata).toEqual({ stage: 1 });
  });

  it('exposes no update or delete methods on the history repository (append-only)', () => {
    const repoRecord = repository as unknown as Record<string, unknown>;
    expect(typeof repoRecord.append).toBe('function');
    expect(typeof repoRecord.findByApplicationId).toBe('function');

    for (const forbiddenMethod of [
      'update',
      'updateMany',
      'upsert',
      'delete',
      'deleteMany',
    ]) {
      expect(repoRecord[forbiddenMethod]).toBeUndefined();
    }
  });
});

describe('JobApplicationStatusHistory Schema & Migration Contract', () => {
  const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
  const migrationPath = path.resolve(
    __dirname,
    '../../../prisma/migrations/20261112084500_add_job_application_status_history_and_indexes/migration.sql',
  );

  it('defines JobApplicationStatusHistory model, relations, restrictive delete, and required indexes in schema.prisma', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(schema).toContain('model JobApplicationStatusHistory');
    expect(schema).toContain(
      'application     JobApplication @relation(fields: [applicationId], references: [id], onDelete: Restrict)',
    );
    expect(schema).toContain(
      'changedBy       User?          @relation("JobApplicationStatusChanges", fields: [changedByUserId], references: [id], onDelete: SetNull)',
    );
    expect(schema).toContain('@@index([applicationId, createdAt])');
    expect(schema).toContain('@@index([jobPostId, status])');
    expect(schema).toContain('@@index([workerId, status])');
  });

  it('creates table, indexes, restrictive FK, and idempotent legacy_baseline backfill in migration SQL', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE "JobApplicationStatusHistory"');
    expect(sql).toContain(
      'CREATE INDEX "JobApplicationStatusHistory_applicationId_createdAt_idx" ON "JobApplicationStatusHistory"("applicationId", "createdAt")',
    );
    expect(sql).toContain(
      'CREATE INDEX "JobApplication_jobPostId_status_idx" ON "JobApplication"("jobPostId", "status")',
    );
    expect(sql).toContain(
      'CREATE INDEX "JobApplication_workerId_status_idx" ON "JobApplication"("workerId", "status")',
    );
    expect(sql).toContain(
      'ADD CONSTRAINT "JobApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
    );
    expect(sql).toContain(
      'ADD CONSTRAINT "JobApplicationStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE',
    );
    expect(sql).toContain('INSERT INTO "JobApplicationStatusHistory"');
    expect(sql).toContain('NULL AS "fromStatus"');
    expect(sql).toContain('ja."status" AS "toStatus"');
    expect(sql).toContain('\'legacy_baseline\' AS "reasonCode"');
    expect(sql).toContain(
      'COALESCE(ja."updatedAt", ja."appliedAt", CURRENT_TIMESTAMP) AS "createdAt"',
    );
    expect(sql).toContain('WHERE NOT EXISTS');
  });
});
