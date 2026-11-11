import { Injectable, Inject } from '@nestjs/common';
import { IJobCategoryRepository } from '../../../../domain/repositories/job-category.repository.interface';
import { JobCategoryResponseDto } from '../../../dto/job-posting/job-category-response.dto';
import { JobCategoryMapper } from '../../../mappers/job-category.mapper';
import { IGetJobCategoriesUseCase } from '../interface/get-job-categories.use-case.interface';

@Injectable()
export class GetJobCategoriesUseCase implements IGetJobCategoriesUseCase {
  constructor(
    @Inject(IJobCategoryRepository)
    private readonly jobCategoryRepository: IJobCategoryRepository,
  ) {}

  async execute(): Promise<JobCategoryResponseDto[]> {
    const categories = await this.jobCategoryRepository.findAll();
    return categories.map((category) =>
      JobCategoryMapper.toJobCategoryResponseDto(category),
    );
  }
}
