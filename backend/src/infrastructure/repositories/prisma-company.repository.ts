import { Injectable } from '@nestjs/common';
import { ICompanyRepository } from '../../domain/repositories/company.repository.interface';
import { CompanyEntity } from '../../domain/entities/company.entity';
import { PrismaService } from '../prisma/prisma.service';
import { Company, Prisma } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaCompanyRepository
  extends PrismaBaseRepository<CompanyEntity, Company>
  implements ICompanyRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.company);
  }

  protected mapToDomain(company: Company): CompanyEntity {
    return new CompanyEntity({
      id: company.id,
      name: company.name,
      industry: company.industry,
      companySize: company.companySize,
      website: company.website,
      headquartersLocation: company.headquartersLocation,
      about: company.about,
      logoUrl: company.logoUrl,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    });
  }

  async findByName(name: string): Promise<CompanyEntity | null> {
    const company = await this.prisma.company.findFirst({
      where: { name },
    });
    if (!company) return null;
    return this.mapToDomain(company);
  }

  override async create(data: Partial<CompanyEntity>): Promise<CompanyEntity> {
    const company = await this.prisma.company.create({
      data: {
        name: data.name!,
        industry: data.industry ?? null,
        companySize: data.companySize ?? null,
        website: data.website ?? null,
        headquartersLocation: data.headquartersLocation ?? null,
        about: data.about ?? null,
        logoUrl: data.logoUrl ?? null,
      },
    });
    return this.mapToDomain(company);
  }

  override async update(
    id: string,
    data: Partial<CompanyEntity>,
  ): Promise<CompanyEntity> {
    const updateData: Prisma.CompanyUncheckedUpdateInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.industry !== undefined && { industry: data.industry }),
      ...(data.companySize !== undefined && { companySize: data.companySize }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.headquartersLocation !== undefined && {
        headquartersLocation: data.headquartersLocation,
      }),
      ...(data.about !== undefined && { about: data.about }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
    };

    const company = await this.prisma.company.update({
      where: { id },
      data: updateData,
    });
    return this.mapToDomain(company);
  }
}
