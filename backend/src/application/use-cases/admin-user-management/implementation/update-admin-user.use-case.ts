import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UpdateAdminUserInputDto } from '../../../dto/admin-user-management/update-admin-user-input.dto';
import { AdminUserResponseDto } from '../../../dto/admin-user-management/admin-user.response.dto';
import { AdminUserMapper } from '../../../mappers/admin-user-management.mapper';
import { IUpdateAdminUserUseCase } from '../interface/update-admin-user.use-case.interface';

@Injectable()
export class UpdateAdminUserUseCase implements IUpdateAdminUserUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    data: UpdateAdminUserInputDto,
  ): Promise<AdminUserResponseDto> {
    // Step A — Find the target user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Step B — Validate email uniqueness when email is changed
    if (data.email !== undefined) {
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Step C & D — Build update payload with only approved fields
    const updateData: Record<string, unknown> = {
      ...(data.firstName !== undefined && {
        firstName: data.firstName.trim(),
      }),
      ...(data.lastName !== undefined && {
        lastName: data.lastName.trim(),
      }),
      ...(data.email !== undefined && {
        email: data.email.trim(),
      }),
      ...(data.phone !== undefined && {
        phone: data.phone === null ? null : data.phone.trim(),
      }),
      ...(data.location !== undefined && {
        location: data.location === null ? null : data.location.trim(),
      }),
      ...(data.bio !== undefined && {
        bio: data.bio === null ? null : data.bio.trim(),
      }),
    };

    // Step F — Persist
    const updatedUser = await this.userRepository.update(userId, updateData);

    // Step G — Map response
    return AdminUserMapper.toResponseDto(updatedUser);
  }
}
