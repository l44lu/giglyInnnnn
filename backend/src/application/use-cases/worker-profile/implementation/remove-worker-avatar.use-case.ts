import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../../../../domain/enums/role.enum';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import {
  IRemoveWorkerAvatarUseCase,
  RemoveWorkerAvatarResult,
} from '../interface/remove-worker-avatar.use-case.interface';

@Injectable()
export class RemoveWorkerAvatarUseCase implements IRemoveWorkerAvatarUseCase {
  private readonly logger = new Logger(RemoveWorkerAvatarUseCase.name);

  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(userId: string): Promise<RemoveWorkerAvatarResult> {
    // 1. Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Verify worker role
    if (user.role !== Role.WORKER) {
      throw new ForbiddenException('Only workers can remove worker avatars');
    }

    const oldAvatarKey = user.avatarUrl;

    // 3. If no avatar exists, handle repeated removal safely and idempotently
    if (!oldAvatarKey || oldAvatarKey.trim() === '') {
      return { avatarUrl: null };
    }

    // 4. Clear the nullable avatar reference in the database FIRST
    await this.userRepository.update(userId, {
      avatarUrl: null,
    });

    // 5. Only after the database update succeeds, attempt to delete previous S3 object
    try {
      await this.fileStorageService.deleteFile(oldAvatarKey);
      this.logger.log(`Worker avatar deleted from S3: ${oldAvatarKey}`);
    } catch (cleanupError) {
      // 6. If S3 deletion fails after database reference is cleared, log cleanup failure and do NOT restore reference
      this.logger.warn(
        `Failed to delete old avatar "${oldAvatarKey}" from S3: ${(cleanupError as Error).message}. Retaining cleared database reference.`,
      );
    }

    return {
      avatarUrl: null,
    };
  }
}
