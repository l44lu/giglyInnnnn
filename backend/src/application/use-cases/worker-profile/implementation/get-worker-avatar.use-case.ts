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
  IGetWorkerAvatarUseCase,
  GetWorkerAvatarResult,
} from '../interface/get-worker-avatar.use-case.interface';

@Injectable()
export class GetWorkerAvatarUseCase implements IGetWorkerAvatarUseCase {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(userId: string): Promise<GetWorkerAvatarResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.WORKER) {
      throw new ForbiddenException('Only workers can access worker avatars');
    }

    if (!user.avatarUrl || user.avatarUrl.trim() === '') {
      throw new NotFoundException('No avatar found for this worker');
    }

    return this.fileStorageService.getFile(user.avatarUrl);
  }
}
