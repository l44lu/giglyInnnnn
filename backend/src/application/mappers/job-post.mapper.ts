import { JobPostEntity } from '../../domain/entities/job-post.entity';
import { JobPostResponseDto } from '../dto/job-posting/job-post-response.dto';
import { JobCategoryMapper } from './job-category.mapper';
import { SkillMapper } from './skill.mapper';

export class JobPostMapper {
  static toResponseDto(jobPost: JobPostEntity): JobPostResponseDto {
    return new JobPostResponseDto({
      id: jobPost.id,
      recruiterId: jobPost.recruiterId,
      categoryId: jobPost.categoryId,
      title: jobPost.title,
      description: jobPost.description,
      workType: jobPost.workType,
      workersNeeded: jobPost.workersNeeded,
      startDate: jobPost.startDate,
      estimatedDuration: jobPost.estimatedDuration,
      shiftDuration: jobPost.shiftDuration,
      jobLocation: jobPost.jobLocation,
      jobLocationLat: jobPost.jobLocationLat,
      jobLocationLng: jobPost.jobLocationLng,
      paymentStructure: jobPost.paymentStructure,
      budgetAmount: jobPost.budgetAmount,
      hourlyRate:
        jobPost.hourlyRate ??
        jobPost.hourlyRateMin ??
        jobPost.hourlyRateMax ??
        null,
      hourlyRateMin: jobPost.hourlyRateMin,
      hourlyRateMax: jobPost.hourlyRateMax,
      status: jobPost.status,
      isBoosted: jobPost.isBoosted,
      boostExpiresAt: jobPost.boostExpiresAt,
      adminReviewStatus: jobPost.adminReviewStatus,
      adminNotes: jobPost.adminNotes,
      createdAt: jobPost.createdAt,
      updatedAt: jobPost.updatedAt,
      category: jobPost.category
        ? JobCategoryMapper.toJobCategoryResponseDto(jobPost.category)
        : undefined,
      skills: jobPost.skills
        ? jobPost.skills.map((skill) => SkillMapper.toSkillResponseDto(skill))
        : undefined,
    });
  }
}
