import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Role } from '../../../../domain/enums/role.enum';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import {
  IUploadWorkerAvatarUseCase,
  UploadWorkerAvatarInput,
  UploadWorkerAvatarResult,
} from '../interface/upload-worker-avatar.use-case.interface';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

interface DetectedImageType {
  ext: 'jpg' | 'png' | 'webp';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
}

@Injectable()
export class UploadWorkerAvatarUseCase implements IUploadWorkerAvatarUseCase {
  private readonly logger = new Logger(UploadWorkerAvatarUseCase.name);

  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    @Inject(IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
  ) {}

  async execute(
    input: UploadWorkerAvatarInput,
  ): Promise<UploadWorkerAvatarResult> {
    const { userId, buffer, mimetype, size } = input;

    // 1. Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Verify worker role
    if (user.role !== Role.WORKER) {
      throw new ForbiddenException('Only workers can upload worker avatars');
    }

    // 3. Validate size
    if (
      !buffer ||
      size > MAX_AVATAR_SIZE_BYTES ||
      buffer.length > MAX_AVATAR_SIZE_BYTES
    ) {
      throw new BadRequestException('File size exceeds the 2MB limit');
    }

    // 4. Validate MIME & magic bytes
    const detectedType = this.validateMagicBytes(buffer);
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (
      !allowedMimes.includes(mimetype) ||
      mimetype !== detectedType.contentType
    ) {
      throw new BadRequestException(
        `File MIME type "${mimetype}" does not match binary image signature`,
      );
    }

    const oldAvatarKey = user.avatarUrl;
    const newKey = `avatars/worker/${userId}/${randomUUID()}.${detectedType.ext}`;

    // 5. Upload new avatar to S3
    await this.fileStorageService.uploadFile({
      key: newKey,
      buffer,
      contentType: detectedType.contentType,
    });

    // 6. Update user avatarUrl in database with S3 compensation
    try {
      await this.userRepository.update(userId, {
        avatarUrl: newKey,
      });
    } catch (dbError) {
      this.logger.error(
        `Database update failed for user ${userId}. Compensating by deleting S3 object "${newKey}"`,
      );
      try {
        await this.fileStorageService.deleteFile(newKey);
      } catch (compensationError) {
        this.logger.error(
          `Compensation cleanup failed for key "${newKey}": ${(compensationError as Error).message}`,
        );
      }
      throw dbError;
    }

    // 7. If DB update succeeded and user had an old avatar, delete old S3 object
    if (oldAvatarKey && oldAvatarKey.trim() !== '') {
      try {
        await this.fileStorageService.deleteFile(oldAvatarKey);
        this.logger.log(`Previous avatar deleted from S3: ${oldAvatarKey}`);
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to delete old avatar "${oldAvatarKey}" from S3: ${(cleanupError as Error).message}. Retaining database reference.`,
        );
      }
    }

    return {
      avatarUrl: '/worker/profile/avatar',
    };
  }

  private validateMagicBytes(buffer: Buffer): DetectedImageType {
    if (buffer.length < 12) {
      throw new BadRequestException(
        'Invalid file content: file is too small to be a valid image',
      );
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { ext: 'jpg', contentType: 'image/jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { ext: 'png', contentType: 'image/png' };
    }

    // WebP: RIFF....WEBP
    if (
      buffer.subarray(0, 4).toString('binary') === 'RIFF' &&
      buffer.subarray(8, 12).toString('binary') === 'WEBP'
    ) {
      return { ext: 'webp', contentType: 'image/webp' };
    }

    throw new BadRequestException(
      'Invalid file content: image does not match allowed binary signatures (JPEG, PNG, WebP)',
    );
  }
}
