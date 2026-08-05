import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth-user.interface';
import { SettingsService } from '../application/settings.service';
import { UserSettingEntity } from '../domain/ports';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user settings' })
  get(@CurrentUser() user: AuthUser): Promise<UserSettingEntity> {
    return this.settingsService.get(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user settings' })
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSettingsDto,
  ): Promise<UserSettingEntity> {
    return this.settingsService.update(user.sub, dto);
  }
}
