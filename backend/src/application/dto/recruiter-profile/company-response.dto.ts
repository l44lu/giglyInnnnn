export class CompanyResponseDto {
  id!: string;
  name!: string;
  industry!: string | null;
  companySize!: string | null;
  website!: string | null;
  headquartersLocation!: string | null;
  about!: string | null;
  logoUrl!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<CompanyResponseDto>) {
    Object.assign(this, partial);
  }
}
