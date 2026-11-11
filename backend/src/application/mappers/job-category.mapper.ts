import { JobCategoryEntity } from '../../domain/entities/job-category.entity';
import { JobCategoryResponseDto } from '../dto/job-posting/job-category-response.dto';

export class JobCategoryMapper {
  static toJobCategoryResponseDto(
    category: JobCategoryEntity,
  ): JobCategoryResponseDto {
    return new JobCategoryResponseDto({
      id: category.id,
      name: category.name,
      description: category.description,
    });
  }

  static toResponseDto(category: JobCategoryEntity): JobCategoryResponseDto {
    return this.toJobCategoryResponseDto(category);
  }
}
