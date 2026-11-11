export class JobCategoryResponseDto {
  id!: string;
  name!: string;
  description!: string | null;

  constructor(partial: Partial<JobCategoryResponseDto>) {
    Object.assign(this, partial);
  }
}
