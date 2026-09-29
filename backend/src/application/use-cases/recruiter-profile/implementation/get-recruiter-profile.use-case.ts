import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IRecruiterProfileRepository } from '../../../../domain/repositories/recruiter-profile.repository.interface';
import { RecruiterProfileResponseDto } from '../../../dto/recruiter-profile/recruiter-profile-response.dto';
import { RecruiterProfileMapper } from '../../../mappers/recruiter-profile.mapper';
import { IGetRecruiterProfileUseCase } from '../interface/get-recruiter-profile.use-case.interface';

@Injectable()
export class GetRecruiterProfileUseCase implements IGetRecruiterProfileUseCase {
  constructor(
    @Inject(IRecruiterProfileRepository)
    private readonly recruiterProfileRepository: IRecruiterProfileRepository,
  ) {}

  async execute(userId: string): Promise<RecruiterProfileResponseDto> {
    const profile = await this.recruiterProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    return RecruiterProfileMapper.toResponseDto(profile);
  }
}
