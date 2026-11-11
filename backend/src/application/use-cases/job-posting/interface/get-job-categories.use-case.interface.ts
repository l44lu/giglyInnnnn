import { JobCategoryResponseDto } from '../../../dto/job-posting/job-category-response.dto';

export interface IGetJobCategoriesUseCase {
  execute(): Promise<JobCategoryResponseDto[]>;
}

export const IGetJobCategoriesUseCase = Symbol('IGetJobCategoriesUseCase');
