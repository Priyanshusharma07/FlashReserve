export interface StreamMetrics {
  streamLength: number;
  pending: number;
  databaseHealthy: boolean;
  redisHealthy: boolean;
  uptimeSeconds: number;
}
