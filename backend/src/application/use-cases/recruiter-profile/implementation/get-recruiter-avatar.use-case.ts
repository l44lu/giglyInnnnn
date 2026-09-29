import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../../../../domain/enums/role.enum';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import {
  IGetRecruiterAvatarUseCase,
  GetRecruiterAvatarResult,
} from '../interface/get-recruiter-avatar.use-case.interface';

@Injectable()
export class GetRecruiterAvatarUseCase implements IGetRecruiterAvatarUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(userId: string): Promise<GetRecruiterAvatarResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.RECRUITER) {
      throw new ForbiddenException(
        'Only recruiters can access recruiter avatars',
      );
    }

    if (!user.avatarUrl || user.avatarUrl.trim() === '') {
      throw new NotFoundException('No avatar found for this recruiter');
    }

    return this.fileStorageService.getFile(user.avatarUrl);
  }
}
