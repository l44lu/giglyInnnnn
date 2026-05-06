import { UserEntities } from '../../domain/entities/user.entities';
import { UserResponseDto } from '../dto/user/user-response.dto';

export class UserMapper {
  static toResponseDto(user: UserEntities): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    });
  }
}
