import { Injectable, OnModuleInit } from '@nestjs/common';
import client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new client.Registry();

  readonly httpRequestsTotal = new client.Counter({
    name: 'flash_http_requests_total',
    help: 'Total count of HTTP requests handled',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  readonly httpRequestDurationSeconds = new client.Histogram({
    name: 'flash_http_request_duration_seconds',
    help: 'Histogram of HTTP request latencies',
    labelNames: ['method', 'route'],
    buckets: [0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [this.registry],
  });

  readonly reservationsTotal = new client.Counter({
    name: 'flash_reservations_total',
    help: 'Total reservation attempts by outcome',
    labelNames: ['outcome', 'campaign_id'],
    registers: [this.registry],
  });

  readonly workerBatchSizeHistogram = new client.Histogram({
    name: 'flash_worker_batch_size',
    help: 'Distribution of batch sizes processed by the persistence worker',
    buckets: [1, 10, 50, 100, 250, 500],
    registers: [this.registry],
  });

  onModuleInit(): void {
    client.collectDefaultMetrics({ register: this.registry, prefix: 'flash_' });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
