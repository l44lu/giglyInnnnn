import { Injectable, Inject } from '@nestjs/common';
import { IGetWorkerJobDetailsUseCase } from '../interface/get-worker-job-details.use-case.interface';
import { IJobPostRepository } from '../../../../domain/repositories/job-post.repository.interface';
import { JobStatus } from '../../../../domain/enums/job-status.enum';
import {
  WorkerJobDetailsResponseDto,
  WorkerJobDetailsCompanyDto,
  WorkerJobDetailsRecruiterDto,
} from '../../../dto/job-discovery/worker-job-details-response.dto';
import { JobCategoryResponseDto } from '../../../dto/job-posting/job-category-response.dto';
import { SkillResponseDto } from '../../../dto/worker-profile/skill-response.dto';
import {
  ApplicationNotFoundError,
  ApplicationValidationError,
} from '../../../errors/application.errors';

@Injectable()
export class GetWorkerJobDetailsUseCase implements IGetWorkerJobDetailsUseCase {
  constructor(
    @Inject(IJobPostRepository)
    private readonly jobPostRepository: IJobPostRepository,
  ) {}

  async execute(jobId: string): Promise<WorkerJobDetailsResponseDto> {
    if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
      throw new ApplicationValidationError('Job ID must be provided');
    }

    const job = await this.jobPostRepository.findOpenJobById(jobId.trim());

    if (!job || job.status !== JobStatus.OPEN) {
      throw new ApplicationNotFoundError('Job post not found');
    }

    let companyDto: WorkerJobDetailsCompanyDto | null = null;
    if (job.company) {
      companyDto = new WorkerJobDetailsCompanyDto({
        id: job.company.id ?? null,
        name: job.company.name,
        logoUrl: job.company.logoUrl ?? null,
        about: job.company.about ?? null,
        industry: job.company.industry ?? null,
        website: job.company.website ?? null,
        headquartersLocation: job.company.headquartersLocation ?? null,
      });
    }

    let recruiterDto: WorkerJobDetailsRecruiterDto | null = null;
    if (job.recruiter) {
      const user = job.recruiter.user;
      const firstName = user?.firstName ?? '';
      const lastName = user?.lastName ?? '';
      const fullName = `${firstName} ${lastName}`.trim();

      recruiterDto = new WorkerJobDetailsRecruiterDto({
        name: fullName.length > 0 ? fullName : 'Recruiter',
        roleTitle: job.recruiter.roleTitle ?? null,
        avatarUrl: user?.avatarUrl ?? null,
        location: user?.location ?? null,
        bio: user?.bio ?? null,
        yearsExperience: job.recruiter.yearsExperience ?? null,
      });
    }

    return new WorkerJobDetailsResponseDto({
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
      updatedAt: job.updatedAt,
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
      recruiter: recruiterDto,
    });
  }
}
