import { Injectable, Inject } from '@nestjs/common';
import { IFindOpenJobsUseCase } from '../interface/find-open-jobs.use-case.interface';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { FindJobsQueryDto } from '../../../dto/job-discovery/find-jobs-query.dto';
import {
  FindJobsResponseDto,
  JobDiscoveryItemDto,
  JobDiscoveryCompanyDto,
  PaginationMetadataDto,
} from '../../../dto/job-discovery/find-jobs-response.dto';
import { JobCategoryResponseDto } from '../../../dto/job-posting/job-category-response.dto';
import { SkillResponseDto } from '../../../dto/worker-profile/skill-response.dto';
import { ApplicationValidationError } from '../../../errors/application.errors';

@Injectable()
export class FindOpenJobsUseCase implements IFindOpenJobsUseCase {
  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
  ) {}

  async execute(query: FindJobsQueryDto): Promise<FindJobsResponseDto> {
    if (
      query.minPay !== undefined &&
      query.maxPay !== undefined &&
      query.minPay > query.maxPay
    ) {
      throw new ApplicationValidationError(
        'minPay cannot be greater than maxPay',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const result = await this.jobPostRepository.findOpenJobs({
      search: query.search,
      categoryId: query.categoryId,
      workType: query.workType,
      location: query.location,
      paymentStructure: query.paymentStructure,
      minPay: query.minPay,
      maxPay: query.maxPay,
      skillIds: query.skillIds,
      sortBy: query.sortBy,
      page,
      limit,
    });

    const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / limit);

    const items: JobDiscoveryItemDto[] = result.items.map((job) => {
      let companyDto: JobDiscoveryCompanyDto | null = null;
      if (job.company) {
        companyDto = new JobDiscoveryCompanyDto({
          id: job.company.id ?? null,
          name: job.company.name,
          logoUrl: job.company.logoUrl ?? null,
        });
      }

      return new JobDiscoveryItemDto({
        id: job.id,
        categoryId: job.categoryId,
        title: job.title,
        description: job.description,
        workType: job.workType,
        workersNeeded: job.workersNeeded,
        startDate: job.startDate,
        estimatedDuration: job.estimatedDuration,
        shiftDuration: job.shiftDuration,
        jobLocation: job.jobLocation,
        jobLocationLat: job.jobLocationLat,
        jobLocationLng: job.jobLocationLng,
        paymentStructure: job.paymentStructure,
        budgetAmount: job.budgetAmount,
        hourlyRate: job.hourlyRate,
        status: job.status,
        createdAt: job.createdAt,
        category: job.category
          ? new JobCategoryResponseDto({
              id: job.category.id,
              name: job.category.name,
              description: job.category.description,
            })
          : undefined,
        skills: job.skills
          ? job.skills.map(
              (s) =>
                new SkillResponseDto({
                  id: s.id,
                  name: s.name,
                }),
            )
          : undefined,
        company: companyDto,
      });
    });

    return new FindJobsResponseDto({
      items,
      pagination: new PaginationMetadataDto({
        total: result.total,
        page,
        limit,
        totalPages,
      }),
    });
  }
}
