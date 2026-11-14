export interface CampaignSummary {
  total: number;
  active: number;
  upcoming: number;
  ended: number;
  totalInventory: number;
  totalReservedUnits: number;
}

export interface ReservationSummary {
  total: number;
  reserved: number;
  paid: number;
  expired: number;
  cancelled: number;
  totalRevenueCents: number;
}

export interface AdminDashboardSummary {
  campaigns: CampaignSummary;
  reservations: ReservationSummary;
  generatedAt: string;
}

export interface AdminCampaignInventory {
  campaignId: string;
  title: string;
  initialStock: number;
  availableStockRedis: number;
  persistedReservedCount: number;
  activeReservedUnits: number;
  paidUnits: number;
  expiredUnits: number;
  cancelledUnits: number;
  driftDetected: boolean;
  reconciliationStatus: string;
}

export interface AdminReservationsQuery {
  search?: string;
  campaignId?: string;
  status?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminReservationDetail {
  reservationId: string;
  campaignId: string;
  campaignTitle?: string;
  userId: string;
  quantity: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  dbSyncedAt?: string | null;
  dbTxVersion?: number | null;
  isLiveInBuffer: boolean;
}

export interface InfrastructureHealth {
  database: 'healthy' | 'unhealthy';
  redis: 'healthy' | 'unhealthy';
  uptimeSeconds: number;
}

export interface WorkerMetrics {
  streamPendingCount: number;
  streamLength: number;
  consumerGroup: string;
  status: 'active' | 'idle';
}

export interface ReservationMetrics {
  successful: number;
  rejected: number;
  expiredReclaimed: number;
}

export interface AdminMetricsSummary {
  infrastructure: InfrastructureHealth;
  worker: WorkerMetrics;
  reservations: ReservationMetrics;
  timestamp: string;
}

