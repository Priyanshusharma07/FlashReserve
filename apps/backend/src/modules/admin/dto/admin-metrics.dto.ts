import { ApiProperty } from '@nestjs/swagger';

export class InfrastructureHealthDto {
  @ApiProperty({ example: 'healthy', enum: ['healthy', 'unhealthy'] })
  database!: 'healthy' | 'unhealthy';

  @ApiProperty({ example: 'healthy', enum: ['healthy', 'unhealthy'] })
  redis!: 'healthy' | 'unhealthy';

  @ApiProperty({ example: 3600, description: 'Application uptime in seconds' })
  uptimeSeconds!: number;
}

export class WorkerMetricsDto {
  @ApiProperty({ example: 0, description: 'Pending unacknowledged messages in Redis stream' })
  streamPendingCount!: number;

  @ApiProperty({ example: 42, description: 'Total length of Redis stream stream:reservations' })
  streamLength!: number;

  @ApiProperty({ example: 'flash_workers_group' })
  consumerGroup!: string;

  @ApiProperty({ example: 'active', enum: ['active', 'idle'] })
  status!: 'active' | 'idle';
}

export class ReservationMetricsDto {
  @ApiProperty({ example: 1050, description: 'Total successful reservations' })
  successful!: number;

  @ApiProperty({ example: 25, description: 'Total rejected reservations (sold out or limit exceeded)' })
  rejected!: number;

  @ApiProperty({ example: 5, description: 'Total expired and reclaimed reservations' })
  expiredReclaimed!: number;
}

export class AdminMetricsSummaryDto {
  @ApiProperty({ type: InfrastructureHealthDto })
  infrastructure!: InfrastructureHealthDto;

  @ApiProperty({ type: WorkerMetricsDto })
  worker!: WorkerMetricsDto;

  @ApiProperty({ type: ReservationMetricsDto })
  reservations!: ReservationMetricsDto;

  @ApiProperty({ example: '2026-11-12T10:00:00.000Z' })
  timestamp!: string;
}

