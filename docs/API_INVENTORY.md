# FlashReserve — API Inventory & Implementation Status

**Date**: 2026-11-12  
**Target Client**: Next.js Flash-Sale Storefront & Operations Dashboard  
**Status Key**:
- `IMPLEMENTED` — Fully implemented, documented in Swagger, and covered by unit/integration tests.
- `PARTIALLY IMPLEMENTED` — Exists but lacks required query/filtering/pagination features for the UI.
- `MISSING` — Does not exist in the backend.
- `NOT REQUIRED` — Internal or unnecessary for the frontend.

---

## 1. Customer-Facing APIs

| Method | Route | Controller | Service | Auth / Roles | Status | Implementation Details & Test Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/campaigns` | `CampaignController` | `CampaignService.listCampaigns` | Public | `IMPLEMENTED` | Supports pagination (`page`, `limit`), status filter (`active`, `upcoming`, `ended`, `all`), search keyword, and sorting. Returns live authoritative Redis inventory. Tested in `campaign-discovery.spec.ts`. |
| `GET` | `/api/v1/campaigns/:id` | `CampaignController` | `CampaignService.getCampaign` | Public | `IMPLEMENTED` | Returns campaign details with live authoritative Redis stock counter (`flash:stock:{id}`). Tested in `campaign.service.spec.ts`. |
| `POST` | `/api/v1/sales/:id/reserve` | `ReservationController` | `ReservationService.reserve` | Bearer (`user`/`admin`) | `IMPLEMENTED` | Atomic Redis Lua stock allocation, idempotency validation, Redis Streams event queuing. Hot-path write. Tested in `reservation.service.spec.ts` & `concurrency.spec.ts`. |
| `GET` | `/api/v1/reservations/:resId` | `ReservationController` | `ReservationService.getReservation` | Bearer (Owner / Admin) | `IMPLEMENTED` | Dual-store reconciliation (Postgres check falling back to Redis in-memory buffer); verifies customer ownership. Tested in `customer-reservations.spec.ts`. |
| `GET` | `/api/v1/users/me/reservations` | `ReservationController` | `ReservationService.getUserReservations` | Bearer (`user`/`admin`) | `IMPLEMENTED` | Customer reservation history sorted newest first with pagination, status, and campaign filters. Enforces user isolation. Tested in `customer-reservations.spec.ts`. |
| `POST` | `/api/v1/checkout/:resId/pay` | `CheckoutController` | `CheckoutService.checkout` | Bearer (Owner) | `IMPLEMENTED` | Payment simulation, conditional SQL state transition `RESERVED -> PAID`, prevents expiration race conditions. Tested in `checkout.service.spec.ts`. |

---

## 2. Admin Dashboard APIs

| Method | Route | Controller | Service | Auth / Roles | Status | Implementation Details & Test Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dashboard/summary` | `AdminController` | `AdminService.getDashboardSummary` | Bearer (`admin`) | `IMPLEMENTED` | Single round-trip SQL aggregate query computing campaign and reservation lifecycle KPIs and gross revenue. Tested in `admin.service.spec.ts`. |
| `GET` | `/api/v1/admin/campaigns` | `AdminController` | `AdminService.getCampaigns` | Bearer (`admin`) | `IMPLEMENTED` | Administrative campaign listing table with pagination, search, status filter, and operational metadata. Tested in `admin.service.spec.ts`. |
| `GET` | `/api/v1/admin/campaigns/:id` | `AdminController` | `AdminService.getCampaign` | Bearer (`admin`) | `IMPLEMENTED` | Complete operational campaign details (including version, timestamps, and live Redis stock). |
| `GET` | `/api/v1/admin/campaigns/:id/inventory` | `AdminController` | `AdminService.getCampaignInventory` | Bearer (`admin`) | `IMPLEMENTED` | Audits authoritative live Redis stock counter against database reservation breakdown and detects allocation drift. Tested in `admin.service.spec.ts`. |
| `POST` | `/api/v1/campaigns` | `CampaignController` | `CampaignService.createCampaign` | Bearer (`admin`) | `IMPLEMENTED` | Creates campaign in DB, syncs metadata and initial stock to Redis. Tested in `campaign.service.spec.ts`. |
| `POST` | `/api/v1/campaigns/:id/activate` | `CampaignController` | `CampaignService.activateCampaign` | Bearer (`admin`) | `IMPLEMENTED` | Sets Redis `isActive` to true and refreshes stock. |
| `POST` | `/api/v1/campaigns/:id/deactivate` | `CampaignController` | `CampaignService.deactivateCampaign` | Bearer (`admin`) | `IMPLEMENTED` | Sets Redis `isActive` to false. |
| `GET` | `/api/v1/admin/reservations` | `AdminController` | `AdminService.getReservations` | Bearer (`admin`) | `IMPLEMENTED` | Searchable & paginated reservation table for ops (filter by status, campaign, customer ID, date range). Tested in `admin.service.spec.ts`. |
| `GET` | `/api/v1/admin/reservations/:id` | `AdminController` | `AdminService.getReservation` | Bearer (`admin`) | `IMPLEMENTED` | Operational reservation details (sync status, tx version, Redis buffer indicator). |
| `GET` | `/api/v1/admin/metrics/summary` | `AdminController` | `AdminService.getMetricsSummary` | Bearer (`admin`) | `IMPLEMENTED` | Structured JSON summary of operational metrics (Redis stream length, consumer pending count, DB & Redis health). Tested in `admin.service.spec.ts`. |

---

## 3. Authentication & Session APIs

| Method | Route | Controller | Service | Auth / Roles | Status | Implementation Details & Test Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | `AuthController` | `AuthService.register` | Public | `IMPLEMENTED` | Registers new customer account with `scrypt` password hashing, validates email uniqueness, assigns default `user` role, and returns initial session token. Tested in `auth.service.spec.ts`. |
| `POST` | `/api/v1/auth/login` | `AuthController` | `AuthService.login` | Public | `IMPLEMENTED` | Verifies credentials against `users` table with `scrypt` hashing and issues PASETO Bearer token. Tested in `auth.service.spec.ts`. |
| `GET` | `/api/v1/auth/me` | `AuthController` | `AuthService.getMe` | Bearer | `IMPLEMENTED` | Returns authenticated user profile and roles for frontend session restoration. Tested in `auth.service.spec.ts`. |
| `POST` | `/api/v1/auth/logout` | `AuthController` | `AuthService.logout` | Bearer | `IMPLEMENTED` | Signals frontend to terminate active session. |
| `POST` | `/api/v1/auth/token` | `AuthController` | `AuthService.generateToken` | Public | `IMPLEMENTED` | Dev / Swagger testing helper for generating raw PASETO tokens. (Dev tokens strictly disabled in production). |

---

## 4. Operational & Observability APIs

| Method | Route | Controller | Service | Auth / Roles | Status | Implementation Details & Test Coverage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health/live` | `HealthController` | — | Public | `IMPLEMENTED` | Process liveness probe. |
| `GET` | `/health/ready` | `HealthController` | — | Public | `IMPLEMENTED` | Deep readiness probe checking PostgreSQL and Redis connection health. |
| `GET` | `/metrics` | `MetricsController` | `MetricsService` | Public | `IMPLEMENTED` | Prometheus scrape endpoint (plain-text format). |
