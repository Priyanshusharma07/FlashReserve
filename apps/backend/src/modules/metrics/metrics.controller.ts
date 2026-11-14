import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Public } from '../../common/auth/public.decorator.js';
import { MetricsService } from './metrics.service.js';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Prometheus metrics scrape endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics text format' })
  async scrape(@Res() reply: FastifyReply): Promise<void> {
    const metrics = await this.metricsService.getMetrics();
    reply
      .header('Content-Type', this.metricsService.getContentType())
      .send(metrics);
  }
}
