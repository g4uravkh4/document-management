import { Module } from '@nestjs/common';
import { DashboardService } from './application/dashboard.service';
import { DashboardController } from './presentation/dashboard.controller';
import { PrismaDashboardRepository } from './infrastructure/prisma-dashboard.repository';
import { DASHBOARD_REPOSITORY } from './domain/ports';

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    { provide: DASHBOARD_REPOSITORY, useClass: PrismaDashboardRepository },
  ],
})
export class DashboardModule {}
