import {
  Controller,
  Get,
  Patch,
  Inject,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '../../domain/enums/role.enum';
import { IListAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/list-admin-users.use-case.interface';
import { IGetAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/get-admin-user.use-case.interface';
import { IUpdateAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/update-admin-user.use-case.interface';
import { IChangeAdminUserRoleUseCase } from '../../application/use-cases/admin-user-management/interface/change-admin-user-role.use-case.interface';
import { ISetAdminUserBlockStatusUseCase } from '../../application/use-cases/admin-user-management/interface/set-admin-user-block-status.use-case.interface';
import { IDeactivateAdminUserUseCase } from '../../application/use-cases/admin-user-management/interface/deactivate-admin-user.use-case.interface';
import { AdminUserResponseDto } from '../../application/dto/admin-user-management/admin-user.response.dto';
import { UpdateAdminUserInputDto } from '../../application/dto/admin-user-management/update-admin-user-input.dto';
import { ChangeAdminUserRoleInputDto } from '../../application/dto/admin-user-management/change-admin-user-role-input.dto';
import { SetAdminUserBlockStatusInputDto } from '../../application/dto/admin-user-management/set-admin-user-block-status-input.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUserManagementController {
  constructor(
    @Inject(IListAdminUserUseCase)
    private readonly listAdminUserUseCase: IListAdminUserUseCase,
    @Inject(IGetAdminUserUseCase)
    private readonly getAdminUserUseCase: IGetAdminUserUseCase,
    @Inject(IUpdateAdminUserUseCase)
    private readonly updateAdminUserUseCase: IUpdateAdminUserUseCase,
    @Inject(IChangeAdminUserRoleUseCase)
    private readonly changeAdminUserRoleUseCase: IChangeAdminUserRoleUseCase,
    @Inject(ISetAdminUserBlockStatusUseCase)
    private readonly setAdminUserBlockStatusUseCase: ISetAdminUserBlockStatusUseCase,
    @Inject(IDeactivateAdminUserUseCase)
    private readonly deactivateAdminUserUseCase: IDeactivateAdminUserUseCase,
  ) {}

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUsers(): Promise<AdminUserResponseDto[]> {
    return this.listAdminUserUseCase.execute();
  }

  @Get('users/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUser(
    @Param('userId') userId: string,
  ): Promise<AdminUserResponseDto> {
    return this.getAdminUserUseCase.execute(userId);
  }

  @Patch('users/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateUser(
    @Param('userId') userId: string,
    @Body() dto: UpdateAdminUserInputDto,
  ): Promise<AdminUserResponseDto> {
    return this.updateAdminUserUseCase.execute(userId, dto);
  }

  @Patch('users/:userId/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async changeUserRole(
    @Param('userId') userId: string,
    @Body() dto: ChangeAdminUserRoleInputDto,
    @CurrentUser('id') currentAdminId: string,
  ): Promise<AdminUserResponseDto> {
    return this.changeAdminUserRoleUseCase.execute(userId, dto, currentAdminId);
  }

  @Patch('users/:userId/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async setUserBlockStatus(
    @Param('userId') userId: string,
    @Body() dto: SetAdminUserBlockStatusInputDto,
    @CurrentUser('id') currentAdminId: string,
  ): Promise<AdminUserResponseDto> {
    return this.setAdminUserBlockStatusUseCase.execute(
      userId,
      dto.isBlocked,
      currentAdminId,
    );
  }

  @Patch('users/:userId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deactivateUser(
    @Param('userId') userId: string,
    @CurrentUser('id') currentAdminId: string,
  ): Promise<AdminUserResponseDto> {
    return this.deactivateAdminUserUseCase.execute(userId, currentAdminId);
  }
}
