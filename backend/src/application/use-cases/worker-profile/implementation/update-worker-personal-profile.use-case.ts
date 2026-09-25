import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../../../../domain/enums/role.enum';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UpdateWorkerPersonalProfileInputDto } from '../../../dto/worker-profile/update-worker-personal-profile-input.dto';
import { UserResponseDto } from '../../../dto/user/user-response.dto';
import { UserMapper } from '../../../mappers/user.mapper';
import { IUpdateWorkerPersonalProfileUseCase } from '../interface/update-worker-personal-profile.use-case.interface';

@Injectable()
export class UpdateWorkerPersonalProfileUseCase implements IUpdateWorkerPersonalProfileUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: UpdateWorkerPersonalProfileInputDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.WORKER) {
      throw new ForbiddenException(
        'Only workers can update worker personal profile',
      );
    }

    const updatedUser = await this.userRepository.update(userId, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName.trim() }),
      ...(dto.phone !== undefined && {
        phone: dto.phone === null ? null : dto.phone.trim(),
      }),
      ...(dto.location !== undefined && {
        location: dto.location === null ? null : dto.location.trim(),
      }),
      ...(dto.bio !== undefined && {
        bio: dto.bio === null ? null : dto.bio.trim(),
      }),
    });

    return UserMapper.toResponseDto(updatedUser);
  }
}
