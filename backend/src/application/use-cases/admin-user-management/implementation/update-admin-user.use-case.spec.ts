import { NotFoundException, ConflictException } from '@nestjs/common';
import { UpdateAdminUserUseCase } from './update-admin-user.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { AdminUserResponseDto } from '../../../../application/dto/admin-user-management/admin-user.response.dto';
import { UpdateAdminUserInputDto } from '../../../../application/dto/admin-user-management/update-admin-user-input.dto';

describe('UpdateAdminUserUseCase', () => {
  let useCase: UpdateAdminUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  const baseUser = new UserEntities({
    id: 'target-user-123',
    email: 'target@example.com',
    passWordHash: '$2b$10$hashedvalue',
    role: Role.WORKER,
    firstName: 'John',
    lastName: 'Doe',
    phone: '+15551234567',
    location: 'New York, NY',
    bio: 'Software developer',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    };

    useCase = new UpdateAdminUserUseCase(userRepository);
  });

  it('1. should successfully update a user with valid partial data', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);

    const updatedEntity = new UserEntities({
      ...baseUser,
      firstName: 'Jane',
      lastName: 'Smith',
    });
    userRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto = new UpdateAdminUserInputDto({
      firstName: ' Jane ',
      lastName: ' Smith ',
    });

    const result = await useCase.execute('target-user-123', dto);

    expect(result).toBeInstanceOf(AdminUserResponseDto);
    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Smith');
    expect(result.email).toBe('target@example.com');
  });

  it('2. should call findById with the correct userId', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.update.mockResolvedValueOnce(baseUser);

    const dto = new UpdateAdminUserInputDto({ firstName: 'Test' });
    await useCase.execute('target-user-123', dto);

    expect(userRepository.findById).toHaveBeenCalledTimes(1);
    expect(userRepository.findById).toHaveBeenCalledWith('target-user-123');
  });

  it('3. should only send allowed editable fields to repository.update()', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.update.mockResolvedValueOnce(
      new UserEntities({
        ...baseUser,
        firstName: 'Updated',
        lastName: 'Name',
        email: 'new@example.com',
        phone: '+19995551234',
        location: 'Los Angeles, CA',
        bio: 'Updated bio',
      }),
    );

    const dto = new UpdateAdminUserInputDto({
      firstName: 'Updated',
      lastName: 'Name',
      email: 'new@example.com',
      phone: '+19995551234',
      location: 'Los Angeles, CA',
      bio: 'Updated bio',
    });

    userRepository.findByEmail.mockResolvedValueOnce(null);

    await useCase.execute('target-user-123', dto);

    expect(userRepository.update).toHaveBeenCalledWith('target-user-123', {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'new@example.com',
      phone: '+19995551234',
      location: 'Los Angeles, CA',
      bio: 'Updated bio',
    });
  });

  it('4. should not overwrite omitted fields with undefined', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.update.mockResolvedValueOnce(
      new UserEntities({ ...baseUser, firstName: 'OnlyThis' }),
    );

    const dto = new UpdateAdminUserInputDto({ firstName: 'OnlyThis' });
    await useCase.execute('target-user-123', dto);

    const updatePayload = userRepository.update.mock.calls[0][1];
    expect(updatePayload).toEqual({ firstName: 'OnlyThis' });
    expect(updatePayload).not.toHaveProperty('lastName');
    expect(updatePayload).not.toHaveProperty('email');
    expect(updatePayload).not.toHaveProperty('phone');
    expect(updatePayload).not.toHaveProperty('location');
    expect(updatePayload).not.toHaveProperty('bio');
  });

  it('5. should allow phone, location, and bio to be cleared with null', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);

    const clearedEntity = new UserEntities({
      ...baseUser,
      phone: null,
      location: null,
      bio: null,
    });
    userRepository.update.mockResolvedValueOnce(clearedEntity);

    const dto = new UpdateAdminUserInputDto({
      phone: null,
      location: null,
      bio: null,
    });

    await useCase.execute('target-user-123', dto);

    expect(userRepository.update).toHaveBeenCalledWith('target-user-123', {
      phone: null,
      location: null,
      bio: null,
    });
  });

  it('6. should throw NotFoundException when target user does not exist', async () => {
    userRepository.findById.mockResolvedValueOnce(null);

    const dto = new UpdateAdminUserInputDto({ firstName: 'Test' });

    await expect(useCase.execute('nonexistent-uuid', dto)).rejects.toThrow(
      NotFoundException,
    );

    expect(userRepository.findById).toHaveBeenCalledWith('nonexistent-uuid');
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('7. should succeed when email is changed and no conflicting user exists', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.findByEmail.mockResolvedValueOnce(null);

    const updatedEntity = new UserEntities({
      ...baseUser,
      email: 'new-unique@example.com',
    });
    userRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto = new UpdateAdminUserInputDto({
      email: 'new-unique@example.com',
    });
    const result = await useCase.execute('target-user-123', dto);

    expect(userRepository.findByEmail).toHaveBeenCalledWith(
      'new-unique@example.com',
    );
    expect(result.email).toBe('new-unique@example.com');
  });

  it('8. should throw ConflictException when email belongs to another user', async () => {
    const otherUser = new UserEntities({
      id: 'other-user-456',
      email: 'taken@example.com',
      role: Role.RECRUITER,
    });

    // First call — verify exception type
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.findByEmail.mockResolvedValueOnce(otherUser);

    const dto = new UpdateAdminUserInputDto({ email: 'taken@example.com' });

    await expect(useCase.execute('target-user-123', dto)).rejects.toThrow(
      ConflictException,
    );

    // Second call — verify exception message
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.findByEmail.mockResolvedValueOnce(otherUser);

    await expect(useCase.execute('target-user-123', dto)).rejects.toThrow(
      'User with this email already exists',
    );

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('9. should not conflict when the email belongs to the same user being updated', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);

    // findByEmail returns the same user (same id)
    userRepository.findByEmail.mockResolvedValueOnce(baseUser);

    const updatedEntity = new UserEntities({
      ...baseUser,
      email: 'target@example.com',
    });
    userRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto = new UpdateAdminUserInputDto({ email: 'target@example.com' });
    const result = await useCase.execute('target-user-123', dto);

    expect(result.email).toBe('target@example.com');
    expect(userRepository.update).toHaveBeenCalled();
  });

  it('10. should return result mapped through AdminUserMapper', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);

    const updatedEntity = new UserEntities({
      ...baseUser,
      bio: 'New bio text',
    });
    userRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto = new UpdateAdminUserInputDto({ bio: 'New bio text' });
    const result = await useCase.execute('target-user-123', dto);

    expect(result).toBeInstanceOf(AdminUserResponseDto);
    expect(result.id).toBe('target-user-123');
    expect(result.email).toBe('target@example.com');
    expect(result.role).toBe(Role.WORKER);
    expect(result.bio).toBe('New bio text');
    expect(result.isActive).toBe(true);
    expect(result.isBlocked).toBe(false);
    expect(result.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('11. should not expose passWordHash or passwordHash in the mapped DTO', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.update.mockResolvedValueOnce(baseUser);

    const dto = new UpdateAdminUserInputDto({ firstName: 'Test' });
    const result = (await useCase.execute(
      'target-user-123',
      dto,
    )) as unknown as Record<string, unknown>;

    expect(result.passwordHash).toBeUndefined();
    expect(result.passWordHash).toBeUndefined();
    expect(result.password).toBeUndefined();
  });

  it('12. should allow an empty update payload (no-op), consistent with existing use cases', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.update.mockResolvedValueOnce(baseUser);

    const dto = new UpdateAdminUserInputDto();

    const result = await useCase.execute('target-user-123', dto);

    expect(userRepository.update).toHaveBeenCalledWith('target-user-123', {});
    expect(result).toBeInstanceOf(AdminUserResponseDto);
  });

  it('13. should not forward sensitive/privileged fields even if injected into the DTO object', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.update.mockResolvedValueOnce(baseUser);

    const dto = new UpdateAdminUserInputDto({ firstName: 'Legit' });
    // Simulate malicious injection
    (dto as Record<string, unknown>).role = 'ADMIN';
    (dto as Record<string, unknown>).isActive = false;
    (dto as Record<string, unknown>).isBlocked = true;
    (dto as Record<string, unknown>).passwordHash = 'injected-hash';
    (dto as Record<string, unknown>).passWordHash = 'injected-hash';

    await useCase.execute('target-user-123', dto);

    const updatePayload = userRepository.update.mock.calls[0][1];
    expect(updatePayload).toEqual({ firstName: 'Legit' });
    expect(updatePayload).not.toHaveProperty('role');
    expect(updatePayload).not.toHaveProperty('isActive');
    expect(updatePayload).not.toHaveProperty('isBlocked');
    expect(updatePayload).not.toHaveProperty('passwordHash');
    expect(updatePayload).not.toHaveProperty('passWordHash');
  });

  it('14. should trim string values before sending to the repository', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.findByEmail.mockResolvedValueOnce(null);

    const updatedEntity = new UserEntities({
      ...baseUser,
      firstName: 'Trimmed',
      email: 'trimmed@example.com',
      bio: 'Trimmed bio',
    });
    userRepository.update.mockResolvedValueOnce(updatedEntity);

    const dto = new UpdateAdminUserInputDto({
      firstName: '  Trimmed  ',
      email: '  trimmed@example.com  ',
      bio: '  Trimmed bio  ',
    });

    await useCase.execute('target-user-123', dto);

    expect(userRepository.update).toHaveBeenCalledWith('target-user-123', {
      firstName: 'Trimmed',
      email: 'trimmed@example.com',
      bio: 'Trimmed bio',
    });
  });

  it('15. should not call findByEmail when email is not in the update payload', async () => {
    userRepository.findById.mockResolvedValueOnce(baseUser);
    userRepository.update.mockResolvedValueOnce(
      new UserEntities({ ...baseUser, firstName: 'NoEmailCheck' }),
    );

    const dto = new UpdateAdminUserInputDto({ firstName: 'NoEmailCheck' });
    await useCase.execute('target-user-123', dto);

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });
});
