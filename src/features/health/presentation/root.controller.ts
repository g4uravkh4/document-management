import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../common/auth/public.decorator';

@Controller()
@Public()
export class RootController {
  @Get()
  status(): { service: string; message: string } {
    return {
      service: 'ca-firm-api',
      message: 'API is running. Use /api/health for health details.',
    };
  }
}