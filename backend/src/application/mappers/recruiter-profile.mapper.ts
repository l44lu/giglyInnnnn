import { RecruiterProfileEntity } from '../../domain/entities/recruiter-profile.entity';
import { RecruiterProfileResponseDto } from '../dto/recruiter-profile/recruiter-profile-response.dto';

export class RecruiterProfileMapper {
  static toResponseDto(
    profile: RecruiterProfileEntity,
  ): RecruiterProfileResponseDto {
    return new RecruiterProfileResponseDto({
      id: profile.id,
      userId: profile.userId,
      companyId: profile.companyId,
      roleTitle: profile.roleTitle,
      yearsExperience: profile.yearsExperience,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }
}
