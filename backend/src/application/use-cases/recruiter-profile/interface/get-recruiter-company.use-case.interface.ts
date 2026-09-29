import { CompanyResponseDto } from '../../../dto/recruiter-profile/company-response.dto';

export interface IGetRecruiterCompanyUseCase {
  execute(userId: string): Promise<CompanyResponseDto>;
}

export const IGetRecruiterCompanyUseCase = Symbol(
  'IGetRecruiterCompanyUseCase',
);
