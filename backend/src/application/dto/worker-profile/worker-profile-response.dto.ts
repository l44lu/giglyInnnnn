export class WorkerProfileResponseDto {
  id!: string;
  userId!: string;
  headline!: string | null;
  yearsExperience!: number | null;
  responseTimeHours!: number | null;
  availabilityStatus!: string;
  isOpenToWork!: boolean;
  totalCompletedGigs!: number;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WorkerProfileResponseDto>) {
    Object.assign(this, partial);
  }
}
