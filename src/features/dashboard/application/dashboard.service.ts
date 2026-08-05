import { Inject, Injectable } from '@nestjs/common';
import { ROLES } from '@ca-firm/shared';
import { AuthUser } from '../../../common/auth/auth-user.interface';
import {
  AdminOverview,
  ClientOverview,
  DASHBOARD_REPOSITORY,
} from '../domain/ports';
import type { DashboardRepository } from '../domain/ports';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboard: DashboardRepository,
  ) {}

  async overview(user: AuthUser): Promise<AdminOverview | ClientOverview> {
    if (user.role === ROLES.ADMIN) {
      return this.dashboard.adminOverview();
    }
    return this.dashboard.clientOverview(user.clientId ?? '');
  }
}
