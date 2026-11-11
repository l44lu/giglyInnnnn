import { Injectable, Inject } from '@nestjs/common';
import {
  ApplicationValidationError,
  ApplicationNotFoundError,
} from '../../../errors/application.errors';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { IJobCategoryRepository } from '../../../../domain/repositories/job-category.repository.interface';
import { ISkillRepository } from '../../../../domain/repositories/skill.repository.interface';
import { JobPostEntity } from '../../../../domain/entities/job-post.entity';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import { WorkType } from '../../../../domain/enums/work-type.enum';
import { PaymentStructure } from '../../../../domain/enums/payment-structure.enum';
import { CreateDraftJobPostInputDto } from '../../../dto/job-posting/create-draft-job-post-input.dto';
import { JobPostResponseDto } from '../../../dto/job-posting/job-post-response.dto';
import { JobPostMapper } from '../../../mappers/job-post.mapper';
import { ICreateDraftJobPostUseCase } from '../interface/create-draft-job-post.use-case.interface';

@Injectable()
export class CreateDraftJobPostUseCase implements ICreateDraftJobPostUseCase {
  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
    @Inject(IJobCategoryRepository)
    private readonly jobCategoryRepository: IJobCategoryRepository,
    @Inject(ISkillRepository)
    private readonly skillRepository: ISkillRepository,
  ) {}

  async execute(
    recruiterId: string,
    dto: CreateDraftJobPostInputDto,
  ): Promise<JobPostResponseDto> {
    if (!recruiterId || recruiterId.trim().length === 0) {
      throw new ApplicationValidationError('Recruiter profile ID is required');
    }

    if (!dto) {
      throw new ApplicationValidationError('Job post details are required');
    }

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

    let parsedStartDate: Date | null = null;
    if (dto.startDate !== undefined && dto.startDate !== null) {
      const d = new Date(dto.startDate);
      if (isNaN(d.getTime())) {
        throw new ApplicationValidationError('startDate must be a valid date');
      }
      parsedStartDate = d;
    }

    if (dto.paymentStructure === PaymentStructure.FIXED) {
      if (dto.hourlyRate !== undefined && dto.hourlyRate !== null) {
        throw new ApplicationValidationError(
          'hourlyRate is not allowed for fixed price jobs',
        );
      }
      if (dto.budgetAmount !== undefined && dto.budgetAmount !== null) {
        if (typeof dto.budgetAmount !== 'number' || dto.budgetAmount < 0) {
          throw new ApplicationValidationError(
            'budgetAmount must be a non-negative number',
          );
        }
      }
    } else if (dto.paymentStructure === PaymentStructure.HOURLY) {
      if (dto.budgetAmount !== undefined && dto.budgetAmount !== null) {
        throw new ApplicationValidationError(
          'budgetAmount is not allowed for hourly jobs',
        );
      }
      if (dto.hourlyRate !== undefined && dto.hourlyRate !== null) {
        if (typeof dto.hourlyRate !== 'number' || dto.hourlyRate <= 0) {
          throw new ApplicationValidationError(
            'hourlyRate must be greater than zero',
          );
        }
      }
    }

    // 1. Validate that the category exists
    const category = await this.jobCategoryRepository.findById(
      dto.categoryId.trim(),
    );
    if (!category) {
      throw new ApplicationNotFoundError('Job category not found');
    }

    // 2. Validate selected skill IDs if provided
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

    // 3. Assemble JobPost entity data with explicit DRAFT status
    const jobPostData: Partial<JobPostEntity> = {
      recruiterId: recruiterId.trim(),
      categoryId: dto.categoryId.trim(),
      title: dto.title.trim(),
      description: dto.description.trim(),
      workType: dto.workType,
      workersNeeded: dto.workersNeeded !== undefined ? dto.workersNeeded : 1,
      startDate: parsedStartDate,
      estimatedDuration: dto.estimatedDuration ?? null,
      shiftDuration: dto.shiftDuration ?? null,
      jobLocation: dto.jobLocation ? dto.jobLocation.trim() : null,
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
      status: JobStatus.DRAFT,
      isBoosted: false,
      boostExpiresAt: null,
      adminReviewStatus: 'pending',
      adminNotes: null,
    };

    // 4. Delegate creation to repository
    const createdJob = await this.jobPostRepository.createWithSkills(
      jobPostData,
      skillIds,
    );

    return JobPostMapper.toResponseDto(createdJob);
  }
}
