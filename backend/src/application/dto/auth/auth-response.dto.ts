import { UserResponseDto } from '../user/user-response.dto';

export class AuthResponseDto {
  access_token!: string;
  refresh_token?: string;
  user!: UserResponseDto;
}
