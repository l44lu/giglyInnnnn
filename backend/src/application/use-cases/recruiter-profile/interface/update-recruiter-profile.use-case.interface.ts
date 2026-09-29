import { UpdateRecruiterProfileInputDto } from '../../../dto/recruiter-profile/update-recruiter-profile-input.dto';
import { RecruiterProfileResponseDto } from '../../../dto/recruiter-profile/recruiter-profile-response.dto';

export interface IUpdateRecruiterProfileUseCase {
  execute(
    userId: string,
    dto: UpdateRecruiterProfileInputDto,
  ): Promise<RecruiterProfileResponseDto>;
}

export const IUpdateRecruiterProfileUseCase = Symbol(
  'IUpdateRecruiterProfileUseCase',
);
