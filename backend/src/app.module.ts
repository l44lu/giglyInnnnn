import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { SecurityHeadersMiddleware } from './presentation/middleware/security-headers.middleware';
import { AuthController } from './presentation/auth/auth.controller';
import { WorkerProfileController } from './presentation/worker/worker-profile.controller';
import { RecruiterProfileController } from './presentation/recruiter/recruiter-profile.controller';
import { SkillsController } from './presentation/skills/skills.controller';
import { AdminUserManagementController } from './presentation/admin/admin-user-management.controller';
import { HealthController } from './presentation/health/health.controller';
import { LoginUseCase } from './application/use-cases/auth/implementation/login.use-case';
import { RefreshUseCase } from './application/use-cases/auth/implementation/refresh.use-case';
import { SendOtpUseCase } from './application/use-cases/auth/implementation/send-otp.use-case';
import { VerifyOtpAndRegisterUseCase } from './application/use-cases/auth/implementation/verify-otp-register.use-case';
import { GetMeUseCase } from './application/use-cases/auth/implementation/get-me.use-case';
import { LogoutUseCase } from './application/use-cases/auth/implementation/logout.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/auth/implementation/forgot-password.use-case';
import { VerifyPasswordResetOtpUseCase } from './application/use-cases/auth/implementation/verify-password-reset-otp.use-case';
import { ResetPasswordUseCase } from './application/use-cases/auth/implementation/reset-password.use-case';
import { IChangePasswordUseCase } from './application/use-cases/auth/interface/change-password.use-case.interface';
import { ChangePasswordUseCase } from './application/use-cases/auth/implementation/change-password.use-case';
import { ILoginUseCase } from './application/use-cases/auth/interface/login.use-case.interface';
import { IRefreshUseCase } from './application/use-cases/auth/interface/refresh.use-case.interface';
import { ISendOtpUseCase } from './application/use-cases/auth/interface/send-otp.use-case.interface';
import { IVerifyOtpAndRegisterUseCase } from './application/use-cases/auth/interface/verify-otp-register.use-case.interface';
import { IGetMeUseCase } from './application/use-cases/auth/interface/get-me.use-case.interface';
import { ILogoutUseCase } from './application/use-cases/auth/interface/logout.use-case.interface';
import { IForgotPasswordUseCase } from './application/use-cases/auth/interface/forgot-password.use-case.interface';
import { IVerifyPasswordResetOtpUseCase } from './application/use-cases/auth/interface/verify-password-reset-otp.use-case.interface';
import { IResetPasswordUseCase } from './application/use-cases/auth/interface/reset-password.use-case.interface';
import { IGetWorkerProfileUseCase } from './application/use-cases/worker-profile/interface/get-worker-profile.use-case.interface';
import { GetWorkerProfileUseCase } from './application/use-cases/worker-profile/implementation/get-worker-profile.use-case';
import { IUpdateWorkerProfileUseCase } from './application/use-cases/worker-profile/interface/update-worker-profile.use-case.interface';
import { UpdateWorkerProfileUseCase } from './application/use-cases/worker-profile/implementation/update-worker-profile.use-case';
import { IUploadWorkerAvatarUseCase } from './application/use-cases/worker-profile/interface/upload-worker-avatar.use-case.interface';
import { UploadWorkerAvatarUseCase } from './application/use-cases/worker-profile/implementation/upload-worker-avatar.use-case';
import { IGetWorkerAvatarUseCase } from './application/use-cases/worker-profile/interface/get-worker-avatar.use-case.interface';
import { GetWorkerAvatarUseCase } from './application/use-cases/worker-profile/implementation/get-worker-avatar.use-case';
import { IUpdateWorkerPersonalProfileUseCase } from './application/use-cases/worker-profile/interface/update-worker-personal-profile.use-case.interface';
import { UpdateWorkerPersonalProfileUseCase } from './application/use-cases/worker-profile/implementation/update-worker-personal-profile.use-case';
import { IGetSkillsCatalogUseCase } from './application/use-cases/worker-profile/interface/get-skills-catalog.use-case.interface';
import { GetSkillsCatalogUseCase } from './application/use-cases/worker-profile/implementation/get-skills-catalog.use-case';
import { IGetWorkerSkillsUseCase } from './application/use-cases/worker-profile/interface/get-worker-skills.use-case.interface';
import { GetWorkerSkillsUseCase } from './application/use-cases/worker-profile/implementation/get-worker-skills.use-case';
import { IUpdateWorkerSkillsUseCase } from './application/use-cases/worker-profile/interface/update-worker-skills.use-case.interface';
import { UpdateWorkerSkillsUseCase } from './application/use-cases/worker-profile/implementation/update-worker-skills.use-case';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { PermissionsGuard } from './presentation/guards/permissions.guard';
import { OtpRateLimitGuard } from './presentation/guards/otp-rate-limit.guard';
import { LoginRateLimitGuard } from './presentation/guards/login-rate-limit.guard';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IUserRepository } from './domain/repositories/user.repository.interface';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { IRefreshTokenRepository } from './domain/repositories/refresh-token.repository.interface';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { IOtpRepository } from './domain/repositories/otp.repository.interface';
import { PrismaOtpRepository } from './infrastructure/repositories/prisma-otp.repository';
import { IPasswordResetRepository } from './domain/repositories/password-reset.repository.interface';
import { PrismaPasswordResetRepository } from './infrastructure/repositories/prisma-password-reset.repository';
import { IAuthorizationRepository } from './domain/repositories/authorization.repository.interface';
import { PrismaAuthorizationRepository } from './infrastructure/repositories/prisma-authorization.repository';
import { IWorkerProfileRepository } from './domain/repositories/worker-profile.repository.interface';
import { PrismaWorkerProfileRepository } from './infrastructure/repositories/prisma-worker-profile.repository';
import { ISkillRepository } from './domain/repositories/skill.repository.interface';
import { PrismaSkillRepository } from './infrastructure/repositories/prisma-skill.repository';
import { IWorkerSkillRepository } from './domain/repositories/worker-skill.repository.interface';
import { PrismaWorkerSkillRepository } from './infrastructure/repositories/prisma-worker-skill.repository';
import { IEmailService } from './domain/services/email.service.interface';
import { NodemailerEmailService } from './infrastructure/email/nodemailer-email.service';
import { IOtpHashingService } from './domain/services/otp-hashing.service.interface';
import { OtpHashingService } from './infrastructure/crypto/otp-hashing.service';
import { IRefreshTokenHashingService } from './domain/services/refresh-token-hashing.service.interface';
import { RefreshTokenHashingService } from './infrastructure/crypto/refresh-token-hashing.service';
import { IFileStorageService } from './domain/services/file-storage.service.interface';
import { S3FileStorageService } from './infrastructure/storage/s3-file-storage.service';
import { IRecruiterProfileRepository } from './domain/repositories/recruiter-profile.repository.interface';
import { PrismaRecruiterProfileRepository } from './infrastructure/repositories/prisma-recruiter-profile.repository';
import { ICompanyRepository } from './domain/repositories/company.repository.interface';
import { PrismaCompanyRepository } from './infrastructure/repositories/prisma-company.repository';
import { IGetRecruiterProfileUseCase } from './application/use-cases/recruiter-profile/interface/get-recruiter-profile.use-case.interface';
import { GetRecruiterProfileUseCase } from './application/use-cases/recruiter-profile/implementation/get-recruiter-profile.use-case';
import { IUpdateRecruiterProfileUseCase } from './application/use-cases/recruiter-profile/interface/update-recruiter-profile.use-case.interface';
import { UpdateRecruiterProfileUseCase } from './application/use-cases/recruiter-profile/implementation/update-recruiter-profile.use-case';
import { IUpdateRecruiterPersonalProfileUseCase } from './application/use-cases/recruiter-profile/interface/update-recruiter-personal-profile.use-case.interface';
import { UpdateRecruiterPersonalProfileUseCase } from './application/use-cases/recruiter-profile/implementation/update-recruiter-personal-profile.use-case';
import { IGetRecruiterAvatarUseCase } from './application/use-cases/recruiter-profile/interface/get-recruiter-avatar.use-case.interface';
import { GetRecruiterAvatarUseCase } from './application/use-cases/recruiter-profile/implementation/get-recruiter-avatar.use-case';
import { IUploadRecruiterAvatarUseCase } from './application/use-cases/recruiter-profile/interface/upload-recruiter-avatar.use-case.interface';
import { UploadRecruiterAvatarUseCase } from './application/use-cases/recruiter-profile/implementation/upload-recruiter-avatar.use-case';
import { IGetRecruiterCompanyUseCase } from './application/use-cases/recruiter-profile/interface/get-recruiter-company.use-case.interface';
import { GetRecruiterCompanyUseCase } from './application/use-cases/recruiter-profile/implementation/get-recruiter-company.use-case';
import { IUpdateRecruiterCompanyUseCase } from './application/use-cases/recruiter-profile/interface/update-recruiter-company.use-case.interface';
import { UpdateRecruiterCompanyUseCase } from './application/use-cases/recruiter-profile/implementation/update-recruiter-company.use-case';
import { IUploadRecruiterCompanyLogoUseCase } from './application/use-cases/recruiter-profile/interface/upload-recruiter-company-logo.use-case.interface';
import { UploadRecruiterCompanyLogoUseCase } from './application/use-cases/recruiter-profile/implementation/upload-recruiter-company-logo.use-case';
import { IGetRecruiterCompanyLogoUseCase } from './application/use-cases/recruiter-profile/interface/get-recruiter-company-logo.use-case.interface';
import { GetRecruiterCompanyLogoUseCase } from './application/use-cases/recruiter-profile/implementation/get-recruiter-company-logo.use-case';
import { IListAdminUserUseCase } from './application/use-cases/admin-user-management/interface/list-admin-users.use-case.interface';
import { ListAdminUserUseCase } from './application/use-cases/admin-user-management/implementation/list-admin-users.use-case';
import { IGetAdminUserUseCase } from './application/use-cases/admin-user-management/interface/get-admin-user.use-case.interface';
import { GetAdminUserUseCase } from './application/use-cases/admin-user-management/implementation/get-admin-user.use-case';
import { IUpdateAdminUserUseCase } from './application/use-cases/admin-user-management/interface/update-admin-user.use-case.interface';
import { UpdateAdminUserUseCase } from './application/use-cases/admin-user-management/implementation/update-admin-user.use-case';
import { IChangeAdminUserRoleUseCase } from './application/use-cases/admin-user-management/interface/change-admin-user-role.use-case.interface';
import { ChangeAdminUserRoleUseCase } from './application/use-cases/admin-user-management/implementation/change-admin-user-role.use-case';
import { ISetAdminUserBlockStatusUseCase } from './application/use-cases/admin-user-management/interface/set-admin-user-block-status.use-case.interface';
import { SetAdminUserBlockStatusUseCase } from './application/use-cases/admin-user-management/implementation/set-admin-user-block-status.use-case';
import { IDeactivateAdminUserUseCase } from './application/use-cases/admin-user-management/interface/deactivate-admin-user.use-case.interface';
import { DeactivateAdminUserUseCase } from './application/use-cases/admin-user-management/implementation/deactivate-admin-user.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const issuer = configService.get<string>('JWT_ISSUER') ?? 'gigly-auth';
        const audience =
          configService.get<string>('JWT_AUDIENCE') ?? 'gigly-app';
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
              '1h') as JwtSignOptions['expiresIn'],
            issuer,
            audience,
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer,
            audience,
          },
        };
      },
    }),
  ],
  controllers: [
    AuthController,
    WorkerProfileController,
    RecruiterProfileController,
    SkillsController,
    AdminUserManagementController,
    HealthController,
  ],
  providers: [
    PrismaService,
    {
      provide: ISendOtpUseCase,
      useClass: SendOtpUseCase,
    },
    {
      provide: IVerifyOtpAndRegisterUseCase,
      useClass: VerifyOtpAndRegisterUseCase,
    },
    {
      provide: ILoginUseCase,
      useClass: LoginUseCase,
    },
    {
      provide: IRefreshUseCase,
      useClass: RefreshUseCase,
    },
    {
      provide: IUserRepository,
      useClass: PrismaUserRepository,
    },
    {
      provide: IRefreshTokenRepository,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: IOtpRepository,
      useClass: PrismaOtpRepository,
    },
    {
      provide: IPasswordResetRepository,
      useClass: PrismaPasswordResetRepository,
    },
    {
      provide: IAuthorizationRepository,
      useClass: PrismaAuthorizationRepository,
    },
    {
      provide: IWorkerProfileRepository,
      useClass: PrismaWorkerProfileRepository,
    },
    {
      provide: ISkillRepository,
      useClass: PrismaSkillRepository,
    },
    {
      provide: IWorkerSkillRepository,
      useClass: PrismaWorkerSkillRepository,
    },
    {
      provide: IEmailService,
      useClass: NodemailerEmailService,
    },
    {
      provide: IOtpHashingService,
      useClass: OtpHashingService,
    },
    {
      provide: IRefreshTokenHashingService,
      useClass: RefreshTokenHashingService,
    },
    {
      provide: IFileStorageService,
      useClass: S3FileStorageService,
    },
    {
      provide: IGetMeUseCase,
      useClass: GetMeUseCase,
    },
    {
      provide: ILogoutUseCase,
      useClass: LogoutUseCase,
    },
    {
      provide: IForgotPasswordUseCase,
      useClass: ForgotPasswordUseCase,
    },
    {
      provide: IVerifyPasswordResetOtpUseCase,
      useClass: VerifyPasswordResetOtpUseCase,
    },
    {
      provide: IResetPasswordUseCase,
      useClass: ResetPasswordUseCase,
    },
    {
      provide: IChangePasswordUseCase,
      useClass: ChangePasswordUseCase,
    },
    {
      provide: IGetWorkerProfileUseCase,
      useClass: GetWorkerProfileUseCase,
    },
    {
      provide: IUpdateWorkerProfileUseCase,
      useClass: UpdateWorkerProfileUseCase,
    },
    {
      provide: IUploadWorkerAvatarUseCase,
      useClass: UploadWorkerAvatarUseCase,
    },
    {
      provide: IGetWorkerAvatarUseCase,
      useClass: GetWorkerAvatarUseCase,
    },
    {
      provide: IUpdateWorkerPersonalProfileUseCase,
      useClass: UpdateWorkerPersonalProfileUseCase,
    },
    {
      provide: IGetSkillsCatalogUseCase,
      useClass: GetSkillsCatalogUseCase,
    },
    {
      provide: IGetWorkerSkillsUseCase,
      useClass: GetWorkerSkillsUseCase,
    },
    {
      provide: IUpdateWorkerSkillsUseCase,
      useClass: UpdateWorkerSkillsUseCase,
    },
    {
      provide: IRecruiterProfileRepository,
      useClass: PrismaRecruiterProfileRepository,
    },
    {
      provide: ICompanyRepository,
      useClass: PrismaCompanyRepository,
    },
    {
      provide: IGetRecruiterProfileUseCase,
      useClass: GetRecruiterProfileUseCase,
    },
    {
      provide: IUpdateRecruiterProfileUseCase,
      useClass: UpdateRecruiterProfileUseCase,
    },
    {
      provide: IUpdateRecruiterPersonalProfileUseCase,
      useClass: UpdateRecruiterPersonalProfileUseCase,
    },
    {
      provide: IGetRecruiterAvatarUseCase,
      useClass: GetRecruiterAvatarUseCase,
    },
    {
      provide: IUploadRecruiterAvatarUseCase,
      useClass: UploadRecruiterAvatarUseCase,
    },
    {
      provide: IGetRecruiterCompanyUseCase,
      useClass: GetRecruiterCompanyUseCase,
    },
    {
      provide: IUpdateRecruiterCompanyUseCase,
      useClass: UpdateRecruiterCompanyUseCase,
    },
    {
      provide: IUploadRecruiterCompanyLogoUseCase,
      useClass: UploadRecruiterCompanyLogoUseCase,
    },
    {
      provide: IGetRecruiterCompanyLogoUseCase,
      useClass: GetRecruiterCompanyLogoUseCase,
    },
    {
      provide: IListAdminUserUseCase,
      useClass: ListAdminUserUseCase,
    },
    {
      provide: IGetAdminUserUseCase,
      useClass: GetAdminUserUseCase,
    },
    {
      provide: IUpdateAdminUserUseCase,
      useClass: UpdateAdminUserUseCase,
    },
    {
      provide: IChangeAdminUserRoleUseCase,
      useClass: ChangeAdminUserRoleUseCase,
    },
    {
      provide: ISetAdminUserBlockStatusUseCase,
      useClass: SetAdminUserBlockStatusUseCase,
    },
    {
      provide: IDeactivateAdminUserUseCase,
      useClass: DeactivateAdminUserUseCase,
    },
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    OtpRateLimitGuard,
    LoginRateLimitGuard,
    SecurityHeadersMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}
