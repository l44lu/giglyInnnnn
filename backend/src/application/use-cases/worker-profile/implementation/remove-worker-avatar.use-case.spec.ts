import { NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { RemoveWorkerAvatarUseCase } from './remove-worker-avatar.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { IFileStorageService } from '../../../../domain/services/file-storage.service.interface';
import { UserEntities } from '../../../../domain/entities/user.entities';
import { Role } from '../../../../domain/enums/role.enum';

describe('RemoveWorkerAvatarUseCase', () => {
  let useCase: RemoveWorkerAvatarUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockFileStorageService: jest.Mocked<IFileStorageService>;

  const workerUserWithAvatar = new UserEntities({
    id: 'worker-user-123',
    email: 'worker@example.com',
    role: Role.WORKER,
    firstName: 'Jane',
    lastName: 'Worker',
    avatarUrl: 'avatars/worker/worker-user-123/avatar-key.jpg',
  });

  const workerUserWithoutAvatar = new UserEntities({
    id: 'worker-user-123',
    email: 'worker@example.com',
    role: Role.WORKER,
    firstName: 'Jane',
    lastName: 'Worker',
    avatarUrl: null,
  });

  const recruiterUser = new UserEntities({
    id: 'recruiter-user-456',
    email: 'recruiter@example.com',
    role: Role.RECRUITER,
    firstName: 'Bob',
    lastName: 'Recruiter',
    avatarUrl: 'avatars/recruiter/avatar.jpg',
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

    useCase = new RemoveWorkerAvatarUseCase(
      mockUserRepository,
      mockFileStorageService,
    );
  });

  it('1. Existing avatar reference is cleared and S3 object deleted after successful DB update', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUserWithAvatar);
    mockUserRepository.update.mockResolvedValueOnce(
      new UserEntities({ ...workerUserWithAvatar, avatarUrl: null }),
    );
    mockFileStorageService.deleteFile.mockResolvedValueOnce(undefined);

    const result = await useCase.execute(workerUserWithAvatar.id);

    expect(result).toEqual({ avatarUrl: null });
    // Verify DB update was called to clear avatarUrl
    expect(mockUserRepository.update).toHaveBeenCalledWith(
      workerUserWithAvatar.id,
      { avatarUrl: null },
    );
    // Verify S3 deletion was called with the old avatar key
    expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(
      'avatars/worker/worker-user-123/avatar-key.jpg',
    );
  });

  it('2. Operation order: Database update occurs BEFORE S3 deletion', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUserWithAvatar);
    const callOrder: string[] = [];

    mockUserRepository.update.mockImplementationOnce(() => {
      callOrder.push('db.update');
      return Promise.resolve(
        new UserEntities({ ...workerUserWithAvatar, avatarUrl: null }),
      );
    });

    mockFileStorageService.deleteFile.mockImplementationOnce(() => {
      callOrder.push('s3.deleteFile');
      return Promise.resolve();
    });

    await useCase.execute(workerUserWithAvatar.id);

    expect(callOrder).toEqual(['db.update', 's3.deleteFile']);
  });

  it('3. Database failure prevents S3 deletion', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUserWithAvatar);
    mockUserRepository.update.mockRejectedValueOnce(
      new Error('Prisma database connection timeout'),
    );

    await expect(useCase.execute(workerUserWithAvatar.id)).rejects.toThrow(
      'Prisma database connection timeout',
    );

    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('4. S3 cleanup failure does not restore cleared DB reference and logs warning', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUserWithAvatar);
    mockUserRepository.update.mockResolvedValueOnce(
      new UserEntities({ ...workerUserWithAvatar, avatarUrl: null }),
    );
    mockFileStorageService.deleteFile.mockRejectedValueOnce(
      new Error('S3 AccessDenied / Network error'),
    );

    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const result = await useCase.execute(workerUserWithAvatar.id);

    // Result is still successful
    expect(result).toEqual({ avatarUrl: null });
    // Database was NOT reverted
    expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
    expect(mockUserRepository.update).toHaveBeenCalledWith(
      workerUserWithAvatar.id,
      { avatarUrl: null },
    );
    // Warning was logged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to delete old avatar "avatars/worker/worker-user-123/avatar-key.jpg" from S3',
      ),
    );

    warnSpy.mockRestore();
  });

  it('5. No avatar exists: handled safely and idempotently without DB or S3 calls', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(workerUserWithoutAvatar);

    const result = await useCase.execute(workerUserWithoutAvatar.id);

    expect(result).toEqual({ avatarUrl: null });
    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });

  it('6. Empty string avatarUrl is handled safely and idempotently', async () => {
    const workerWithEmptyAvatar = new UserEntities({
      ...workerUserWithoutAvatar,
      avatarUrl: '   ',
    });
    mockUserRepository.findById.mockResolvedValueOnce(workerWithEmptyAvatar);

    const result = await useCase.execute(workerWithEmptyAvatar.id);

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

  it('8. Throws ForbiddenException if authenticated user is not a WORKER', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(recruiterUser);

    await expect(useCase.execute(recruiterUser.id)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockUserRepository.update).not.toHaveBeenCalled();
    expect(mockFileStorageService.deleteFile).not.toHaveBeenCalled();
  });
});
