import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthUser } from '../../../common/auth/auth-user.interface';
import { DashboardService } from '../application/dashboard.service';
import { AdminOverview, ClientOverview } from '../domain/ports';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard KPIs (role-aware)' })
  overview(
    @CurrentUser() user: AuthUser,
  ): Promise<AdminOverview | ClientOverview> {
    return this.dashboardService.overview(user);
  }
}
