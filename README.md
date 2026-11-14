# FlashReserve: High-Concurrency Flash-Sale & Inventory Reservation Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%2F6.x-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12.x-red)](https://nestjs.com/)
[![Fastify](https://img.shields.io/badge/Fastify-Platform-black)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)

FlashReserve is an enterprise-grade, high-throughput flash-sale and inventory reservation engine built with **NestJS**, **Fastify**, **Redis 7 (Lua scripting + Streams)**, and **PostgreSQL 16**.

It is architected specifically to handle traffic surges of **10,000–20,000 requests/sec** with **sub-2.5ms P95 latency** on the hot write path without overselling, deadlocks, or inventory drift.

---

## 1. Monorepo Structure

```
FlashReserve/
├── apps/
│   ├── backend/          # NestJS Fastify backend (Redis Lua, Streams, Aiven PostgreSQL, PASETO)
│   └── frontend/         # Storefront & Admin frontend applications
├── packages/
│   └── shared-types/     # Shared TypeScript interfaces, DTOs, and contracts
├── package.json          # Root workspace scripts & dependencies
└── turbo.json            # Turborepo task pipelines
```

---

## 2. Architectural Highlights

- **Dual Application Modes**: A modular monolith running either as HTTP API (`APP_MODE=api`) or background persistence worker (`APP_MODE=worker`) from a single codebase.
- **Atomic Lua Allocation**: All reservation checks (stock, active window, per-user limits, idempotency) execute inside a preloaded Redis Lua script (`EVALSHA` with automatic `NOSCRIPT` recovery).
- **Zero PostgreSQL Contention on Writes**: The API tier never acquires database row locks during reservations. Events are appended to `stream:reservations`.
- **Vectorized Ingestion via PostgreSQL `UNNEST`**: The worker ingests up to 500 events per batch inside a single PostgreSQL transaction using parameterized `UNNEST` queries with `ON CONFLICT` handling.
- **Dual-Store Read Reconciliation**: `GET /api/v1/reservations/:resId` checks PostgreSQL first, falling back to the Redis buffer to return `ACCEPTED`, `RESERVED`, `PAID`, or `EXPIRED`.
- **Race-Proof Expiration & Checkout**: Mutual exclusion between payment confirmation and expiration is enforced via conditional SQL row updates (`WHERE id = $1 AND status = 'RESERVED'`).

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Fastify as NestJS API (Fastify)
    participant Redis as Redis 7 (Lua + Streams)
    participant Worker as Persistence Worker
    participant Postgres as PostgreSQL 16

    Client->>Fastify: POST /api/v1/sales/:id/reserve (Idempotency-Key + Bearer)
    Fastify->>Redis: EVALSHA reserve_stock.lua (Atomic)
    Note over Redis: 1. Idempotency check<br/>2. Window & status check<br/>3. User 1-res check<br/>4. Stock DECRBY<br/>5. Append to stream:reservations
    Redis-->>Fastify: Return SUCCESS (or SOLD_OUT / IDEMPOTENT_REPLAY)
    Fastify-->>Client: 201 Created (reservationId, expiresAt, remainingStock)

    rect rgb(240, 248, 255)
    Note over Worker,Postgres: Asynchronous Persistence Loop (50ms batches)
    Worker->>Redis: XREADGROUP flash_workers_group
    Redis-->>Worker: Batch of reservation events (up to 500)
    Worker->>Postgres: BEGIN TRANSACTION
    Worker->>Postgres: Bulk INSERT UNNEST(...) ON CONFLICT DO NOTHING
    Worker->>Postgres: UPDATE flash_campaigns reserved_count
    Worker->>Postgres: COMMIT
    Worker->>Redis: XACK stream:reservations
    end
```

---

## 3. Quick Start (Local Development)

### Install dependencies
```powershell
npm install --legacy-peer-deps
```

### Run Backend Tests
```powershell
npm run backend:test
```

### Start API in Dev Mode
```powershell
npm run backend:dev
```
