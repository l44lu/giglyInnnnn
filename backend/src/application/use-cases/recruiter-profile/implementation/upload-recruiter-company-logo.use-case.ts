import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import {
  IUploadRecruiterCompanyLogoUseCase,
  UploadRecruiterCompanyLogoInput,
  UploadRecruiterCompanyLogoResult,
} from '../interface/upload-recruiter-company-logo.use-case.interface';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

interface DetectedImageType {
  ext: 'jpg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

@Injectable()
export class UploadRecruiterCompanyLogoUseCase implements IUploadRecruiterCompanyLogoUseCase {
  private readonly logger = new Logger(UploadRecruiterCompanyLogoUseCase.name);

  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(ICompanyRepository)
    private readonly companyRepository: ICompanyRepository,
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(
    input: UploadRecruiterCompanyLogoInput,
  ): Promise<UploadRecruiterCompanyLogoResult> {
    const { userId, buffer, mimetype, size } = input;

    // 1. Find RecruiterProfile
    const profile = await this.recruiterProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    // 2. Verify company association
    if (!profile.companyId) {
      throw new NotFoundException(
        'Company profile not configured for this recruiter',
      );
    }

    // 3. Find Company
    const company = await this.companyRepository.findById(profile.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // 4. Validate size
    if (
      !buffer ||
      size > MAX_LOGO_SIZE_BYTES ||
      buffer.length > MAX_LOGO_SIZE_BYTES
    ) {
      throw new BadRequestException('File size exceeds the 2MB limit');
    }

    // 5. Validate MIME & magic bytes
    const detectedType = this.validateMagicBytes(buffer);
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (
      !allowedMimes.includes(mimetype) ||
      mimetype !== detectedType.contentType
    ) {
      throw new BadRequestException(
        `File MIME type "${mimetype}" does not match binary image signature`,
      );
    }

    const oldLogoKey = company.logoUrl;
    const newKey = `logos/company/${company.id}/${randomUUID()}.${detectedType.ext}`;

    // 6. Upload new logo to private S3
    await this.fileStorageService.uploadFile({
      key: newKey,
      buffer,
      contentType: detectedType.contentType,
    });

    // 7. Update company logoUrl in database with S3 compensation
    try {
      await this.companyRepository.update(company.id, {
        logoUrl: newKey,
      });
    } catch (dbError) {
      this.logger.error(
        `Database update failed for company ${company.id}. Compensating by deleting S3 object "${newKey}"`,
      );
      try {
        await this.fileStorageService.deleteFile(newKey);
      } catch (compensationError) {
        this.logger.error(
          `Compensation cleanup failed for key "${newKey}": ${(compensationError as Error).message}`,
        );
      }
      throw dbError;
    }

    // 8. Delete old logo object from S3 only after successful persistence
    if (oldLogoKey && oldLogoKey.trim() !== '') {
      try {
        await this.fileStorageService.deleteFile(oldLogoKey);
        this.logger.log(`Previous company logo deleted from S3: ${oldLogoKey}`);
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to delete old company logo "${oldLogoKey}" from S3: ${(cleanupError as Error).message}. Retaining database reference.`,
        );
      }
    }

    return {
      logoUrl: '/recruiter/company/logo',
    };
  }

  private validateMagicBytes(buffer: Buffer): DetectedImageType {
    if (buffer.length < 12) {
      throw new BadRequestException(
        'Invalid file content: file is too small to be a valid image',
      );
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { ext: 'jpg', contentType: 'image/jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
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
      buffer.subarray(0, 4).toString('binary') === 'RIFF' &&
      buffer.subarray(8, 12).toString('binary') === 'WEBP'
    ) {
      return { ext: 'webp', contentType: 'image/webp' };
    }

    throw new BadRequestException(
      'Invalid file content: image does not match allowed binary signatures (JPEG, PNG, WebP)',
    );
  }
}
