# ADR 003: Event Delivery & Worker Persistence Architecture

## Status
Accepted

## Context
Redis Streams serves as the durable queue between high-speed Lua reservation writes and relational PostgreSQL persistence. The worker must guarantee at-least-once delivery, prevent duplicate records, and maintain exact inventory counters.

## Decision
1. **Redis Streams Consumer Group (`XREADGROUP`)**:
   - The worker runs as an independent consumer inside `flash_workers_group`.
   - Reads batches up to `PERSISTENCE_BATCH_SIZE` (default 500) every `PERSISTENCE_BATCH_INTERVAL_MS` (default 50ms).
2. **PostgreSQL Bulk Ingestion with `UNNEST`**:
   - Rather than executing 500 individual `INSERT` queries, a single parameterized SQL statement unrolls parallel arrays via `UNNEST($1, $2, ...)`.
   - `ON CONFLICT (campaign_id, user_id) DO NOTHING` prevents duplicate insertions on replayed events.
3. **Accurate Campaign Counter Accounting**:
   - `flash_campaigns.reserved_count` is updated ONLY for the count of rows actually returned by `RETURNING id, campaign_id, quantity`.
   - Replayed or duplicate stream events do NOT double-increment the counter.
4. **Post-Commit Acknowledgment (`XACK`)**:
   - `XACK` is sent to Redis ONLY after PostgreSQL `client.query('COMMIT')` completes successfully.
5. **Dead-Worker Recovery (`XAUTOCLAIM`)**:
   - A background loop executes `XAUTOCLAIM` with a 5000ms idle threshold to reclaim and process unacknowledged events from crashed worker instances.

## Consequences
- **Positive**: Maximum database throughput using vectorized UNNEST batching.
- **Positive**: Complete crash resilience: uncommitted batches remain in Pending Entries List (PEL) and are re-claimed and persisted safely.
