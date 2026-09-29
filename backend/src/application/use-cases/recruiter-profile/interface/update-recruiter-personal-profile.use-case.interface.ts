import { UpdateRecruiterPersonalProfileInputDto } from '../../../dto/recruiter-profile/update-recruiter-personal-profile-input.dto';
import { UserResponseDto } from '../../../dto/user/user-response.dto';

export interface IUpdateRecruiterPersonalProfileUseCase {
  execute(
    userId: string,
    dto: UpdateRecruiterPersonalProfileInputDto,
  ): Promise<UserResponseDto>;
}

export const IUpdateRecruiterPersonalProfileUseCase = Symbol(
  'IUpdateRecruiterPersonalProfileUseCase',
);
