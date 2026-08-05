import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  UpdateSettingData,
  UserSettingEntity,
  UserSettingRepository,
} from '../domain/ports';

@Injectable()
export class PrismaUserSettingRepository implements UserSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserSettingEntity | null> {
    const setting = await this.prisma.userSetting.findUnique({
      where: { userId },
    });
    return setting ? this.toEntity(setting) : null;
  }

  async upsert(
    userId: string,
    data: UpdateSettingData,
  ): Promise<UserSettingEntity> {
    const setting = await this.prisma.userSetting.upsert({
      where: { userId },
      create: {
        userId,
        theme: data.theme ?? 'SYSTEM',
        dateFormat: data.dateFormat ?? 'BS',
        language: data.language ?? 'en',
      },
      update: {
        ...(data.theme !== undefined && { theme: data.theme }),
        ...(data.dateFormat !== undefined && { dateFormat: data.dateFormat }),
        ...(data.language !== undefined && { language: data.language }),
      },
    });
    return this.toEntity(setting);
  }

  private toEntity(setting: {
    id: string;
    userId: string;
    theme: string;
    dateFormat: string;
    language: string;
  }): UserSettingEntity {
    return {
      id: setting.id,
      userId: setting.userId,
      theme: setting.theme as UserSettingEntity['theme'],
      dateFormat: setting.dateFormat as UserSettingEntity['dateFormat'],
      language: setting.language as UserSettingEntity['language'],
    };
  }
}
