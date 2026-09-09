import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserResponseDto } from '../../../dto/user/user-response.dto';
import { UserMapper } from '../../../mappers/user.mapper';
import { IGetMeUseCase } from '../interface/get-me.use-case.interface';

@Injectable()
export class GetMeUseCase implements IGetMeUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.canAuthenticate()) {
      throw new UnauthorizedException('User account is inactive or blocked');
    }

    return UserMapper.toResponseDto(user);
  }
}
