import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import {
  ITokenService,
  InvalidTokenError,
  AccessTokenPayload,
} from '../../domain/services/token.service.interface';
import { AuthCookieService } from '../auth/services/auth-cookie.service';

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
    @Inject(ITokenService)
    private readonly tokenService: ITokenService,
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    private readonly authCookieService: AuthCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = this.authCookieService.getAccessToken(request);

    if (
      !cookieToken ||
      typeof cookieToken !== 'string' ||
      !cookieToken.trim()
    ) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    const token = cookieToken.trim();

    let payload: AccessTokenPayload;
    try {
      payload = await this.tokenService.verifyAccessToken(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw error;
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
