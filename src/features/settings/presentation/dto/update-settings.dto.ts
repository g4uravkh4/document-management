import { IsEnum, IsOptional } from 'class-validator';
import { DATE_FORMATS, LANGUAGES, THEME_PREFERENCES } from '@ca-firm/shared';
import type { DateFormat, Language, ThemePreference } from '@ca-firm/shared';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(THEME_PREFERENCES)
  theme?: ThemePreference;

  @IsOptional()
  @IsEnum(DATE_FORMATS)
  dateFormat?: DateFormat;

  @IsOptional()
  @IsEnum(LANGUAGES)
  language?: Language;
}
