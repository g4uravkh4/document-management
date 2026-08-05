import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { UsersService } from './application/users.service';
import { UsersController } from './presentation/users.controller';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { USER_REPOSITORY } from './domain/ports';

@Module({
  imports: [SettingsModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [UsersService, USER_REPOSITORY],
})
export class UsersModule {}
