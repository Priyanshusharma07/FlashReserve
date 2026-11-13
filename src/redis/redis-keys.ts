/**
 * Redis Key Namespaces and Hash-Tag Strategy for FlashReserve.
 *
 * All campaign-specific keys use Redis Cluster hash-tags `{campaignId}`
 * ensuring atomic multi-key Lua operations execute on the same cluster slot.
 */

export class RedisKeys {
  /**
   * String: Current available inventory counter.
   * Type: integer string
   * TTL: None (persisted until campaign conclusion)
   * Example: flash:stock:{camp_01}
   */
  static stockKey(campaignId: string): string {
    return `flash:stock:{${campaignId}}`;
  }

  /**
   * Hash: Campaign metadata, time windows, and active flag.
   * Fields: id, title, priceCents, totalInventory, startsAt, endsAt, isActive
   * TTL: None
   * Example: flash:meta:{camp_01}
   */
  static metaKey(campaignId: string): string {
    return `flash:meta:{${campaignId}}`;
  }

  /**
   * String: Per-user reservation constraint (1 reservation per user per campaign).
   * Value: reservationId
   * TTL: RESERVATION_TTL_SECONDS (or until checkout)
   * Example: flash:user:{camp_01}:usr_100
   */
  static userReservationKey(campaignId: string, userId: string): string {
    return `flash:user:{${campaignId}}:${userId}`;
  }

  /**
   * Hash: Temporary reservation record state.
   * Fields: id, campaignId, userId, quantity, status, expiresAt, createdAt
   * TTL: RESERVATION_TTL_SECONDS
   * Example: flash:res:{camp_01}:res_01HNG
   */
  static reservationKey(campaignId: string, reservationId: string): string {
    return `flash:res:{${campaignId}}:${reservationId}`;
  }

  /**
   * Hash: Idempotency state mapping request payload hash to reservation response.
   * Fields: reservationId, payloadHash, status, responseJson
   * TTL: RESERVATION_TTL_SECONDS
   * Example: flash:idem:{camp_01}:key_xyz
   */
  static idempotencyKey(campaignId: string, idemKey: string): string {
    return `flash:idem:{${campaignId}}:${idemKey}`;
  }

  /**
   * Stream: Append-only reservation events stream consumed by persistence worker.
   * Type: Redis Stream
   * Example: stream:reservations
   */
  static streamKey(customName?: string): string {
    return customName || 'stream:reservations';
  }
}
