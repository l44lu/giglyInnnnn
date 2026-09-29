import { Injectable, Inject } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { UpdateRecruiterProfileInputDto } from '../../../dto/recruiter-profile/update-recruiter-profile-input.dto';
import { RecruiterProfileResponseDto } from '../../../dto/recruiter-profile/recruiter-profile-response.dto';
import { RecruiterProfileMapper } from '../../../mappers/recruiter-profile.mapper';
import { IUpdateRecruiterProfileUseCase } from '../interface/update-recruiter-profile.use-case.interface';

@Injectable()
export class UpdateRecruiterProfileUseCase implements IUpdateRecruiterProfileUseCase {
  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
  ) {}

  async execute(
    userId: string,
    dto: UpdateRecruiterProfileInputDto,
  ): Promise<RecruiterProfileResponseDto> {
    const updatedProfile = await this.recruiterProfileRepository.upsert(
      userId,
      {
        ...(dto.roleTitle !== undefined && { roleTitle: dto.roleTitle }),
        ...(dto.yearsExperience !== undefined && {
          yearsExperience: dto.yearsExperience,
        }),
      },
    );

    return RecruiterProfileMapper.toResponseDto(updatedProfile);
  }
}
