# ADR 001: Idempotency Strategy for High-Concurrency Flash Reservations

## Status
Accepted

## Context
In flash-sale events with extreme traffic spikes, client timeouts, network retries, and rapid repeated clicks are common. Without an idempotency mechanism, duplicate stock decrements would occur, prematurely exhausting inventory and creating duplicate reservations for the same user.

## Decision
1. **Mandatory Idempotency-Key Header**: Every reservation request (`POST /api/v1/sales/:id/reserve`) requires an `Idempotency-Key` HTTP header.
2. **Payload Fingerprinting**: A SHA256 hash of the normalized request payload (`{ quantity }`) is calculated at the API layer and passed into the atomic Redis Lua script.
3. **Atomic Lua Idempotency Check**:
   - Before decrementing stock, Redis checks `flash:idem:{campaignId}:{idempotencyKey}`.
   - If present:
     - If stored payload hash matches: return cached response (`IDEMPOTENT_REPLAY`), avoiding any stock decrement.
     - If stored payload hash differs: return `PAYLOAD_MISMATCH` (`400 Bad Request`), rejecting key reuse for conflicting intents.
4. **TTL Policy**: The idempotency record inherits the reservation TTL (default 600s).

## Consequences
- **Positive**: Network retries receive deterministic responses in < 2ms without hitting relational storage.
- **Positive**: Zero duplicate stock decrements under flaky network conditions.
- **Trade-off**: Requires Redis memory for idempotency hashes during the TTL window.
