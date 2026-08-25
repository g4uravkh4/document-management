import { Module } from '@nestjs/common';
import { HealthController } from './presentation/health.controller';
import { RootController } from './presentation/root.controller';
import { HealthService } from './application/health.service';

@Module({
  controllers: [HealthController, RootController],
  providers: [HealthService],
})
export class HealthModule {}
