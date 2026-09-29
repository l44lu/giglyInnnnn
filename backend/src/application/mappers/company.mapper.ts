import { CompanyEntity } from '../../domain/entities/company.entity';
import { CompanyResponseDto } from '../dto/recruiter-profile/company-response.dto';

export class CompanyMapper {
  static toResponseDto(company: CompanyEntity): CompanyResponseDto {
    return new CompanyResponseDto({
      id: company.id,
      name: company.name,
      industry: company.industry,
      companySize: company.companySize,
      website: company.website,
      headquartersLocation: company.headquartersLocation,
      about: company.about,
      logoUrl: company.logoUrl,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    });
  }
}
