import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import {
  IGetRecruiterCompanyLogoUseCase,
  GetRecruiterCompanyLogoResult,
} from '../interface/get-recruiter-company-logo.use-case.interface';

@Injectable()
export class GetRecruiterCompanyLogoUseCase implements IGetRecruiterCompanyLogoUseCase {
  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(ICompanyRepository)
    private readonly companyRepository: ICompanyRepository,
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(userId: string): Promise<GetRecruiterCompanyLogoResult> {
    const profile = await this.recruiterProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    if (!profile.companyId) {
      throw new NotFoundException(
        'Company profile not configured for this recruiter',
      );
    }

    const company = await this.companyRepository.findById(profile.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.logoUrl || company.logoUrl.trim() === '') {
      throw new NotFoundException('No logo found for this company');
    }

    return this.fileStorageService.getFile(company.logoUrl);
  }
}
