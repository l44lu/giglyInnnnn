import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntities } from '../../domain/entities/user.entities';
import { Role } from '../../domain/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

export type UserPersistenceModel = Prisma.UserGetPayload<{
  include: {
    role: true;
  };
}>;

@Injectable()
export class PrismaUserRepository
  extends PrismaBaseRepository<UserEntities, UserPersistenceModel>
  implements IUserRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.user);
  }

  protected mapToDomain(user: UserPersistenceModel): UserEntities {
    if (!user.role || !user.role.code) {
      throw new Error(`User ${user.id} has no associated role or role code`);
    }

    return new UserEntities({
      id: user.id,
      email: user.email,
      passWordHash: user.passwordHash,
      role: user.role.code as Role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    });
  }

  async findByEmail(email: string): Promise<UserEntities | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    if (!user) return null;
    return this.mapToDomain(user);
  }

  override async findById(id: string): Promise<UserEntities | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) return null;
    return this.mapToDomain(user);
  }

  override async findAll(): Promise<UserEntities[]> {
    const users = await this.prisma.user.findMany({
      include: { role: true },
    });
    return users.map((user) => this.mapToDomain(user));
  }

  override async create(data: Partial<UserEntities>): Promise<UserEntities> {
    const roleCode = data.role ?? Role.WORKER;

    const user = await this.prisma.user.create({
      data: {
        email: data.email!,
        passwordHash: data.passWordHash!,
        role: {
          connect: {
            code: roleCode,
          },
        },
        firstName: data.firstName!,
        lastName: data.lastName!,
        isActive: data.isActive ?? true,
        isBlocked: data.isBlocked ?? false,
      },
      include: {
        role: true,
      },
    });
    return this.mapToDomain(user);
  }

  override async update(
    id: string,
    data: Partial<UserEntities>,
  ): Promise<UserEntities> {
    const updateData: Prisma.UserUpdateInput = {
      ...(data.email && { email: data.email }),
      ...(data.passWordHash && { passwordHash: data.passWordHash }),
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isBlocked !== undefined && { isBlocked: data.isBlocked }),
      ...(data.role && {
        role: {
          connect: { code: data.role },
        },
      }),
    };

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
    return this.mapToDomain(user);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
