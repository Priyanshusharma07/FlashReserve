# ADR 004: Inventory Recovery, Expiration Sweeper & Race Exclusion

## Status
Accepted

## Context
When reservations reach their expiration deadline without being checked out, their allocated inventory must be released back into the available pool. However, a checkout attempt may arrive at the exact millisecond expiration triggers, creating a potential race condition.

## Decision
1. **Periodic Sweeper Loop**:
   - An expiration sweeper runs every 15 seconds in the worker process, querying expired reservations (`status = 'RESERVED' AND expires_at < NOW()`).
2. **Conditional State Transition (Row Lock via SQL)**:
   - Expiration attempts an atomic state transition:
     ```sql
     UPDATE reservations
     SET status = 'EXPIRED', db_synced_at = NOW()
     WHERE id = $1 AND status = 'RESERVED';
     ```
   - Checkout uses the symmetric conditional update:
     ```sql
     UPDATE reservations
     SET status = 'PAID', db_synced_at = NOW()
     WHERE id = $1 AND status = 'RESERVED';
     ```
   - In PostgreSQL, row-level locks ensure these two operations are mutually exclusive. Exactly one can succeed.
3. **Inventory Reclaim Protocol**:
   - Inventory in `flash_campaigns` and Redis `flash:stock:{campaignId}` is incremented IF AND ONLY IF `UPDATE reservations ... status = 'EXPIRED'` returned `rowCount = 1`.
   - If payment won the race, status is `'PAID'`, the expiration update returns `rowCount = 0`, and inventory is NEVER released.
   - If expiration won the race, checkout detects status is `'EXPIRED'` and rejects the payment with `410 Gone`.

## Consequences
- **Positive**: Strict mathematical inventory conservation under extreme race conditions.
- **Positive**: No double-release of stock, no overselling.
