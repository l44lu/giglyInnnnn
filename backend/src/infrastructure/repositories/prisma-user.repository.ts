import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntities } from '../../domain/entities/user.entities';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  private mapToDomain(user: User): UserEntities {
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

  async findById(id: string): Promise<UserEntities | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;
    return this.mapToDomain(user);
  }

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
