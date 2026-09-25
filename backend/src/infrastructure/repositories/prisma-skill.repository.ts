import { Injectable } from '@nestjs/common';
import { ISkillRepository } from '../../domain/repositories/skill.repository.interface';
import { SkillEntity } from '../../domain/entities/skill.entity';
import { PrismaService } from '../prisma/prisma.service';
import { Skill } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaSkillRepository
  extends PrismaBaseRepository<SkillEntity, Skill>
  implements ISkillRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.skill);
  }

  protected mapToDomain(skill: Skill): SkillEntity {
    return new SkillEntity({
      id: skill.id,
      name: skill.name,
      createdAt: skill.createdAt,
    });
  }

  override async findAll(): Promise<SkillEntity[]> {
    const skills = await this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });
    return skills.map((skill) => this.mapToDomain(skill));
  }

  override async findById(id: string): Promise<SkillEntity | null> {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
    });
    if (!skill) return null;
    return this.mapToDomain(skill);
  }

  async findByName(name: string): Promise<SkillEntity | null> {
    const skill = await this.prisma.skill.findUnique({
      where: { name },
    });
    if (!skill) return null;
    return this.mapToDomain(skill);
  }

  async findByIds(ids: string[]): Promise<SkillEntity[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    const skills = await this.prisma.skill.findMany({
      where: {
        id: { in: ids },
      },
      orderBy: { name: 'asc' },
    });
    return skills.map((skill) => this.mapToDomain(skill));
  }
}
