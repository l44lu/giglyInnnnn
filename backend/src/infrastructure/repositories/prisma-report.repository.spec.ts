import { Prisma } from '@prisma/client';
import { PrismaReportRepository } from './prisma-report.repository';
import { PrismaService } from '../prisma/prisma.service';
import { ReportStatus } from '../../domain/entities/report.entity';
import { ApplicationConflictError } from '../../application/errors/application.errors';

describe('PrismaReportRepository', () => {
  let repository: PrismaReportRepository;
  let mockPrisma: any;

  const mockDbReport = {
    id: 'report-uuid-1',
    displayId: 'RPT-12345678',
    reporterId: 'worker-user-1',
    reportedUserId: 'recruiter-user-1',
    jobPostId: 'job-post-1',
    reportType: 'JOB_POST_ISSUE',
    description: 'Suspicious job post',
    evidenceFileUrl: 'https://storage.gigly.com/reports/evidence/abc.png',
    status: 'pending',
    adminNotes: null,
    resolvedBy: null,
    createdAt: new Date('2026-11-10T10:00:00Z'),
    updatedAt: new Date('2026-11-10T10:00:00Z'),
  };

  beforeEach(() => {
    mockPrisma = {
      report: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    repository = new PrismaReportRepository(mockPrisma as PrismaService);
  });

  describe('create', () => {
    it('persists a report and maps to ReportEntity', async () => {
      mockPrisma.report.create.mockResolvedValue(mockDbReport);

      const result = await repository.create({
        id: 'report-uuid-1',
        displayId: 'RPT-12345678',
        reporterId: 'worker-user-1',
        reportedUserId: 'recruiter-user-1',
        jobPostId: 'job-post-1',
        reportType: 'JOB_POST_ISSUE',
        description: 'Suspicious job post',
        evidenceFileUrl: 'https://storage.gigly.com/reports/evidence/abc.png',
        status: ReportStatus.PENDING,
      });

      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: {
          id: 'report-uuid-1',
          displayId: 'RPT-12345678',
          reporterId: 'worker-user-1',
          reportedUserId: 'recruiter-user-1',
          jobPostId: 'job-post-1',
          reportType: 'JOB_POST_ISSUE',
          description: 'Suspicious job post',
          evidenceFileUrl: 'https://storage.gigly.com/reports/evidence/abc.png',
          status: ReportStatus.PENDING,
          adminNotes: null,
          resolvedBy: null,
        },
      });

      expect(result.id).toBe('report-uuid-1');
      expect(result.displayId).toBe('RPT-12345678');
      expect(result.status).toBe(ReportStatus.PENDING);
    });

    it('translates P2002 unique constraint violation on reporter and job to ApplicationConflictError', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the constraint: Report_reporterId_jobPostId_pending_key',
        {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['reporterId', 'jobPostId'] },
        },
      );
      mockPrisma.report.create.mockRejectedValue(p2002Error);

      await expect(
        repository.create({
          displayId: 'RPT-12345678',
          reporterId: 'worker-user-1',
          reportedUserId: 'recruiter-user-1',
          jobPostId: 'job-post-1',
          reportType: 'JOB_POST_ISSUE',
          description: 'Suspicious job post',
        }),
      ).rejects.toThrow(ApplicationConflictError);
    });

    it('rethrows P2002 when target is displayId (does not translate to ApplicationConflictError)', async () => {
      const p2002DisplayIdError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`displayId`)',
        {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['displayId'] },
        },
      );
      mockPrisma.report.create.mockRejectedValue(p2002DisplayIdError);

      await expect(
        repository.create({
          displayId: 'RPT-12345678',
          reporterId: 'worker-user-1',
          reportedUserId: 'recruiter-user-1',
          jobPostId: 'job-post-1',
          reportType: 'JOB_POST_ISSUE',
          description: 'Suspicious job post',
        }),
      ).rejects.toThrow(p2002DisplayIdError);
    });

    it('rethrows non-P2002 Prisma error (e.g. P2003 foreign key violation) without translating to conflict', async () => {
      const p2003Error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: (`jobPostId`)',
        {
          code: 'P2003',
          clientVersion: '6.19.3',
        },
      );
      mockPrisma.report.create.mockRejectedValue(p2003Error);

      await expect(
        repository.create({
          displayId: 'RPT-12345678',
          reporterId: 'worker-user-1',
          reportedUserId: 'recruiter-user-1',
          jobPostId: 'job-post-1',
          reportType: 'JOB_POST_ISSUE',
          description: 'Suspicious job post',
        }),
      ).rejects.toThrow(p2003Error);
    });

    it('rethrows unexpected error', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.report.create.mockRejectedValue(dbError);

      await expect(
        repository.create({
          displayId: 'RPT-12345678',
          reporterId: 'worker-user-1',
          reportedUserId: 'recruiter-user-1',
          jobPostId: 'job-post-1',
          reportType: 'JOB_POST_ISSUE',
          description: 'Suspicious job post',
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('findPendingByReporterAndJob', () => {
    it('returns domain entity when pending report is found', async () => {
      mockPrisma.report.findFirst.mockResolvedValue(mockDbReport);

      const result = await repository.findPendingByReporterAndJob(
        'worker-user-1',
        'job-post-1',
      );

      expect(mockPrisma.report.findFirst).toHaveBeenCalledWith({
        where: {
          reporterId: 'worker-user-1',
          jobPostId: 'job-post-1',
          status: ReportStatus.PENDING,
        },
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe('report-uuid-1');
      expect(result?.displayId).toBe('RPT-12345678');
      expect(result?.status).toBe(ReportStatus.PENDING);
    });

    it('returns null when no pending report is found', async () => {
      mockPrisma.report.findFirst.mockResolvedValue(null);

      const result = await repository.findPendingByReporterAndJob(
        'worker-user-1',
        'job-post-1',
      );

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns domain entity when found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(mockDbReport);

      const result = await repository.findById('report-uuid-1');

      expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-uuid-1' },
      });
      expect(result?.id).toBe('report-uuid-1');
    });

    it('returns null when not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });
});
