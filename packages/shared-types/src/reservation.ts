export type ReservationStatus =
  | 'ACCEPTED'
  | 'RESERVED'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED';

export interface ReserveInput {
  quantity: number;
}

export interface ReservationResponse {
  reservationId: string;
  campaignId: string;
  userId: string;
  quantity: number;
  status: ReservationStatus | string;
  remainingStock: number;
  expiresAt: string;
  createdAt: string;
  dbSyncedAt?: string | null;
  dbTxVersion?: number | null;
}

export interface UserReservationItem {
  reservationId: string;
  campaignId: string;
  campaignTitle: string;
  userId: string;
  quantity: number;
  status: ReservationStatus | string;
  expiresAt: string;
  createdAt: string;
}

export interface UserReservationsQuery {
  status?: ReservationStatus;
  campaignId?: string;
  page?: number;
  limit?: number;
}

export interface CheckoutInput {
  paymentToken: string;
}

export interface CheckoutResponse {
  reservationId: string;
  status: string;
  confirmedAt: string;
}

