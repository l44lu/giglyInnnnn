import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { ICompanyRepository } from '../../../../domain/repositories/company.repository.interface';
import { UpdateCompanyInputDto } from '../../../dto/recruiter-profile/update-company-input.dto';
import { CompanyResponseDto } from '../../../dto/recruiter-profile/company-response.dto';
import { CompanyMapper } from '../../../mappers/company.mapper';
import { IUpdateRecruiterCompanyUseCase } from '../interface/update-recruiter-company.use-case.interface';

@Injectable()
export class UpdateRecruiterCompanyUseCase implements IUpdateRecruiterCompanyUseCase {
  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
    @Inject(ICompanyRepository)
    private readonly companyRepository: ICompanyRepository,
  ) {}

  async execute(
    userId: string,
    dto: UpdateCompanyInputDto,
  ): Promise<CompanyResponseDto> {
    const profile = await this.recruiterProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    if (!profile.companyId) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new BadRequestException(
          'Company name is required to create a company profile',
        );
      }

      const createdCompany = await this.companyRepository.create({
        name: dto.name.trim(),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.companySize !== undefined && { companySize: dto.companySize }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.headquartersLocation !== undefined && {
          headquartersLocation: dto.headquartersLocation,
        }),
        ...(dto.about !== undefined && { about: dto.about }),
      });

      await this.recruiterProfileRepository.upsert(userId, {
        companyId: createdCompany.id,
      });

      return CompanyMapper.toResponseDto(createdCompany);
    }

    const existingCompany = await this.companyRepository.findById(
      profile.companyId,
    );

    if (!existingCompany) {
      throw new NotFoundException('Associated company not found');
    }

    if (dto.name !== undefined && dto.name.trim().length === 0) {
      throw new BadRequestException('Company name cannot be empty');
    }

    const updatedCompany = await this.companyRepository.update(
      profile.companyId,
      {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.companySize !== undefined && { companySize: dto.companySize }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.headquartersLocation !== undefined && {
          headquartersLocation: dto.headquartersLocation,
        }),
        ...(dto.about !== undefined && { about: dto.about }),
      },
    );

    return CompanyMapper.toResponseDto(updatedCompany);
  }
}
