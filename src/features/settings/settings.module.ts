import { Module } from '@nestjs/common';
import { SettingsService } from './application/settings.service';
import { SettingsController } from './presentation/settings.controller';
import { PrismaUserSettingRepository } from './infrastructure/prisma-user-setting.repository';
import { USER_SETTING_REPOSITORY } from './domain/ports';

@Module({
  controllers: [SettingsController],
  providers: [
    SettingsService,
    {
      provide: USER_SETTING_REPOSITORY,
      useClass: PrismaUserSettingRepository,
    },
  ],
  exports: [SettingsService, USER_SETTING_REPOSITORY],
})
export class SettingsModule {}
