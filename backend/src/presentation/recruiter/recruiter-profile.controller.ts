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
import { IGetRecruiterProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-profile.use-case.interface';
import { IUpdateRecruiterProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/update-recruiter-profile.use-case.interface';
import {
  IUploadRecruiterAvatarUseCase,
  UploadRecruiterAvatarResult,
} from '../../application/use-cases/recruiter-profile/interface/upload-recruiter-avatar.use-case.interface';
import { IGetRecruiterAvatarUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-avatar.use-case.interface';
import { IUpdateRecruiterPersonalProfileUseCase } from '../../application/use-cases/recruiter-profile/interface/update-recruiter-personal-profile.use-case.interface';
import { IGetRecruiterCompanyUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-company.use-case.interface';
import { IUpdateRecruiterCompanyUseCase } from '../../application/use-cases/recruiter-profile/interface/update-recruiter-company.use-case.interface';
import {
  IUploadRecruiterCompanyLogoUseCase,
  UploadRecruiterCompanyLogoResult,
} from '../../application/use-cases/recruiter-profile/interface/upload-recruiter-company-logo.use-case.interface';
import { IGetRecruiterCompanyLogoUseCase } from '../../application/use-cases/recruiter-profile/interface/get-recruiter-company-logo.use-case.interface';
import { CompanyResponseDto } from '../../application/dto/recruiter-profile/company-response.dto';
import { UpdateCompanyInputDto } from '../../application/dto/recruiter-profile/update-company-input.dto';
import { UpdateRecruiterProfileInputDto } from '../../application/dto/recruiter-profile/update-recruiter-profile-input.dto';
import { UpdateRecruiterPersonalProfileInputDto } from '../../application/dto/recruiter-profile/update-recruiter-personal-profile-input.dto';
import { RecruiterProfileResponseDto } from '../../application/dto/recruiter-profile/recruiter-profile-response.dto';
import { UserResponseDto } from '../../application/dto/user/user-response.dto';

export interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('recruiter')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RECRUITER)
export class RecruiterProfileController {
  constructor(
    @Inject(IGetRecruiterProfileUseCase)
    private readonly getRecruiterProfileUseCase: IGetRecruiterProfileUseCase,
    @Inject(IUpdateRecruiterProfileUseCase)
    private readonly updateRecruiterProfileUseCase: IUpdateRecruiterProfileUseCase,
    @Inject(IUpdateRecruiterPersonalProfileUseCase)
    private readonly updateRecruiterPersonalProfileUseCase: IUpdateRecruiterPersonalProfileUseCase,
    @Inject(IUploadRecruiterAvatarUseCase)
    private readonly uploadRecruiterAvatarUseCase: IUploadRecruiterAvatarUseCase,
    @Inject(IGetRecruiterAvatarUseCase)
    private readonly getRecruiterAvatarUseCase: IGetRecruiterAvatarUseCase,
    @Inject(IGetRecruiterCompanyUseCase)
    private readonly getRecruiterCompanyUseCase: IGetRecruiterCompanyUseCase,
    @Inject(IUpdateRecruiterCompanyUseCase)
    private readonly updateRecruiterCompanyUseCase: IUpdateRecruiterCompanyUseCase,
    @Inject(IUploadRecruiterCompanyLogoUseCase)
    private readonly uploadRecruiterCompanyLogoUseCase: IUploadRecruiterCompanyLogoUseCase,
    @Inject(IGetRecruiterCompanyLogoUseCase)
    private readonly getRecruiterCompanyLogoUseCase: IGetRecruiterCompanyLogoUseCase,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<RecruiterProfileResponseDto> {
    return this.getRecruiterProfileUseCase.execute(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRecruiterProfileInputDto,
  ): Promise<RecruiterProfileResponseDto> {
    return this.updateRecruiterProfileUseCase.execute(userId, dto);
  }

  @Patch('profile/personal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async updatePersonalProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRecruiterPersonalProfileInputDto,
  ): Promise<UserResponseDto> {
    return this.updateRecruiterPersonalProfileUseCase.execute(userId, dto);
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: UploadedMulterFile,
  ): Promise<UploadRecruiterAvatarResult> {
    if (!file) {
      throw new BadRequestException('Avatar image file is required');
    }

    return this.uploadRecruiterAvatarUseCase.execute({
      userId,
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Get('profile/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getAvatar(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.getRecruiterAvatarUseCase.execute(userId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(file.buffer);
  }

  @Get('company')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getCompany(
    @CurrentUser('id') userId: string,
  ): Promise<CompanyResponseDto> {
    return this.getRecruiterCompanyUseCase.execute(userId);
  }

  @Patch('company')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async updateCompany(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCompanyInputDto,
  ): Promise<CompanyResponseDto> {
    return this.updateRecruiterCompanyUseCase.execute(userId, dto);
  }

  @Post('company/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadCompanyLogo(
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: UploadedMulterFile,
  ): Promise<UploadRecruiterCompanyLogoResult> {
    if (!file) {
      throw new BadRequestException('Company logo image file is required');
    }

    return this.uploadRecruiterCompanyLogoUseCase.execute({
      userId,
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Get('company/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RECRUITER)
  async getCompanyLogo(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.getRecruiterCompanyLogoUseCase.execute(userId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(file.buffer);
  }
}
