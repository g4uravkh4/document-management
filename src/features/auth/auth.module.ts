import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { MailModule } from '../../common/mail/mail.module';
import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaVerificationCodeRepository } from './infrastructure/prisma-verification-code.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  VERIFICATION_CODE_REPOSITORY,
} from './domain/ports';

@Module({
  imports: [
    UsersModule,
    SettingsModule,
    MailModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_TTL') ??
            '15m') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: VERIFICATION_CODE_REPOSITORY,
      useClass: PrismaVerificationCodeRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
