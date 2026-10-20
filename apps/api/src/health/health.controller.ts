import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (err) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: (err as Error).message,
      });
    }
  }

  @Public()
  @Get('liveness')
  liveness() {
    return { status: 'ok' };
  }
}
