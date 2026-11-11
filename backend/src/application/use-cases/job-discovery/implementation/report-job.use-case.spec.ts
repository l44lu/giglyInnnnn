import { ReportJobUseCase } from './report-job.use-case';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { IReportRepository } from '../../../../domain/repositories/report.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import {
  JobPostEntity,
  JobStatus,
} from '../../../../domain/entities/job-post.entity';
import { RecruiterProfileEntity } from '../../../../domain/entities/recruiter-profile.entity';
import {
  ReportEntity,
  ReportStatus,
} from '../../../../domain/entities/report.entity';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationConflictError,
} from '../../../errors/application.errors';

describe('ReportJobUseCase', () => {
  let useCase: ReportJobUseCase;
  let mockJobPostRepository: jest.Mocked<IJobPostRepository>;
  let mockRecruiterProfileRepository: jest.Mocked<IRecruiterProfileRepository>;
  let mockReportRepository: jest.Mocked<IReportRepository>;
  let mockFileStorageService: jest.Mocked<IFileStorageService>;

  const mockJob = new JobPostEntity({
    id: 'job-123',
    recruiterId: 'recruiter-profile-1',
    categoryId: 'cat-1',
    title: 'Warehouse Specialist',
    description: 'General warehouse duties',
    workType: 'local' as any,
    paymentStructure: 'hourly' as any,
    status: JobStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockClosedJob = new JobPostEntity({
    id: 'job-closed-456',
    recruiterId: 'recruiter-profile-1',
    categoryId: 'cat-1',
    title: 'Closed Warehouse Gig',
    description: 'Expired listing',
    workType: 'local' as any,
    paymentStructure: 'hourly' as any,
    status: JobStatus.CLOSED,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockRecruiterProfile = new RecruiterProfileEntity({
    id: 'recruiter-profile-1',
    userId: 'recruiter-user-uuid-999',
    roleTitle: 'Talent Acquisition Manager',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  ]);
  const validWebpBuffer = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.alloc(4),
    Buffer.from('WEBP'),
  ]);
  const validPdfBuffer = Buffer.from('%PDF-1.7 header and content here');

  beforeEach(() => {
    mockJobPostRepository = {
      findById: jest.fn(),
    } as any;

    mockRecruiterProfileRepository = {
      findById: jest.fn(),
    } as any;

    mockReportRepository = {
      findPendingByReporterAndJob: jest.fn(),
      create: jest.fn(),
    } as any;

    mockFileStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    } as any;

    useCase = new ReportJobUseCase(
      mockJobPostRepository,
      mockRecruiterProfileRepository,
      mockReportRepository,
      mockFileStorageService,
    );

    mockJobPostRepository.findById.mockResolvedValue(mockJob);
    mockRecruiterProfileRepository.findById.mockResolvedValue(
      mockRecruiterProfile,
    );
    mockReportRepository.findPendingByReporterAndJob.mockResolvedValue(null);
    mockReportRepository.create.mockImplementation(
      (data: Partial<ReportEntity>) => {
        return Promise.resolve(
          new ReportEntity({
            id: 'report-uuid-1',
            displayId: data.displayId ?? 'RPT-ABC12345',
            reporterId: data.reporterId!,
            reportedUserId: data.reportedUserId!,
            jobPostId: data.jobPostId!,
            reportType: data.reportType!,
            description: data.description!,
            evidenceFileUrl: data.evidenceFileUrl ?? null,
            status: ReportStatus.PENDING,
            adminNotes: 'internal administrative note',
            resolvedBy: 'admin-user-id',
            createdAt: new Date('2026-11-10T10:00:00Z'),
            updatedAt: new Date('2026-11-10T10:00:00Z'),
          }),
        );
      },
    );
    mockFileStorageService.uploadFile.mockResolvedValue({
      key: 'reports/evidence/abc.png',
      url: 'https://storage.gigly.com/reports/evidence/abc.png',
    });
  });

  describe('Successful Report Submission', () => {
    it('creates a report without evidence and returns public confirmation fields only', async () => {
      const result = await useCase.execute({
        reporterId: 'worker-user-1',
        jobPostId: 'job-123',
        description: 'Payment scam requesting upfront wire transfer.',
      });

      expect(mockJobPostRepository.findById).toHaveBeenCalledWith('job-123');
      expect(mockRecruiterProfileRepository.findById).toHaveBeenCalledWith(
        'recruiter-profile-1',
      );
      expect(
        mockReportRepository.findPendingByReporterAndJob,
      ).toHaveBeenCalledWith('worker-user-1', 'job-123');
      expect(mockFileStorageService.uploadFile).not.toHaveBeenCalled();

      expect(mockReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterId: 'worker-user-1',
          reportedUserId: 'recruiter-user-uuid-999',
          jobPostId: 'job-123',
          reportType: 'JOB_POST_ISSUE',
          description: 'Payment scam requesting upfront wire transfer.',
          evidenceFileUrl: null,
          status: ReportStatus.PENDING,
        }),
      );

      // Verify response structure excludes admin/private details
      expect(result).toEqual({
        id: 'report-uuid-1',
        displayId: expect.stringMatching(/^RPT-[A-F0-9]{8}$/),
        jobPostId: 'job-123',
        status: ReportStatus.PENDING,
        createdAt: new Date('2026-11-10T10:00:00Z'),
      });
      expect((result as any).adminNotes).toBeUndefined();
      expect((result as any).resolvedBy).toBeUndefined();
      expect((result as any).reportedUserId).toBeUndefined();
      expect((result as any).reporterId).toBeUndefined();
    });

    it('allows reporting a CLOSED job that was previously visible', async () => {
      mockJobPostRepository.findById.mockResolvedValue(mockClosedJob);

      const result = await useCase.execute({
        reporterId: 'worker-user-1',
        jobPostId: 'job-closed-456',
        description:
          'Job was closed immediately after requesting personal bank info.',
      });

      expect(result.id).toBe('report-uuid-1');
      expect(result.jobPostId).toBe('job-closed-456');
    });

    it('uploads valid JPEG evidence and persists report with evidence URL', async () => {
      const result = await useCase.execute({
        reporterId: 'worker-user-1',
        jobPostId: 'job-123',
        description: 'Screenshot of recruiter requesting off-platform contact.',
        evidenceFile: {
          buffer: validJpegBuffer,
          mimetype: 'image/jpeg',
          size: validJpegBuffer.length,
          originalname: 'chat.jpg',
        },
      });

      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith({
        key: expect.stringMatching(/^reports\/evidence\/[a-f0-9-]+\.jpg$/),
        buffer: validJpegBuffer,
        contentType: 'image/jpeg',
      });
      expect(result.id).toBe('report-uuid-1');
    });

    it('uploads valid PNG evidence', async () => {
      await useCase.execute({
        reporterId: 'worker-user-1',
        jobPostId: 'job-123',
        description: 'Screenshot of abusive message.',
        evidenceFile: {
          buffer: validPngBuffer,
          mimetype: 'image/png',
          size: validPngBuffer.length,
          originalname: 'screen.png',
        },
      });

      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith({
        key: expect.stringMatching(/^reports\/evidence\/[a-f0-9-]+\.png$/),
        buffer: validPngBuffer,
        contentType: 'image/png',
      });
    });

    it('uploads valid WebP evidence', async () => {
      await useCase.execute({
        reporterId: 'worker-user-1',
        jobPostId: 'job-123',
        description: 'Evidence image in webp format.',
        evidenceFile: {
          buffer: validWebpBuffer,
          mimetype: 'image/webp',
          size: validWebpBuffer.length,
          originalname: 'proof.webp',
        },
      });

      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith({
        key: expect.stringMatching(/^reports\/evidence\/[a-f0-9-]+\.webp$/),
        buffer: validWebpBuffer,
        contentType: 'image/webp',
      });
    });

    it('uploads valid PDF evidence', async () => {
      await useCase.execute({
        reporterId: 'worker-user-1',
        jobPostId: 'job-123',
        description: 'PDF document containing fake employment agreement.',
        evidenceFile: {
          buffer: validPdfBuffer,
          mimetype: 'application/pdf',
          size: validPdfBuffer.length,
          originalname: 'contract.pdf',
        },
      });

      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith({
        key: expect.stringMatching(/^reports\/evidence\/[a-f0-9-]+\.pdf$/),
        buffer: validPdfBuffer,
        contentType: 'application/pdf',
      });
    });
  });

  describe('Description and Input Validation', () => {
    it('throws ApplicationValidationError when description is empty', async () => {
      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: '',
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });

    it('throws ApplicationValidationError when description is whitespace only', async () => {
      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: '   \n \t  ',
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });

    it('throws ApplicationValidationError when description exceeds 500 characters', async () => {
      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'a'.repeat(501),
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });

    it('throws ApplicationValidationError when reporterId is missing', async () => {
      await expect(
        useCase.execute({
          reporterId: '',
          jobPostId: 'job-123',
          description: 'Valid description',
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });

    it('throws ApplicationValidationError when jobPostId is missing', async () => {
      await expect(
        useCase.execute({
          reporterId: 'worker-1',
          jobPostId: '',
          description: 'Valid description',
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });
  });

  describe('Target Job & Recruiter Resolution', () => {
    it('throws ApplicationNotFoundError when job does not exist', async () => {
      mockJobPostRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'non-existent-job',
          description: 'Reporting a job that does not exist',
        }),
      ).rejects.toThrow(ApplicationNotFoundError);
    });

    it('throws ApplicationNotFoundError when recruiter profile is missing or lacks userId', async () => {
      mockRecruiterProfileRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Reporting orphaned job',
        }),
      ).rejects.toThrow(ApplicationNotFoundError);
    });
  });

  describe('Duplicate Prevention', () => {
    it('throws ApplicationConflictError when worker already has a pending report for the job', async () => {
      mockReportRepository.findPendingByReporterAndJob.mockResolvedValue(
        new ReportEntity({
          id: 'existing-pending-report',
          displayId: 'RPT-OLD12345',
          reporterId: 'worker-user-1',
          reportedUserId: 'recruiter-user-uuid-999',
          jobPostId: 'job-123',
          reportType: 'JOB_POST_ISSUE',
          description: 'Previous pending report',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Submitting a duplicate report',
        }),
      ).rejects.toThrow(ApplicationConflictError);

      expect(mockReportRepository.create).not.toHaveBeenCalled();
    });

    it('verifies application pre-check aborts before uploading evidence to S3', async () => {
      mockReportRepository.findPendingByReporterAndJob.mockResolvedValue(
        new ReportEntity({
          id: 'existing-pending-report',
          displayId: 'RPT-OLD12345',
          reporterId: 'worker-user-1',
          reportedUserId: 'recruiter-user-uuid-999',
          jobPostId: 'job-123',
          reportType: 'JOB_POST_ISSUE',
          description: 'Previous pending report',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Submitting duplicate with evidence',
          evidenceFile: {
            buffer: validJpegBuffer,
            mimetype: 'image/jpeg',
            size: validJpegBuffer.length,
          },
        }),
      ).rejects.toThrow(ApplicationConflictError);

      expect(mockFileStorageService.uploadFile).not.toHaveBeenCalled();
      expect(mockReportRepository.create).not.toHaveBeenCalled();
    });

    it('translates repository ApplicationConflictError on concurrent race into ApplicationConflictError', async () => {
      mockReportRepository.create.mockRejectedValue(
        new ApplicationConflictError(
          'You already have a pending report for this job',
        ),
      );

      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Concurrent race report',
        }),
      ).rejects.toThrow(ApplicationConflictError);
    });
  });

  describe('Evidence File Validation & Security', () => {
    it('throws ApplicationValidationError when evidence file exceeds 5MB', async () => {
      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Evidence too large',
          evidenceFile: {
            buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
            mimetype: 'image/jpeg',
            size: 5 * 1024 * 1024 + 1,
          },
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });

    it('throws ApplicationValidationError when evidence file buffer is too small', async () => {
      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Truncated file',
          evidenceFile: {
            buffer: Buffer.from([0x01, 0x02]),
            mimetype: 'image/jpeg',
            size: 2,
          },
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });

    it('throws ApplicationValidationError when MIME type does not match magic bytes (spoofed file)', async () => {
      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Spoofed exe file with png extension',
          evidenceFile: {
            buffer: Buffer.from(
              'MZ\x90\x00\x03\x00\x00\x00This is an executable',
            ),
            mimetype: 'image/png',
            size: 30,
          },
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });

    it('throws ApplicationValidationError when valid PNG buffer is sent with application/pdf MIME', async () => {
      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'MIME mismatch',
          evidenceFile: {
            buffer: validPngBuffer,
            mimetype: 'application/pdf',
            size: validPngBuffer.length,
          },
        }),
      ).rejects.toThrow(ApplicationValidationError);
    });

    it('uses a random UUID storage key instead of client-provided filename', async () => {
      await useCase.execute({
        reporterId: 'worker-user-1',
        jobPostId: 'job-123',
        description: 'Path traversal attempt in filename',
        evidenceFile: {
          buffer: validJpegBuffer,
          mimetype: 'image/jpeg',
          size: validJpegBuffer.length,
          originalname: '../../../../etc/passwd',
        },
      });

      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringMatching(/^reports\/evidence\/[a-f0-9-]+\.jpg$/),
        }),
      );
      expect(mockFileStorageService.uploadFile).not.toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringContaining('passwd'),
        }),
      );
    });
  });

  describe('S3 Compensation Cleanup', () => {
    it('deletes uploaded S3 evidence when database creation fails', async () => {
      mockFileStorageService.uploadFile.mockResolvedValue({
        key: 'reports/evidence/target-to-cleanup.jpg',
        url: 'https://storage.gigly.com/reports/evidence/target-to-cleanup.jpg',
      });
      mockReportRepository.create.mockRejectedValue(new Error('DB failure'));

      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Valid report, but DB fails',
          evidenceFile: {
            buffer: validJpegBuffer,
            mimetype: 'image/jpeg',
            size: validJpegBuffer.length,
          },
        }),
      ).rejects.toThrow('DB failure');

      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(
        expect.stringMatching(/^reports\/evidence\/[a-f0-9-]+\.jpg$/),
      );
    });

    it('deletes uploaded S3 evidence when database throws ApplicationConflictError', async () => {
      mockFileStorageService.uploadFile.mockResolvedValue({
        key: 'reports/evidence/conflict-cleanup.jpg',
        url: 'https://storage.gigly.com/reports/evidence/conflict-cleanup.jpg',
      });
      mockReportRepository.create.mockRejectedValue(
        new ApplicationConflictError('Duplicate pending report'),
      );

      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Valid report, but race condition conflict in DB',
          evidenceFile: {
            buffer: validJpegBuffer,
            mimetype: 'image/jpeg',
            size: validJpegBuffer.length,
          },
        }),
      ).rejects.toThrow(ApplicationConflictError);

      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(
        expect.stringMatching(/^reports\/evidence\/[a-f0-9-]+\.jpg$/),
      );
    });

    it('does not mask the original conflict error when S3 cleanup deletion fails', async () => {
      mockFileStorageService.uploadFile.mockResolvedValue({
        key: 'reports/evidence/conflict-cleanup.jpg',
        url: 'https://storage.gigly.com/reports/evidence/conflict-cleanup.jpg',
      });
      mockReportRepository.create.mockRejectedValue(
        new ApplicationConflictError('Duplicate pending report'),
      );
      mockFileStorageService.deleteFile.mockRejectedValue(
        new Error('S3 AccessDenied during compensation delete'),
      );

      await expect(
        useCase.execute({
          reporterId: 'worker-user-1',
          jobPostId: 'job-123',
          description: 'Valid report, race conflict and S3 delete fails',
          evidenceFile: {
            buffer: validJpegBuffer,
            mimetype: 'image/jpeg',
            size: validJpegBuffer.length,
          },
        }),
      ).rejects.toThrow(ApplicationConflictError);

      expect(mockFileStorageService.deleteFile).toHaveBeenCalled();
    });
  });
});
