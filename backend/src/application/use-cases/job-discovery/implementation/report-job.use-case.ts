import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { IReportRepository } from '../../../../domain/repositories/report.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import {
  ReportEntity,
  ReportStatus,
} from '../../../../domain/entities/report.entity';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationConflictError,
} from '../../../errors/application.errors';
import {
  IReportJobUseCase,
  ReportJobInput,
  EvidenceFileInput,
} from '../interface/report-job.use-case.interface';
import { ReportJobResponseDto } from '../../../dto/job-discovery/report-job-response.dto';

const MAX_EVIDENCE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface DetectedFileType {
  ext: 'jpg' | 'png' | 'webp' | 'pdf';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
}

@Injectable()
export class ReportJobUseCase implements IReportJobUseCase {
  private readonly logger = new Logger(ReportJobUseCase.name);

  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(IReportRepository)
    private readonly reportRepository: IReportRepository,
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(input: ReportJobInput): Promise<ReportJobResponseDto> {
    const { reporterId, jobPostId, description, evidenceFile } = input;

    // 1. Validate inputs
    if (
      !reporterId ||
      typeof reporterId !== 'string' ||
      reporterId.trim() === ''
    ) {
      throw new ApplicationValidationError('Reporter ID is required');
    }

    if (
      !jobPostId ||
      typeof jobPostId !== 'string' ||
      jobPostId.trim() === ''
    ) {
      throw new ApplicationValidationError('Job ID is required');
    }

    if (
      !description ||
      typeof description !== 'string' ||
      description.trim() === ''
    ) {
      throw new ApplicationValidationError(
        'Description is required and cannot be empty',
      );
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 500) {
      throw new ApplicationValidationError(
        'Description cannot exceed 500 characters',
      );
    }

    // 2. Validate optional evidence file
    let detectedEvidence: DetectedFileType | null = null;
    if (evidenceFile) {
      detectedEvidence = this.validateEvidenceFile(evidenceFile);
    }

    // 3. Find target job (regardless of whether it is OPEN or not)
    const job = await this.jobPostRepository.findById(jobPostId);
    if (!job) {
      throw new ApplicationNotFoundError(`Job with ID ${jobPostId} not found`);
    }

    // 4. Resolve recruiter's User.id
    const recruiterProfile = await this.recruiterProfileRepository.findById(
      job.recruiterId,
    );
    if (!recruiterProfile || !recruiterProfile.userId) {
      throw new ApplicationNotFoundError(
        `Recruiter profile for job ${jobPostId} not found`,
      );
    }
    const reportedUserId = recruiterProfile.userId;

    // 5. Check for existing pending report
    const existingPending =
      await this.reportRepository.findPendingByReporterAndJob(
        reporterId,
        jobPostId,
      );
    if (existingPending) {
      throw new ApplicationConflictError(
        'You already have a pending report for this job',
      );
    }

    // 6. Upload evidence if provided
    let evidenceStorageKey: string | null = null;
    let evidenceFileUrl: string | null = null;

    if (evidenceFile && detectedEvidence) {
      evidenceStorageKey = `reports/evidence/${randomUUID()}.${detectedEvidence.ext}`;
      const uploadResult = await this.fileStorageService.uploadFile({
        key: evidenceStorageKey,
        buffer: evidenceFile.buffer,
        contentType: detectedEvidence.contentType,
      });
      evidenceFileUrl = uploadResult.url;
    }

    // 7. Persist report with retry on displayId collision and compensation on failure
    let createdReport: ReportEntity | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !createdReport) {
      attempts++;
      const displayId = `RPT-${randomBytes(4).toString('hex').toUpperCase()}`;

      try {
        createdReport = await this.reportRepository.create({
          displayId,
          reporterId,
          reportedUserId,
          jobPostId,
          reportType: 'JOB_POST_ISSUE',
          description: trimmedDescription,
          evidenceFileUrl,
          status: ReportStatus.PENDING,
        });
      } catch (error) {
        // If unique constraint violation on pending report
        if (error instanceof ApplicationConflictError) {
          await this.compensateEvidenceCleanup(evidenceStorageKey);
          throw error;
        }

        // Check if displayId collision in Prisma
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target =
            (error.meta?.target as string[] | string | undefined) ?? [];
          const targetStr = Array.isArray(target)
            ? target.join(',')
            : String(target);
          if (targetStr.includes('displayId') && attempts < maxAttempts) {
            this.logger.warn(
              `Display ID collision on ${displayId}. Retrying attempt ${attempts + 1}...`,
            );
            continue;
          }
        }

        // For any other error, compensate by deleting the uploaded evidence file
        await this.compensateEvidenceCleanup(evidenceStorageKey);
        throw error;
      }
    }

    if (!createdReport) {
      await this.compensateEvidenceCleanup(evidenceStorageKey);
      throw new Error('Failed to generate a unique report display identifier');
    }

    // 8. Return public confirmation fields only
    return {
      id: createdReport.id,
      displayId: createdReport.displayId,
      jobPostId: createdReport.jobPostId!,
      status: createdReport.status,
      createdAt: createdReport.createdAt,
    };
  }

  private validateEvidenceFile(file: EvidenceFileInput): DetectedFileType {
    if (
      !file.buffer ||
      file.size > MAX_EVIDENCE_SIZE_BYTES ||
      file.buffer.length > MAX_EVIDENCE_SIZE_BYTES
    ) {
      throw new ApplicationValidationError(
        'Evidence file size exceeds the 5MB limit',
      );
    }

    if (file.buffer.length < 5) {
      throw new ApplicationValidationError(
        'Invalid file content: file is too small to be a valid evidence file',
      );
    }

    const detected = this.detectMagicBytes(file.buffer);
    if (!detected) {
      throw new ApplicationValidationError(
        'Invalid file content: file does not match allowed binary signatures (JPEG, PNG, WebP, PDF)',
      );
    }

    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (
      !allowedMimes.includes(file.mimetype) ||
      file.mimetype !== detected.contentType
    ) {
      throw new ApplicationValidationError(
        `File MIME type "${file.mimetype}" does not match binary file signature`,
      );
    }

    return detected;
  }

  private detectMagicBytes(buffer: Buffer): DetectedFileType | null {
    // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    ) {
      return { ext: 'pdf', contentType: 'application/pdf' };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { ext: 'jpg', contentType: 'image/jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { ext: 'png', contentType: 'image/png' };
    }

    // WebP: RIFF....WEBP
    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('binary') === 'RIFF' &&
      buffer.subarray(8, 12).toString('binary') === 'WEBP'
    ) {
      return { ext: 'webp', contentType: 'image/webp' };
    }

    return null;
  }

  private async compensateEvidenceCleanup(
    storageKey: string | null,
  ): Promise<void> {
    if (!storageKey) return;
    try {
      await this.fileStorageService.deleteFile(storageKey);
      this.logger.log(`Compensated evidence file deletion: ${storageKey}`);
    } catch (compensationError) {
      this.logger.error(
        `Compensation cleanup failed for key "${storageKey}": ${(compensationError as Error).message}`,
      );
    }
  }
}
