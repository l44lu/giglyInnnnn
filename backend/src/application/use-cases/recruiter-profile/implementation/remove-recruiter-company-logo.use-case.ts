import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import {
  IRemoveRecruiterCompanyLogoUseCase,
  RemoveRecruiterCompanyLogoResult,
} from '../interface/remove-recruiter-company-logo.use-case.interface';

@Injectable()
export class RemoveRecruiterCompanyLogoUseCase implements IRemoveRecruiterCompanyLogoUseCase {
  private readonly logger = new Logger(RemoveRecruiterCompanyLogoUseCase.name);

  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(ICompanyRepository)
    private readonly companyRepository: ICompanyRepository,
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(userId: string): Promise<RemoveRecruiterCompanyLogoResult> {
    // 1. Retrieve recruiter profile
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

    // 3. Retrieve associated company
    const company = await this.companyRepository.findById(profile.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const oldLogoKey = company.logoUrl;

    // 4. If no logo exists, handle repeated removal safely and idempotently
    if (!oldLogoKey || oldLogoKey.trim() === '') {
      return { logoUrl: null };
    }

    // 5. Clear the nullable logo reference in the database FIRST
    await this.companyRepository.update(company.id, {
      logoUrl: null,
    });

    // 6. Only after the database update succeeds, attempt to delete previous S3 object
    try {
      await this.fileStorageService.deleteFile(oldLogoKey);
      this.logger.log(`Company logo deleted from S3: ${oldLogoKey}`);
    } catch (cleanupError) {
      // 7. If S3 deletion fails after database reference is cleared, log cleanup failure and do NOT restore reference
      this.logger.warn(
        `Failed to delete old company logo "${oldLogoKey}" from S3: ${(cleanupError as Error).message}. Retaining cleared database reference.`,
      );
    }

    return {
      logoUrl: null,
    };
  }
}
