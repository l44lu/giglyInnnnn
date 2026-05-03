import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { RegisterInputDto } from '../../dto/auth/register-input.dto';
import { UserResponseDto } from '../../dto/user/user-response.dto';
import { UserMapper } from '../../mappers/user.mapper';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(IUserRepository) private userRepository: IUserRepository,
  ) {}

  async execute(data: RegisterInputDto): Promise<UserResponseDto> {
    //hash the password (security first!!!!!!!!!!!!!!!!!!!!!)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    //save to database using our Infrastructure tool
    const user = await this.userRepository.create({
      email: data.email,
      passWordHash: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    });

    return UserMapper.toResponseDto(user);
  }
}
