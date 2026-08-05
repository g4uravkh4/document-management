import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/public.decorator';
import { HealthService, HealthStatus } from '../application/health.service';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and database health' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    type: HealthStatus,
  })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
