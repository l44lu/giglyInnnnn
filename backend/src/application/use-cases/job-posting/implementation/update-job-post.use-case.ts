import { Injectable, Inject } from '@nestjs/common';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
  ApplicationConflictError,
} from '../../../errors/application.errors';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { IJobCategoryRepository } from '../../../../domain/repositories/job-category.repository.interface';
import { ISkillRepository } from '../../../../domain/repositories/skill.repository.interface';
import { IJobApplicationRepository } from '../../../../domain/repositories/job-application.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { UpdateJobPostInputDto } from '../../../dto/job-posting/update-job-post-input.dto';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';
import { JobPostMapper } from '../../../mappers/job-post.mapper';
import { IUpdateJobPostUseCase } from '../interface/update-job-post.use-case.interface';

@Injectable()
export class UpdateJobPostUseCase implements IUpdateJobPostUseCase {
  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
    @Inject(IJobCategoryRepository)
    private readonly jobCategoryRepository: IJobCategoryRepository,
    @Inject(ISkillRepository)
    private readonly skillRepository: ISkillRepository,
    @Inject(IJobApplicationRepository)
    private readonly jobApplicationRepository: IJobApplicationRepository,
  ) {}

  async execute(
    jobPostId: string,
    recruiterId: string,
    dto: UpdateJobPostInputDto,
  ): Promise<JobPostResponseDto> {
    // 1. Validate caller and resource IDs
    if (!jobPostId || jobPostId.trim().length === 0) {
      throw new ApplicationValidationError('Job post ID is required');
    }

    if (!recruiterId || recruiterId.trim().length === 0) {
      throw new ApplicationValidationError('Recruiter profile ID is required');
    }

    if (!dto) {
      throw new ApplicationValidationError(
        'Job post update details are required',
      );
    }

    const trimmedJobId = jobPostId.trim();
    const trimmedRecruiterId = recruiterId.trim();

    // 2. Retrieve existing job post with relations
    const existingJobPost =
      await this.jobPostRepository.findByIdWithSkills(trimmedJobId);

    // 3. Throw ApplicationNotFoundError if it does not exist
    if (!existingJobPost) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    // 4. Verify recruiter ownership
    // 5. Throw ApplicationAuthorizationError if ownership does not match
    if (existingJobPost.recruiterId !== trimmedRecruiterId) {
      throw new ApplicationAuthorizationError(
        'You do not have permission to edit this job post',
      );
    }

    // 6 & 7. Enforce status lifecycle restrictions
    if (
      existingJobPost.status === JobStatus.FILLED ||
      existingJobPost.status === JobStatus.COMPLETED ||
      existingJobPost.status === JobStatus.CANCELLED
    ) {
      throw new ApplicationValidationError(
        `Cannot edit job post with status: ${existingJobPost.status}`,
      );
    }

    if (
      existingJobPost.status !== JobStatus.DRAFT &&
      existingJobPost.status !== JobStatus.OPEN &&
      existingJobPost.status !== JobStatus.PAUSED
    ) {
      throw new ApplicationValidationError(
        `Cannot edit job post with status: ${String(existingJobPost.status)}`,
      );
    }

    // 8. Validate basic required fields
    if (!dto.categoryId || dto.categoryId.trim().length === 0) {
      throw new ApplicationValidationError('Category ID is required');
    }

    if (!dto.title || dto.title.trim().length === 0) {
      throw new ApplicationValidationError('Job title cannot be empty');
    }

    if (!dto.description || dto.description.trim().length === 0) {
      throw new ApplicationValidationError('Job description cannot be empty');
    }

    if (!dto.workType || !Object.values(WorkType).includes(dto.workType)) {
      throw new ApplicationValidationError('Valid work type is required');
    }

    if (
      !dto.paymentStructure ||
      !Object.values(PaymentStructure).includes(dto.paymentStructure)
    ) {
      throw new ApplicationValidationError(
        'Valid payment structure is required',
      );
    }

    if (dto.workersNeeded !== undefined) {
      if (
        dto.workersNeeded === null ||
        typeof dto.workersNeeded !== 'number' ||
        !Number.isInteger(dto.workersNeeded) ||
        dto.workersNeeded <= 0
      ) {
        throw new ApplicationValidationError(
          'workersNeeded must be a positive integer',
        );
      }
    }

    const isPublishedJob =
      existingJobPost.status === JobStatus.OPEN ||
      existingJobPost.status === JobStatus.PAUSED;

    if (
      dto.workType === WorkType.LOCAL &&
      isPublishedJob &&
      (!dto.jobLocation || dto.jobLocation.trim().length === 0)
    ) {
      throw new ApplicationValidationError(
        'Job location is required for on-site/local jobs',
      );
    }

    let parsedStartDate: Date | null = null;
    if (dto.startDate !== undefined && dto.startDate !== null) {
      const d = new Date(dto.startDate);
      if (isNaN(d.getTime())) {
        throw new ApplicationValidationError('startDate must be a valid date');
      }
      parsedStartDate = d;
    }

    // 9. Validate payment structure and fields based on existing Feature 1 rules
    if (dto.paymentStructure === PaymentStructure.FIXED) {
      if (dto.hourlyRate !== undefined && dto.hourlyRate !== null) {
        throw new ApplicationValidationError(
          'hourlyRate is not allowed for fixed price jobs',
        );
      }
      if (isPublishedJob) {
        if (
          dto.budgetAmount === undefined ||
          dto.budgetAmount === null ||
          typeof dto.budgetAmount !== 'number' ||
          dto.budgetAmount <= 0
        ) {
          throw new ApplicationValidationError(
            'Budget amount must be a positive number for fixed price jobs',
          );
        }
      } else {
        if (dto.budgetAmount !== undefined && dto.budgetAmount !== null) {
          if (typeof dto.budgetAmount !== 'number' || dto.budgetAmount < 0) {
            throw new ApplicationValidationError(
              'budgetAmount must be a non-negative number',
            );
          }
        }
      }
    } else if (dto.paymentStructure === PaymentStructure.HOURLY) {
      if (dto.budgetAmount !== undefined && dto.budgetAmount !== null) {
        throw new ApplicationValidationError(
          'budgetAmount is not allowed for hourly jobs',
        );
      }
      if (isPublishedJob) {
        if (
          dto.hourlyRate === undefined ||
          dto.hourlyRate === null ||
          typeof dto.hourlyRate !== 'number' ||
          dto.hourlyRate <= 0
        ) {
          throw new ApplicationValidationError(
            'Hourly rate must be greater than zero for hourly jobs',
          );
        }
      } else {
        if (dto.hourlyRate !== undefined && dto.hourlyRate !== null) {
          if (typeof dto.hourlyRate !== 'number' || dto.hourlyRate <= 0) {
            throw new ApplicationValidationError(
              'hourlyRate must be greater than zero',
            );
          }
        }
      }
    }

    // 10. Validate that category exists
    const category = await this.jobCategoryRepository.findById(
      dto.categoryId.trim(),
    );
    if (!category) {
      throw new ApplicationNotFoundError('Job category not found');
    }

    // 11. Validate selected skills
    const skillIds = dto.skillIds ?? [];
    if (skillIds.length > 0) {
      const uniqueIds = new Set(skillIds);
      if (uniqueIds.size !== skillIds.length) {
        throw new ApplicationValidationError(
          'Duplicate skill IDs are not allowed',
        );
      }

      const existingSkills = await this.skillRepository.findByIds(skillIds);
      if (existingSkills.length !== skillIds.length) {
        const foundIds = new Set(existingSkills.map((s) => s.id));
        const missingIds = skillIds.filter((id) => !foundIds.has(id));
        throw new ApplicationValidationError(
          `One or more selected skills do not exist: ${missingIds.join(', ')}`,
        );
      }
    }

    // 11.5 Guard workersNeeded reductions against accepted applications
    const targetWorkersNeeded =
      dto.workersNeeded !== undefined
        ? dto.workersNeeded
        : existingJobPost.workersNeeded;

    if (targetWorkersNeeded < existingJobPost.workersNeeded) {
      const applicationsSummary =
        await this.jobApplicationRepository.findByJobPostId({
          jobPostId: trimmedJobId,
          page: 1,
          limit: 1,
        });

      if (!applicationsSummary) {
        throw new ApplicationNotFoundError('Job post not found');
      }

      const acceptedCount = applicationsSummary.summary.accepted;
      if (targetWorkersNeeded < acceptedCount) {
        throw new ApplicationConflictError(
          `Cannot reduce workersNeeded to ${targetWorkersNeeded} because ${acceptedCount} application${acceptedCount === 1 ? ' has' : 's have'} already been accepted`,
        );
      }
    }

    // 12. Assemble update data without accepting protected fields from client
    const updateData: Partial<JobPostEntity> = {
      categoryId: dto.categoryId.trim(),
      title: dto.title.trim(),
      description: dto.description.trim(),
      workType: dto.workType,
      workersNeeded: targetWorkersNeeded,
      startDate: parsedStartDate,
      estimatedDuration: dto.estimatedDuration ?? null,
      shiftDuration: dto.shiftDuration ?? null,
      jobLocation:
        dto.workType === WorkType.LOCAL && dto.jobLocation
          ? dto.jobLocation.trim()
          : null,
      jobLocationLat: dto.jobLocationLat ?? null,
      jobLocationLng: dto.jobLocationLng ?? null,
      paymentStructure: dto.paymentStructure,
      budgetAmount:
        dto.paymentStructure === PaymentStructure.FIXED
          ? (dto.budgetAmount ?? null)
          : null,
      hourlyRate:
        dto.paymentStructure === PaymentStructure.HOURLY
          ? (dto.hourlyRate ?? null)
          : null,
      hourlyRateMin:
        dto.paymentStructure === PaymentStructure.HOURLY
          ? (dto.hourlyRate ?? null)
          : null,
      hourlyRateMax:
        dto.paymentStructure === PaymentStructure.HOURLY
          ? (dto.hourlyRate ?? null)
          : null,
    };

    // 13. Delegate update and skill replacement to repository
    const updatedJob = await this.jobPostRepository.updateWithSkills(
      trimmedJobId,
      updateData,
      skillIds,
    );

    return JobPostMapper.toResponseDto(updatedJob);
  }
}
