export class CompanyEntity {
  id!: string;
  name!: string;
  industry: string | null = null;
  companySize: string | null = null;
  website: string | null = null;
  headquartersLocation: string | null = null;
  about: string | null = null;
  logoUrl: string | null = null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial?: Partial<CompanyEntity>) {
    Object.assign(this, partial);
    if (this.industry === undefined) this.industry = null;
    if (this.companySize === undefined) this.companySize = null;
    if (this.website === undefined) this.website = null;
    if (this.headquartersLocation === undefined)
      this.headquartersLocation = null;
    if (this.about === undefined) this.about = null;
    if (this.logoUrl === undefined) this.logoUrl = null;
  }
}
