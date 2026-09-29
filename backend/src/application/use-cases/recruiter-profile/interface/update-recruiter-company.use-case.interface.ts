import { UpdateCompanyInputDto } from '../../../dto/recruiter-profile/update-company-input.dto';
import { CompanyResponseDto } from '../../../dto/recruiter-profile/company-response.dto';

export interface IUpdateRecruiterCompanyUseCase {
  execute(
    userId: string,
    dto: UpdateCompanyInputDto,
  ): Promise<CompanyResponseDto>;
}

export const IUpdateRecruiterCompanyUseCase = Symbol(
  'IUpdateRecruiterCompanyUseCase',
);
