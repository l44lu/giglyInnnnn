import { IBaseRepository } from '../../domain/repositories/base.repository.interface';
import { PrismaService } from '../prisma/prisma.service';

export abstract class PrismaBaseRepository<T, P> implements IBaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly model: any,
  ) {}

  protected abstract mapToDomain(entity: P): T;

  async create(data: any): Promise<T> {
    const entity = (await this.model.create({ data })) as P;
    return this.mapToDomain(entity);
  }

  async findById(id: string): Promise<T | null> {
    const entity = (await this.model.findUnique({ where: { id } })) as P | null;
    if (!entity) return null;
    return this.mapToDomain(entity);
  }

  async findAll(): Promise<T[]> {
    const entities = (await this.model.findMany()) as P[];
    return entities.map((entity: P) => this.mapToDomain(entity));
  }

  async update(id: string, data: any): Promise<T> {
    const entity = (await this.model.update({
      where: { id },
      data,
    })) as P;
    return this.mapToDomain(entity);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.model.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
