export class RecruiterProfileEntity {
  id!: string;
  userId!: string;
  companyId: string | null = null;
  roleTitle: string | null = null;
  yearsExperience: number | null = null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial?: Partial<RecruiterProfileEntity>) {
    Object.assign(this, partial);
    if (this.companyId === undefined) this.companyId = null;
    if (this.roleTitle === undefined) this.roleTitle = null;
    if (this.yearsExperience === undefined) this.yearsExperience = null;
  }
}
