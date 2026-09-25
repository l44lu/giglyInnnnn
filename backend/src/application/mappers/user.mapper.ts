import { UserEntities, Role } from '../../domain/entities/user.entities';
import { UserResponseDto } from '../dto/user/user-response.dto';

export class UserMapper {
  static toResponseDto(user: UserEntities): UserResponseDto {
    const dto = new UserResponseDto({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    });

    if (user.phone !== undefined && user.phone !== null) {
      dto.phone = user.phone;
    }

    if (user.location !== undefined && user.location !== null) {
      dto.location = user.location;
    }

    if (user.bio !== undefined && user.bio !== null) {
      dto.bio = user.bio;
    }

    if (user.avatarUrl) {
      dto.avatarUrl =
        user.role === Role.WORKER ? '/worker/profile/avatar' : user.avatarUrl;
    }

    return dto;
  }
}
