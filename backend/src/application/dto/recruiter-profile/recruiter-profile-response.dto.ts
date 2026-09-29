export class RecruiterProfileResponseDto {
  id!: string;
  userId!: string;
  companyId!: string | null;
  roleTitle!: string | null;
  yearsExperience!: number | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<RecruiterProfileResponseDto>) {
    Object.assign(this, partial);
  }
}
