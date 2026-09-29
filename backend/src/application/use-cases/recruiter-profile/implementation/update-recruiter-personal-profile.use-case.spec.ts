import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateRecruiterPersonalProfileUseCase } from './update-recruiter-personal-profile.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { UpdateRecruiterPersonalProfileInputDto } from '../../../dto/recruiter-profile/update-recruiter-personal-profile-input.dto';

describe('UpdateRecruiterPersonalProfileUseCase', () => {
  let useCase: UpdateRecruiterPersonalProfileUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const baseRecruiter = new UserEntities({
    id: 'recruiter-123',
    email: 'recruiter@example.com',
    passWordHash: 'hashed-secret',
    role: Role.RECRUITER,
    firstName: 'Alex',
    lastName: 'Recruiter',
    phone: null,
    location: null,
    bio: null,
    avatarUrl: 'avatars/recruiter/recruiter-123/avatar.png',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    };

    useCase = new UpdateRecruiterPersonalProfileUseCase(mockUserRepository);
  });

  it('should successfully update all personal fields for a valid recruiter', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(baseRecruiter);

    const updatedEntity = new UserEntities({
      ...baseRecruiter,
      firstName: 'Alexander',
      lastName: 'Smith',
      phone: '+14155552671',
      location: 'San Francisco, CA',
      bio: 'Head of Talent at Acme Corp. Looking for top engineering talent.',
    });
    mockUserRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto: UpdateRecruiterPersonalProfileInputDto = {
      firstName: ' Alexander ',
      lastName: ' Smith ',
      phone: ' +14155552671 ',
      location: ' San Francisco, CA ',
      bio: ' Head of Talent at Acme Corp. Looking for top engineering talent. ',
    };

    const result = await useCase.execute('recruiter-123', dto);

    expect(mockUserRepository.findById).toHaveBeenCalledWith('recruiter-123');
    expect(mockUserRepository.update).toHaveBeenCalledWith('recruiter-123', {
      firstName: 'Alexander',
      lastName: 'Smith',
      phone: '+14155552671',
      location: 'San Francisco, CA',
      bio: 'Head of Talent at Acme Corp. Looking for top engineering talent.',
    });

    expect(result.id).toBe('recruiter-123');
    expect(result.email).toBe('recruiter@example.com');
    expect(result.firstName).toBe('Alexander');
    expect(result.lastName).toBe('Smith');
    expect(result.phone).toBe('+14155552671');
    expect(result.location).toBe('San Francisco, CA');
    expect(result.bio).toBe(
      'Head of Talent at Acme Corp. Looking for top engineering talent.',
    );
  });

  it('should throw NotFoundException when user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute('non-existent', { firstName: 'Test' }),
    ).rejects.toThrow(NotFoundException);
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when user is not a RECRUITER', async () => {
    const workerUser = new UserEntities({
      ...baseRecruiter,
      role: Role.WORKER,
    });
    mockUserRepository.findById.mockResolvedValue(workerUser);

    await expect(
      useCase.execute('worker-123', { firstName: 'Test' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      useCase.execute('worker-123', { firstName: 'Test' }),
    ).rejects.toThrow('Only recruiters can update recruiter personal profile');
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('should allow nullable fields (phone, location, bio) to be cleared with null', async () => {
    mockUserRepository.findById.mockResolvedValueOnce(baseRecruiter);

    const clearedEntity = new UserEntities({
      ...baseRecruiter,
      phone: null,
      location: null,
      bio: null,
    });
    mockUserRepository.update.mockResolvedValueOnce(clearedEntity);

    const dto: UpdateRecruiterPersonalProfileInputDto = {
      phone: null,
      location: null,
      bio: null,
    };

    const result = await useCase.execute('recruiter-123', dto);

    expect(mockUserRepository.update).toHaveBeenCalledWith('recruiter-123', {
      phone: null,
      location: null,
      bio: null,
    });
    expect(result.phone).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.bio).toBeUndefined();
  });
});
