import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntities } from '../../domain/entities/user.entities';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { PrismaBaseRepository } from './base.repository';

@Injectable()
export class PrismaUserRepository
  extends PrismaBaseRepository<UserEntities, User>
  implements IUserRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, prisma.user);
  }

  protected mapToDomain(user: User): UserEntities {
    return new UserEntities({
      id: user.id,
      email: user.email,
      passWordHash: user.passwordHash,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    });
  }

  async findByEmail(email: string): Promise<UserEntities | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) return null;
    return this.mapToDomain(user);
  }

  // findById and findAll are handled by PrismaBaseRepository

  async create(data: Partial<UserEntities>): Promise<UserEntities> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email!,
        passwordHash: data.passWordHash!,
        role: data.role,
        firstName: data.firstName!,
        lastName: data.lastName!,
      },
    });
    return this.mapToDomain(user);
  }
}
