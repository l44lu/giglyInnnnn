import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ChangePasswordUseCase } from './change-password.use-case';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { UserEntities, Role } from '../../../../domain/entities/user.entities';
import { ChangePasswordInputDto } from '../../../dto/auth/change-password-input.dto';

jest.mock('bcrypt');

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  const initialHashedPassword =
    '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12';

  const mockUser = new UserEntities({
    id: 'user-uuid-1',
    email: 'worker@example.com',
    passWordHash: initialHashedPassword,
    role: Role.WORKER,
    firstName: 'Alex',
    lastName: 'Morgan',
    isActive: true,
    isBlocked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePassword: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    useCase = new ChangePasswordUseCase(userRepository);
  });

  it('should throw NotFoundException when user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    const input: ChangePasswordInputDto = {
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    };

    await expect(useCase.execute('non-existent-user', input)).rejects.toThrow(
      NotFoundException,
    );
    await expect(useCase.execute('non-existent-user', input)).rejects.toThrow(
      'User not found',
    );
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when user account is inactive or blocked', async () => {
    const inactiveUser = new UserEntities({
      ...mockUser,
      isActive: false,
    });
    userRepository.findById.mockResolvedValue(inactiveUser);

    const input: ChangePasswordInputDto = {
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    };

    await expect(useCase.execute('user-uuid-1', input)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(useCase.execute('user-uuid-1', input)).rejects.toThrow(
      'User account is inactive or blocked',
    );
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when currentPassword is missing or not a string', async () => {
    userRepository.findById.mockResolvedValue(mockUser);

    const input = {
      currentPassword: '',
      newPassword: 'ValidNewPassword123!',
    } as ChangePasswordInputDto;

    await expect(useCase.execute('user-uuid-1', input)).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute('user-uuid-1', input)).rejects.toThrow(
      'Current password is required',
    );
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when newPassword is shorter than 8 characters', async () => {
    userRepository.findById.mockResolvedValue(mockUser);

    const input: ChangePasswordInputDto = {
      currentPassword: 'CurrentPassword123!',
      newPassword: 'short',
    };

    await expect(useCase.execute('user-uuid-1', input)).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute('user-uuid-1', input)).rejects.toThrow(
      'Password must be at least 8 characters long',
    );
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when current password does not match stored hash', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const input: ChangePasswordInputDto = {
      currentPassword: 'WrongPassword123!',
      newPassword: 'NewPassword123!',
    };

    await expect(useCase.execute('user-uuid-1', input)).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute('user-uuid-1', input)).rejects.toThrow(
      'Current password is incorrect',
    );
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'WrongPassword123!',
      mockUser.passWordHash,
    );
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should successfully change password when current password is correct', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.updatePassword.mockResolvedValue(undefined);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue(
      '$2b$10$newlyHashedPasswordString99',
    );

    const input: ChangePasswordInputDto = {
      currentPassword: 'CorrectPassword123!',
      newPassword: 'NewSecurePassword456!',
    };

    const result = await useCase.execute('user-uuid-1', input);

    expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-1');
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'CorrectPassword123!',
      mockUser.passWordHash,
    );
    expect(bcrypt.hash).toHaveBeenCalledWith('NewSecurePassword456!', 10);
    expect(userRepository.updatePassword).toHaveBeenCalledWith(
      'user-uuid-1',
      '$2b$10$newlyHashedPasswordString99',
    );
    expect(result).toEqual({
      message: 'Password changed successfully',
    });
  });

  it('should never expose or return password hashes in the response', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.updatePassword.mockResolvedValue(undefined);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$superSecretHash');

    const input: ChangePasswordInputDto = {
      currentPassword: 'CorrectPassword123!',
      newPassword: 'NewSecurePassword456!',
    };

    const result = await useCase.execute('user-uuid-1', input);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('passWordHash');
    expect(result).not.toHaveProperty('newPassword');
    expect(result).not.toHaveProperty('currentPassword');
    expect(JSON.stringify(result)).not.toContain('$2b$10$superSecretHash');
  });

  it('should ensure userId is taken strictly from the execution parameter and not body', async () => {
    const userWithCustomId = new UserEntities({
      ...mockUser,
      id: 'authenticated-param-user-id',
    });
    userRepository.findById.mockResolvedValue(userWithCustomId);
    userRepository.updatePassword.mockResolvedValue(undefined);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedPassword');

    const input: ChangePasswordInputDto = {
      currentPassword: 'CorrectPassword123!',
      newPassword: 'NewSecurePassword456!',
    };

    await useCase.execute('authenticated-param-user-id', input);

    expect(userRepository.findById).toHaveBeenCalledWith(
      'authenticated-param-user-id',
    );
    expect(userRepository.updatePassword).toHaveBeenCalledWith(
      'authenticated-param-user-id',
      '$2b$10$hashedPassword',
    );
  });
});
