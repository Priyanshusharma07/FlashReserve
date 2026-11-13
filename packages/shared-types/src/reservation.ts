export const RESERVATION_STATUSES = ["ACCEPTED", "RESERVED", "PAID", "EXPIRED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export interface Reservation {
  id: string;
  campaignId: string;
  userId: string;
  status: ReservationStatus;
  createdAt: string;
  expiresAt?: string;
}
