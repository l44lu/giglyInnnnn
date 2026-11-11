import { UserEntities } from './user.entities';
import { CompanyEntity } from './company.entity';

export class RecruiterProfileEntity {
  id!: string;
  userId!: string;
  companyId: string | null = null;
  roleTitle: string | null = null;
  yearsExperience: number | null = null;
  createdAt!: Date;
  updatedAt!: Date;

  // Domain relationship associations (optional, populated when loaded with relations)
  user?: UserEntities | null = null;
  company?: CompanyEntity | null = null;

  constructor(partial?: Partial<RecruiterProfileEntity>) {
    Object.assign(this, partial);
    if (this.companyId === undefined) this.companyId = null;
    if (this.roleTitle === undefined) this.roleTitle = null;
    if (this.yearsExperience === undefined) this.yearsExperience = null;
    if (this.user === undefined) this.user = null;
    if (this.company === undefined) this.company = null;
  }
}
