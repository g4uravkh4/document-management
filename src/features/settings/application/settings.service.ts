import { Injectable } from '@nestjs/common';
import {
  UpdateSettingData,
  UserSettingEntity,
  USER_SETTING_REPOSITORY,
} from '../domain/ports';
import type { UserSettingRepository } from '../domain/ports';
import { Inject } from '@nestjs/common';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(USER_SETTING_REPOSITORY)
    private readonly settings: UserSettingRepository,
  ) {}

  async get(userId: string): Promise<UserSettingEntity> {
    const setting = await this.settings.findByUserId(userId);
    if (!setting) {
      // Ensure a settings row always exists for the user.
      return this.settings.upsert(userId, {});
    }
    return setting;
  }

  async update(
    userId: string,
    data: UpdateSettingData,
  ): Promise<UserSettingEntity> {
    return this.settings.upsert(userId, data);
  }
}
