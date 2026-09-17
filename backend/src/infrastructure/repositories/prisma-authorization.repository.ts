import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IAuthorizationRepository } from '../../domain/repositories/authorization.repository.interface';

@Injectable()
export class PrismaAuthorizationRepository implements IAuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveRoleCodes(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: {
          select: {
            code: true,
            isActive: true,
          },
        },
      },
    });

    if (!user?.role?.isActive) {
      return [];
    }

    return [user.role.code];
  }

  async getActivePermissionCodes(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: {
          select: {
            isActive: true,
            rolePermissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.role?.isActive) {
      return [];
    }

    const permissionCodes = new Set<string>();
    for (const rp of user.role.rolePermissions) {
      if (rp.permission?.code) {
        permissionCodes.add(rp.permission.code);
      }
    }

    return Array.from(permissionCodes);
  }
}
