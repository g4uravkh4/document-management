import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthUser } from './auth-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: AuthUser }>();

    const token = this.extractBearerToken(request.headers);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
      request.user = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }

  private extractBearerToken(headers: Record<string, string>): string | null {
    const header = headers.authorization ?? headers.Authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length).trim();
  }
}
