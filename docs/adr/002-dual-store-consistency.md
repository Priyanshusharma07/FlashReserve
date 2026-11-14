# ADR 002: Dual-Store Consistency (Redis In-Memory vs. PostgreSQL Durability)

## Status
Accepted

## Context
A high-throughput flash-sale engine cannot route 10,000–20,000 requests/sec directly to PostgreSQL row locks (`SELECT ... FOR UPDATE`) without causing connection pool starvation, severe transaction serialization conflicts, and high P95 tail latency (> 500ms).

## Decision
1. **Redis-First Atomic State Allocation**:
   - Available stock decrement, user lock, temporary reservation record, and idempotency state are executed atomically in Redis via an `EVALSHA` Lua script.
   - Redis provides single-digit millisecond latency (P95 < 2.5ms) and guarantees that inventory never goes below zero.
2. **Asynchronous Durability via Redis Streams**:
   - The Lua script atomically appends a `RESERVATION_CREATED` event to `stream:reservations`.
   - A dedicated persistence worker consumes events in batches (up to 500 events every 50ms) and commits them to PostgreSQL.
3. **Read Path Reconciliation**:
   - The read endpoint `GET /api/v1/reservations/:resId` queries PostgreSQL first. If not found, it queries Redis temporary hash records.
   - If present in Redis but pending in stream buffer, it returns state `ACCEPTED` with `dbSyncedAt: null`.
   - Once committed to PostgreSQL, it returns `dbSyncedAt` and `dbTxVersion`.

## Consequences
- **Positive**: Sub-2.5ms P95 latency on hot write paths.
- **Positive**: Relational storage handles predictable batch writes instead of volatile burst spikes.
- **Trade-off**: Eventual consistency between Redis accepted reservations and PostgreSQL committed rows (synchronization lag typically 50–120ms).
