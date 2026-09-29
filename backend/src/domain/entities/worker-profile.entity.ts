export class WorkerProfileEntity {
  id!: string;
  userId!: string;
  headline: string | null = null;
  yearsExperience: number | null = null;
  responseTimeHours: number | null = null;
  availabilityStatus: string = 'available';
  isOpenToWork: boolean = true;
  totalCompletedGigs: number = 0;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial?: Partial<WorkerProfileEntity>) {
    Object.assign(this, partial);
    if (this.headline === undefined) this.headline = null;
    if (this.yearsExperience === undefined) this.yearsExperience = null;
    if (this.responseTimeHours === undefined) this.responseTimeHours = null;
    if (this.availabilityStatus === undefined)
      this.availabilityStatus = 'available';
    if (this.isOpenToWork === undefined) this.isOpenToWork = true;
    if (this.totalCompletedGigs === undefined) this.totalCompletedGigs = 0;
  }
}
