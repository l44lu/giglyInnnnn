import { Controller, Get, Put, Body, Inject, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '../../domain/enums/role.enum';
import { IGetSkillsCatalogUseCase } from '../../application/use-cases/worker-profile/interface/get-skills-catalog.use-case.interface';
import { IGetWorkerSkillsUseCase } from '../../application/use-cases/worker-profile/interface/get-worker-skills.use-case.interface';
import { IUpdateWorkerSkillsUseCase } from '../../application/use-cases/worker-profile/interface/update-worker-skills.use-case.interface';
import { SkillResponseDto } from '../../application/dto/worker-profile/skill-response.dto';
import { WorkerSkillResponseDto } from '../../application/dto/worker-profile/worker-skill-response.dto';
import { UpdateWorkerSkillsInputDto } from '../../application/dto/worker-profile/update-worker-skills-input.dto';

@Controller()
export class SkillsController {
  constructor(
    @Inject(IGetSkillsCatalogUseCase)
    private readonly getSkillsCatalogUseCase: IGetSkillsCatalogUseCase,
    @Inject(IGetWorkerSkillsUseCase)
    private readonly getWorkerSkillsUseCase: IGetWorkerSkillsUseCase,
    @Inject(IUpdateWorkerSkillsUseCase)
    private readonly updateWorkerSkillsUseCase: IUpdateWorkerSkillsUseCase,
  ) {}

  @Get('skills')
  async getCatalog(): Promise<SkillResponseDto[]> {
    return this.getSkillsCatalogUseCase.execute();
  }

  @Get('worker/skills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async getWorkerSkills(
    @CurrentUser('id') userId: string,
  ): Promise<WorkerSkillResponseDto[]> {
    return this.getWorkerSkillsUseCase.execute(userId);
  }

  @Put('worker/skills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WORKER)
  async updateWorkerSkills(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWorkerSkillsInputDto,
  ): Promise<WorkerSkillResponseDto[]> {
    return this.updateWorkerSkillsUseCase.execute(userId, dto);
  }
}
