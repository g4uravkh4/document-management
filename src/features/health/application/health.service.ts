import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

export class HealthStatus {
  @ApiProperty({ enum: ['ok', 'error'] })
  status: 'ok' | 'error';

  @ApiProperty({ enum: ['up', 'down'] })
  database: 'up' | 'down';

  @ApiProperty({ example: '2026-08-01T14:26:15.261Z' })
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    let database: HealthStatus['database'] = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      // database connectivity failure reported in status
    }

    return {
      status: database === 'up' ? 'ok' : 'error',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
