import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { CompanyResponseDto } from '../../../dto/recruiter-profile/company-response.dto';
import { CompanyMapper } from '../../../mappers/company.mapper';
import { IGetRecruiterCompanyUseCase } from '../interface/get-recruiter-company.use-case.interface';

@Injectable()
export class GetRecruiterCompanyUseCase implements IGetRecruiterCompanyUseCase {
  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(ICompanyRepository)
    private readonly companyRepository: ICompanyRepository,
  ) {}

  async execute(userId: string): Promise<CompanyResponseDto> {
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

    return CompanyMapper.toResponseDto(company);
  }
}
