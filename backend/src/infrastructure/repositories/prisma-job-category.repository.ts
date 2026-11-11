import { Injectable } from '@nestjs/common';
import { IJobCategoryRepository } from '../../domain/repositories/job-category.repository.interface';
import { JobCategoryEntity } from '../../domain/entities/job-category.entity';
import { PrismaService } from '../prisma/prisma.service';
import { JobCategory } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaJobCategoryRepository
  extends PrismaBaseRepository<JobCategoryEntity, JobCategory>
  implements IJobCategoryRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.jobCategory);
  }

  protected mapToDomain(category: JobCategory): JobCategoryEntity {
    return new JobCategoryEntity({
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
    });
  }

  override async findAll(): Promise<JobCategoryEntity[]> {
    const categories = await this.prisma.jobCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return categories.map((category) => this.mapToDomain(category));
  }

  override async findById(id: string): Promise<JobCategoryEntity | null> {
    const category = await this.prisma.jobCategory.findUnique({
      where: { id },
    });
    if (!category) return null;
    return this.mapToDomain(category);
  }

  async findByName(name: string): Promise<JobCategoryEntity | null> {
    const category = await this.prisma.jobCategory.findUnique({
      where: { name },
    });
    if (!category) return null;
    return this.mapToDomain(category);
  }
}
