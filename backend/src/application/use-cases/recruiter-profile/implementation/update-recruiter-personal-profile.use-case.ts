import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../../../../domain/enums/role.enum';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UpdateRecruiterPersonalProfileInputDto } from '../../../dto/recruiter-profile/update-recruiter-personal-profile-input.dto';
import { UserResponseDto } from '../../../dto/user/user-response.dto';
import { UserMapper } from '../../../mappers/user.mapper';
import { IUpdateRecruiterPersonalProfileUseCase } from '../interface/update-recruiter-personal-profile.use-case.interface';

@Injectable()
export class UpdateRecruiterPersonalProfileUseCase implements IUpdateRecruiterPersonalProfileUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    dto: UpdateRecruiterPersonalProfileInputDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.RECRUITER) {
      throw new ForbiddenException(
        'Only recruiters can update recruiter personal profile',
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
