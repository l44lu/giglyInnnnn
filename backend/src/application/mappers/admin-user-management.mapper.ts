import { UserEntities } from '../../domain/entities/user.entities';
import { AdminUserResponseDto } from '../dto/admin-user-management/admin-user.response.dto';

export class AdminUserMapper {
  static toResponseDto(user: UserEntities): AdminUserResponseDto {
    return new AdminUserResponseDto({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      location: user.location,
      bio: user.bio,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    });
  }
}
