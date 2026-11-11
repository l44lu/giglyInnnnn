import { NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { RemoveRecruiterAvatarUseCase } from './remove-recruiter-avatar.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { Role } from '../../../../domain/enums/role.enum';

describe('RemoveRecruiterAvatarUseCase', () => {
  let useCase: RemoveRecruiterAvatarUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockFileStorageService: jest.Mocked<IFileStorageService>;

  const recruiterUserWithAvatar = new UserEntities({
    id: 'recruiter-user-123',
    email: 'recruiter@example.com',
    role: Role.RECRUITER,
    firstName: 'Alice',
    lastName: 'Recruiter',
    avatarUrl: 'avatars/recruiter/recruiter-user-123/avatar-key.jpg',
  });

  const recruiterUserWithoutAvatar = new UserEntities({
    id: 'recruiter-user-123',
    email: 'recruiter@example.com',
    role: Role.RECRUITER,
    firstName: 'Alice',
    lastName: 'Recruiter',
    avatarUrl: null,
  });

  const workerUser = new UserEntities({
    id: 'worker-user-456',
    email: 'worker@example.com',
    role: Role.WORKER,
    firstName: 'Bob',
    lastName: 'Worker',
    avatarUrl: 'avatars/worker/avatar.jpg',
  });

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    mockFileStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getFile: jest.fn(),
    } as unknown as jest.Mocked<IFileStorageService>;

    useCase = new RemoveRecruiterAvatarUseCase(
      mockUserRepository,
      mockFileStorageService,
    );
  });

  it('1. Existing avatar reference is cleared and S3 object deleted after successful DB update', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(recruiterUserWithAvatar);
    mockUserRepository.update.mockResolvedValueOnce(
      new UserEntities({ ...recruiterUserWithAvatar, avatarUrl: null }),
    );
    mockFileStorageService.deleteFile.mockResolvedValueOnce(undefined);

    const result = await useCase.execute(recruiterUserWithAvatar.id);

    expect(result).toEqual({ avatarUrl: null });
    expect(mockUserRepository.update).toHaveBeenCalledWith(
      recruiterUserWithAvatar.id,
      { avatarUrl: null },
    );
    expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(
      'avatars/recruiter/recruiter-user-123/avatar-key.jpg',
    );
  });

  it('2. Operation order: Database update occurs BEFORE S3 deletion', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(recruiterUserWithAvatar);
    const callOrder: string[] = [];

    mockUserRepository.update.mockImplementationOnce(() => {
      callOrder.push('db.update');
      return Promise.resolve(
        new UserEntities({ ...recruiterUserWithAvatar, avatarUrl: null }),
      );
    });

    mockFileStorageService.deleteFile.mockImplementationOnce(() => {
      callOrder.push('s3.deleteFile');
      return Promise.resolve();
    });

    await useCase.execute(recruiterUserWithAvatar.id);

    expect(callOrder).toEqual(['db.update', 's3.deleteFile']);
  });

  it('3. Database failure prevents S3 deletion', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(recruiterUserWithAvatar);
    mockUserRepository.update.mockRejectedValueOnce(
      new Error('Prisma database connection timeout'),
    );

    await expect(useCase.execute(recruiterUserWithAvatar.id)).rejects.toThrow(
      'Prisma database connection timeout',
    );

    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('4. S3 cleanup failure does not restore cleared DB reference and logs warning', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(recruiterUserWithAvatar);
    mockUserRepository.update.mockResolvedValueOnce(
      new UserEntities({ ...recruiterUserWithAvatar, avatarUrl: null }),
    );
    mockFileStorageService.deleteFile.mockRejectedValueOnce(
      new Error('S3 AccessDenied / Network error'),
    );

    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const result = await useCase.execute(recruiterUserWithAvatar.id);

    expect(result).toEqual({ avatarUrl: null });
    expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
    expect(mockUserRepository.update).toHaveBeenCalledWith(
      recruiterUserWithAvatar.id,
      { avatarUrl: null },
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to delete old avatar "avatars/recruiter/recruiter-user-123/avatar-key.jpg" from S3',
      ),
    );

    warnSpy.mockRestore();
  });

  it('5. No avatar exists: handled safely and idempotently without DB or S3 calls', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(
      recruiterUserWithoutAvatar,
    );

    const result = await useCase.execute(recruiterUserWithoutAvatar.id);

    expect(result).toEqual({ avatarUrl: null });
    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('6. Empty string avatarUrl is handled safely and idempotently', async () => {
    const recruiterWithEmptyAvatar = new UserEntities({
      ...recruiterUserWithoutAvatar,
      avatarUrl: '   ',
    });
    mockUserRepository.findById.mockResolvedValueOnce(recruiterWithEmptyAvatar);

    const result = await useCase.execute(recruiterWithEmptyAvatar.id);

    expect(result).toEqual({ avatarUrl: null });
    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('7. Throws NotFoundException if user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(null);

    await expect(useCase.execute('non-existent-user')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('8. Throws ForbiddenException if authenticated user is not a RECRUITER', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUser);

    await expect(useCase.execute(workerUser.id)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });
});
