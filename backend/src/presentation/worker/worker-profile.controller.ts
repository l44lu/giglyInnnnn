import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '../../domain/enums/role.enum';
import { IGetWorkerProfileUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-profile.use-case.interface';
import { IUpdateWorkerProfileUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-profile.use-case.interface';
import {
  IUploadWorkerAvatarUseCase,
  UploadWorkerAvatarResult,
} from '../../application/use-cases/worker-profile/interface/upload-worker-avatar.use-case.interface';
import { IGetWorkerAvatarUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-avatar.use-case.interface';
import { IUpdateWorkerPersonalProfileUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-personal-profile.use-case.interface';
import { UpdateWorkerProfileInputDto } from '../../application/dto/worker-profile/update-worker-profile-input.dto';
import { UpdateWorkerPersonalProfileInputDto } from '../../application/dto/worker-profile/update-worker-personal-profile-input.dto';
import { WorkerProfileResponseDto } from '../../application/dto/worker-profile/worker-profile-response.dto';
import { UserResponseDto } from '../../application/dto/user/user-response.dto';

export interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('worker')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.WORKER)
export class WorkerProfileController {
  constructor(
    @Inject(IGetWorkerProfileUseCase)
    private readonly getWorkerProfileUseCase: IGetWorkerProfileUseCase,
    @Inject(IUpdateWorkerProfileUseCase)
    private readonly updateWorkerProfileUseCase: IUpdateWorkerProfileUseCase,
    @Inject(IUpdateWorkerPersonalProfileUseCase)
    private readonly updateWorkerPersonalProfileUseCase: IUpdateWorkerPersonalProfileUseCase,
    @Inject(IUploadWorkerAvatarUseCase)
    private readonly uploadWorkerAvatarUseCase: IUploadWorkerAvatarUseCase,
    @Inject(IGetWorkerAvatarUseCase)
    private readonly getWorkerAvatarUseCase: IGetWorkerAvatarUseCase,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<WorkerProfileResponseDto> {
    return this.getWorkerProfileUseCase.execute(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWorkerProfileInputDto,
  ): Promise<WorkerProfileResponseDto> {
    return this.updateWorkerProfileUseCase.execute(userId, dto);
  }

  @Patch('profile/personal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async updatePersonalProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWorkerPersonalProfileInputDto,
  ): Promise<UserResponseDto> {
    return this.updateWorkerPersonalProfileUseCase.execute(userId, dto);
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: UploadedMulterFile,
  ): Promise<UploadWorkerAvatarResult> {
    if (!file) {
      throw new BadRequestException('Avatar image file is required');
    }

    return this.uploadWorkerAvatarUseCase.execute({
      userId,
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Get('profile/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async getAvatar(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.getWorkerAvatarUseCase.execute(userId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(file.buffer);
  }
}
