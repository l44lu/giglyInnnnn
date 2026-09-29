import { RecruiterProfileResponseDto } from '../../../dto/recruiter-profile/recruiter-profile-response.dto';

export interface IGetRecruiterProfileUseCase {
  execute(userId: string): Promise<RecruiterProfileResponseDto>;
}

export const IGetRecruiterProfileUseCase = Symbol(
  'IGetRecruiterProfileUseCase',
);
