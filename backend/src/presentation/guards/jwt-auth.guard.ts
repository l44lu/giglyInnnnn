import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

export interface AuthenticatedUserPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'WORKER' | 'RECRUITER';
}

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: 'ADMIN' | 'WORKER' | 'RECRUITER';
    };
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Invalid authorization header format. Expected "Bearer <token>"',
      );
    }

    let payload: AuthenticatedUserPayload;
    try {
      const issuer =
        this.configService.get<string>('JWT_ISSUER') ?? 'gigly-auth';
      const audience =
        this.configService.get<string>('JWT_AUDIENCE') ?? 'gigly-app';

      payload = await this.jwtService.verifyAsync<AuthenticatedUserPayload>(
        token,
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          algorithms: ['HS256'],
          issuer,
          audience,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Account status check (9.4): Resolve current user in real time from database
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.canAuthenticate()) {
      throw new UnauthorizedException('User account is inactive or blocked');
    }

    // Attach the authenticated user info directly to the request object
    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return true;
  }
}
