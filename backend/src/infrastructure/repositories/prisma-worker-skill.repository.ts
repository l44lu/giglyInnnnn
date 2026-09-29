import { Injectable } from '@nestjs/common';
import { IWorkerSkillRepository } from '../../domain/repositories/worker-skill.repository.interface';
import { WorkerSkillEntity } from '../../domain/entities/worker-skill.entity';
import { SkillEntity } from '../../domain/entities/skill.entity';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, WorkerSkill } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

export type WorkerSkillPersistenceModel = Prisma.WorkerSkillGetPayload<{
  include: {
    skill?: true;
  };
}>;

@Injectable()
export class PrismaWorkerSkillRepository
  extends PrismaBaseRepository<WorkerSkillEntity, WorkerSkill>
  implements IWorkerSkillRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.workerSkill);
  }

  protected mapToDomain(
    record: WorkerSkillPersistenceModel,
  ): WorkerSkillEntity {
    return new WorkerSkillEntity({
      id: record.id,
      workerId: record.workerId,
      skillId: record.skillId,
      skillType: record.skillType,
      skill: record.skill
        ? new SkillEntity({
            id: record.skill.id,
            name: record.skill.name,
            createdAt: record.skill.createdAt,
          })
        : undefined,
    });
  }

  async findByWorkerId(workerId: string): Promise<WorkerSkillEntity[]> {
    const records = await this.prisma.workerSkill.findMany({
      where: { workerId },
      include: { skill: true },
      orderBy: { skill: { name: 'asc' } },
    });
    return records.map((record) => this.mapToDomain(record));
  }

  async findByWorkerAndSkill(
    workerId: string,
    skillId: string,
  ): Promise<WorkerSkillEntity | null> {
    const record = await this.prisma.workerSkill.findUnique({
      where: {
        workerId_skillId: {
          workerId,
          skillId,
        },
      },
      include: { skill: true },
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  override async create(
    data: Partial<WorkerSkillEntity>,
  ): Promise<WorkerSkillEntity> {
    const record = await this.prisma.workerSkill.create({
      data: {
        workerId: data.workerId!,
        skillId: data.skillId!,
        skillType: data.skillType ?? 'CORE',
      },
      include: { skill: true },
    });
    return this.mapToDomain(record);
  }

  async deleteByWorkerAndSkill(
    workerId: string,
    skillId: string,
  ): Promise<boolean> {
    try {
      await this.prisma.workerSkill.delete({
        where: {
          workerId_skillId: {
            workerId,
            skillId,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async replaceForWorker(
    workerId: string,
    skillIds: string[],
  ): Promise<WorkerSkillEntity[]> {
    return this.prisma.$transaction(async (tx) => {
      const currentWorkerSkills = await tx.workerSkill.findMany({
        where: { workerId },
        select: { id: true, skillId: true },
      });

      const currentSkillIds = new Set(
        currentWorkerSkills.map((ws) => ws.skillId),
      );
      const newSkillIds = new Set(skillIds);

      const toRemove = currentWorkerSkills
        .filter((ws) => !newSkillIds.has(ws.skillId))
        .map((ws) => ws.id);

      if (toRemove.length > 0) {
        await tx.workerSkill.deleteMany({
          where: {
            id: { in: toRemove },
          },
        });
      }

      const toAdd = skillIds.filter((id) => !currentSkillIds.has(id));

      if (toAdd.length > 0) {
        await tx.workerSkill.createMany({
          data: toAdd.map((skillId) => ({
            workerId,
            skillId,
            skillType: 'CORE',
          })),
        });
      }

      const updated = await tx.workerSkill.findMany({
        where: { workerId },
        include: { skill: true },
        orderBy: { skill: { name: 'asc' } },
      });

      return updated.map((record) => this.mapToDomain(record));
    });
  }
}
