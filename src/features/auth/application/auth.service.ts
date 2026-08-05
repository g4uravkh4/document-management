import { createHash, randomBytes, randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { AuthUser } from '../../../common/auth/auth-user.interface';
import { MailService } from '../../../common/mail/mail.service';
import { USER_SETTING_REPOSITORY } from '../../settings/domain/ports';
import type { UserSettingRepository } from '../../settings/domain/ports';
import { PublicUser, USER_REPOSITORY } from '../../users/domain/ports';
import type { UserRepository } from '../../users/domain/ports';
import {
  REFRESH_TOKEN_REPOSITORY,
  VERIFICATION_CODE_REPOSITORY,
} from '../domain/ports';
import type {
  RefreshTokenRepository,
  VerificationCodePurpose,
  VerificationCodeRepository,
} from '../domain/ports';

const CODE_TTL_MS = 15 * 60 * 1000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export interface RegisterResult {
  message: string;
  email: string;
  delivered: boolean;
  devCode?: string;
}

export interface ForgotPasswordResult {
  message: string;
  delivered: boolean;
  devCode?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(VERIFICATION_CODE_REPOSITORY)
    private readonly verificationCodes: VerificationCodeRepository,
    @Inject(USER_SETTING_REPOSITORY)
    private readonly settings: UserSettingRepository,
    private readonly mail: MailService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const hash = this.hashToken(refreshToken);
    const stored = await this.refreshTokens.findValid(hash, new Date());
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate the refresh token.
    await this.refreshTokens.removeByTokenHash(hash);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokens.removeByTokenHash(this.hashToken(refreshToken));
  }

  async me(user: AuthUser): Promise<PublicUser> {
    const found = await this.users.findById(user.sub);
    if (!found) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.toPublic(found);
  }

  async register(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<RegisterResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing?.isActive) {
      throw new ConflictException('An account with this email already exists');
    }

    if (!existing) {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await this.users.create({
        email,
        name: input.name.trim(),
        passwordHash,
        role: 'CLIENT',
        isActive: false,
      });
      await this.settings.upsert(user.id, {});
    }

    const code = await this.createCode(email, 'SIGNUP');
    const result = await this.mail.sendVerificationCode(email, code, 'SIGNUP');
    return {
      message: 'Verification code sent. Check your email.',
      email,
      delivered: result.delivered,
      ...(result.devCode !== undefined ? { devCode: result.devCode } : {}),
    };
  }

  async verifyEmail(input: {
    email: string;
    code: string;
  }): Promise<AuthTokens> {
    const email = input.email.trim().toLowerCase();
    const valid = await this.consumeCode(email, 'SIGNUP', input.code);
    if (!valid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.users.update(user.id, { isActive: true });
    return this.issueTokens(user);
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    const message =
      'If an account exists for that email, a reset code has been sent.';

    if (user?.isActive) {
      const code = await this.createCode(normalized, 'RESET_PASSWORD');
      const result = await this.mail.sendVerificationCode(
        normalized,
        code,
        'RESET_PASSWORD',
      );
      return {
        message,
        delivered: result.delivered,
        ...(result.devCode !== undefined ? { devCode: result.devCode } : {}),
      };
    }

    return { message, delivered: false };
  }

  async resetPassword(input: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const email = input.email.trim().toLowerCase();
    const valid = await this.consumeCode(email, 'RESET_PASSWORD', input.code);
    if (!valid) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await this.users.update(user.id, { passwordHash });
    await this.refreshTokens.removeAllForUser(user.id);
    return { message: 'Password updated. You can now sign in.' };
  }

  private async createCode(
    email: string,
    purpose: VerificationCodePurpose,
  ): Promise<string> {
    await this.verificationCodes.markAllUsedFor(email, purpose);
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    await this.verificationCodes.create({
      email,
      purpose,
      code,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    return code;
  }

  private async consumeCode(
    email: string,
    purpose: VerificationCodePurpose,
    code: string,
  ): Promise<boolean> {
    const stored = await this.verificationCodes.findLatestByEmailAndPurpose(
      email,
      purpose,
    );
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      return false;
    }
    if (stored.code !== code) {
      return false;
    }
    await this.verificationCodes.markUsed(stored.id);
    return true;
  }

  private async issueTokens(
    user: PublicUser & { passwordHash: string },
  ): Promise<AuthTokens> {
    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ??
        '15m') as StringValue,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const expiresInSeconds =
      this.parseTtlSeconds(this.config.get<string>('JWT_REFRESH_TTL')) ??
      30 * 24 * 3600;
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    });

    return {
      accessToken,
      refreshToken,
      user: this.toPublic(user),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtlSeconds(ttl?: string): number | null {
    if (!ttl) {
      return null;
    }
    const match = /^(\d+)([smhd])?$/.exec(ttl);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    const unit = match[2] ?? 's';
    const multiplier: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * multiplier[unit];
  }

  private toPublic(user: PublicUser & { passwordHash: string }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
      isActive: user.isActive,
      avatarKey: user.avatarKey,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
