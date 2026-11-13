# FlashReserve — Backend Integration Gaps & Architectural Analysis

This document details the architectural findings, gap resolutions, and engineering decisions implemented to support the Next.js Storefront and Admin Dashboard applications.

---

## 1. Initial State & Discovered Capabilities

During the Phase 1 backend audit, the following core engine components were confirmed to be fully functional:
1. **Atomic Flash-Sale Allocation**:
   - `POST /api/v1/sales/:id/reserve` executes `reserve_stock.lua` inside Redis Cluster hash-tags `{campaignId}`.
   - Enforces inventory checks, active sale windows, per-user limits, and idempotency in a single atomic script.
   - Hot path never acquires database row locks; it appends events to `stream:reservations`.
2. **Dual Application Modes**:
   - Monolith supports `APP_MODE=api` (HTTP service) and `APP_MODE=worker` (persistence worker + expiration sweeper).
3. **Checkout & Race-Proof Payment**:
   - `POST /api/v1/checkout/:resId/pay` uses conditional SQL updates (`WHERE id = $1 AND status = 'RESERVED'`) to prevent race conditions with expiration sweeper runs.
4. **Dual-Store Reservation Lookup**:
   - `GET /api/v1/reservations/:resId` reconciles database records with Redis in-memory buffer state.

---

## 2. Identified Gaps & How They Were Resolved

### Gap A: Authentication & User Persistence
* **Initial State**:
  The system verified PASETO v3 tokens and dev tokens (`dev-admin-1`, `dev-user-1`), but lacked:
  - A persistent `users` table.
  - Credential verification (`email` + `password`).
  - Production-ready login and session retrieval endpoints (`/auth/login`, `/auth/me`, `/auth/logout`).
* **Resolution**:
  - Implemented migration `002_users_schema.sql` creating a `users` table with email uniqueness and role constraints (`user`, `admin`).
  - Implemented cryptographic password hashing using Node's native `scrypt` with random 16-byte salts and `timingSafeEqual` comparison to eliminate timing attacks.
  - Implemented `POST /api/v1/auth/login` issuing signed PASETO Bearer tokens.
  - Implemented `GET /api/v1/auth/me` to restore user sessions upon page refresh.
  - Added security safeguard: strictly blocks `dev-` tokens when `NODE_ENV=production`.
  - Seeded initial admin (`admin@flashreserve.io` / `Admin@12345`) and customer (`user@flashreserve.io` / `User@12345`) test credentials.

### Gap B: Campaign Discovery & Inventory Accuracy
* **Initial State**:
  `GET /api/v1/campaigns` returned an unpaginated array of all campaigns without query parameters for status filtering, keyword search, or pagination.
* **Resolution**:
  - Enhanced `GET /api/v1/campaigns` with `ListCampaignsQueryDto` supporting:
    - Status filtering (`active`, `upcoming`, `ended`, `all`) evaluated against `starts_at` and `ends_at`.
    - Keyword search (`title ILIKE %term%` or ID).
    - Pagination (`page`, `limit`) with standard response envelope: `{ success: true, data: [...], meta: { page, limit, total, totalPages } }`.
  - Retained authoritative Redis inventory lookup (`flash:stock:{id}`) so customers never see stale database inventory figures.

### Gap C: Customer Reservation History & Isolation
* **Initial State**:
  Customers could only query an individual reservation if they already held the `reservationId`. There was no history endpoint.
* **Resolution**:
  - Added `GET /api/v1/users/me/reservations` in `ReservationController`.
  - Enforced customer isolation: caller's identity is extracted from verified token claims via `@CurrentUser()`. Queries strictly filter by `WHERE r.user_id = $1`.
  - Added composite index `idx_reservations_user_created ON reservations (user_id, created_at DESC)` for sub-millisecond history queries.

### Gap D: Admin Dashboard KPIs & Data Aggregation
* **Initial State**:
  No administrative aggregation endpoints existed. Calculating metrics on the frontend would have required scanning all database records.
* **Resolution**:
  - Created a dedicated `AdminModule` (`/api/v1/admin`) protected by `AuthGuard` and `@Roles('admin')`.
  - Implemented `GET /api/v1/admin/dashboard/summary` using single-round-trip PostgreSQL filter aggregates:
    ```sql
    SELECT
      COUNT(*) FILTER (WHERE starts_at <= NOW() AND ends_at > NOW()) as active,
      COUNT(*) FILTER (WHERE starts_at > NOW()) as upcoming,
      COUNT(*) FILTER (WHERE ends_at <= NOW()) as ended,
      ...
    FROM flash_campaigns;
    ```
  - Computes reservation status breakdown (`RESERVED`, `PAID`, `EXPIRED`, `CANCELLED`) and gross revenue in cents without loading rows into application memory.

### Gap E: Inventory Drift & Reconciliation Audit
* **Initial State**:
  No tool existed to audit whether the live Redis stock counter diverged from database records.
* **Resolution**:
  - Implemented `GET /api/v1/admin/campaigns/:id/inventory`.
  - Queries authoritative Redis stock counter and compares it with database breakdown (`total_inventory - (active_reserved + paid)`).
  - Flags `driftDetected: boolean` with diagnostic explanation if in-flight stream lag or discrepancies occur.

### Gap F: Operational Metrics & Queue Lag
* **Initial State**:
  Metrics were only exposed via `/metrics` in Prometheus text exposition format, requiring an external scraper.
* **Resolution**:
  - Implemented `GET /api/v1/admin/metrics/summary` returning structured JSON for the frontend:
    - Stream length (`XLEN stream:reservations`).
    - Stream consumer pending count (`XPENDING stream:reservations flash_workers_group`).
    - Database and Redis connection health indicators.
    - Application uptime.

---

## 3. Preserved Invariants & Strict Rules Followed

1. **Redis Lua Hot Path Untouched**:
   - `reserve_stock.lua` remains the sole atomic authority for inventory decrements, window validation, and idempotency.
2. **Zero Row Locks on Reservation Path**:
   - The write path remains lock-free in PostgreSQL.
3. **No Stale or Fabricated Metrics**:
   - All admin KPIs and inventory breakdowns originate from real database aggregates or live Redis commands.
4. **Backward Compatibility**:
   - Existing endpoints (`POST /sales/:id/reserve`, `POST /checkout/:resId/pay`, `GET /reservations/:resId`) continue to operate with 100% compatibility.
5. **Database Integrity**:
   - Existing seeded campaigns on Aiven PostgreSQL 18.6 remain intact. Migrations are non-destructive and tracked in `schema_migrations`.

