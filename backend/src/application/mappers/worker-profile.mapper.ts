import { WorkerProfileEntity } from '../../domain/entities/worker-profile.entity';
import { WorkerProfileResponseDto } from '../dto/worker-profile/worker-profile-response.dto';

export class WorkerProfileMapper {
  static toResponseDto(profile: WorkerProfileEntity): WorkerProfileResponseDto {
    return new WorkerProfileResponseDto({
      id: profile.id,
      userId: profile.userId,
      headline: profile.headline,
      yearsExperience: profile.yearsExperience,
      responseTimeHours: profile.responseTimeHours,
      availabilityStatus: profile.availabilityStatus,
      isOpenToWork: profile.isOpenToWork,
      totalCompletedGigs: profile.totalCompletedGigs,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }
}
