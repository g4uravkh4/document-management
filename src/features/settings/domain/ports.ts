import { DateFormat, Language, ThemePreference } from '@ca-firm/shared';

export interface UserSettingEntity {
  id: string;
  userId: string;
  theme: ThemePreference;
  dateFormat: DateFormat;
  language: Language;
}

export interface UpdateSettingData {
  theme?: ThemePreference;
  dateFormat?: DateFormat;
  language?: Language;
}

export interface UserSettingRepository {
  findByUserId(userId: string): Promise<UserSettingEntity | null>;
  upsert(userId: string, data: UpdateSettingData): Promise<UserSettingEntity>;
}

export const USER_SETTING_REPOSITORY = Symbol('USER_SETTING_REPOSITORY');
