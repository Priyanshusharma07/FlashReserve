# FlashReserve — API Integration Matrix (Next.js Frontend to NestJS Backend)

This document provides the definitive integration specification for connecting the Next.js Storefront and Ops Dashboard to the FlashReserve backend engine.

---

## 1. Authentication & Session Flow

| Frontend View / Component | HTTP Method & Route | Auth & Role | Request Schema | Response Envelope | Edge Cases & Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sign Up / Register Modal** | `POST /api/v1/auth/register` | Public | `{ name: string, email: string, password: string, confirmPassword?: string }` | `{ accessToken: string, tokenType: 'Bearer', user: { id, email, name, role: 'user' } }` | `409 Conflict` if email already registered. Returns session token immediately. |
| **Login Modal / Page** | `POST /api/v1/auth/login` | Public | `{ email: string, password: string }` | `{ accessToken: string, tokenType: 'Bearer', user: { id, email, name, role } }` | `401 Unauthorized` for bad credentials. Rate-limited. |
| **Auth Provider / App Bootstrap** | `GET /api/v1/auth/me` | Bearer Token (`user` or `admin`) | None | `{ id: string, email: string, name: string, role: 'user' \| 'admin' }` | `401 Unauthorized` if token expired/invalid. Redirect to login. |
| **User Dropdown Logout** | `POST /api/v1/auth/logout` | Bearer Token | None | `{ success: true, message: string }` | Clear client-side cookies/storage. |
| **Swagger / Dev Token Generator** | `POST /api/v1/auth/token` | Public | `{ userId?: string, role?: 'user' \| 'admin' }` | `{ accessToken, tokenType, userId, role }` | Testing only. Dev fallback disabled in production. |

---

## 2. Customer Flash-Sale Storefront Flow

| Frontend View / Component | HTTP Method & Route | Auth & Role | Query / Body Schema | Response Envelope | Data Authority | Edge Cases |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Campaign Catalog / Home** | `GET /api/v1/campaigns` | Public | `?status=all\|active\|upcoming\|ended&search=...&page=1&limit=20&sort=starts_at_asc` | `{ success: true, data: CampaignResponseDto[], meta: { page, limit, total, totalPages } }` | Hybrid (PostgreSQL metadata + Redis live stock counter) | Empty list if no matches (`total: 0`). |
| **Campaign Detail & Buy Modal** | `GET /api/v1/campaigns/:id` | Public | Path: `:id` | `CampaignResponseDto` | Redis live stock (`flash:stock:{id}`) | `404 Not Found` if invalid ID. |
| **"Reserve Now" Button (Hot Path)** | `POST /api/v1/sales/:id/reserve` | Bearer Token (`user` or `admin`) | Header: `Idempotency-Key`<br/>Body: `{ quantity: number }` | `ReservationResponseDto` (`status: RESERVED`, `expiresAt`, `remainingStock`) | Redis Lua Script (`reserve_stock.lua`) + Redis Stream | `400` Window closed / invalid qty.<br/>`409` Sold out or user already has active reservation.<br/>Idempotent retry returns identical payload. |
| **Reservation Status Tracker / Countdown** | `GET /api/v1/reservations/:resId` | Bearer (Owner or Admin) | Path: `:resId` | `ReservationResponseDto` (`status: ACCEPTED \| RESERVED \| PAID \| EXPIRED`) | Dual-Store (PostgreSQL check fallback to Redis Stream buffer) | `403 Forbidden` if customer does not own reservation.<br/>`404 Not Found`. |
| **Checkout / Payment Gateway Modal** | `POST /api/v1/checkout/:resId/pay` | Bearer (Owner) | Path: `:resId`<br/>Body: `{ paymentToken: string }` | `CheckoutResponseDto` (`status: PAID`, `confirmedAt`) | Conditional PostgreSQL UPDATE + Redis key cleanup | `410 Gone` if reservation expired before payment completed. |
| **Customer "My Orders" History** | `GET /api/v1/users/me/reservations` | Bearer (`user`) | `?status=...&campaignId=...&page=1&limit=20` | `{ success: true, data: UserReservationItemDto[], meta: { page, limit, total, totalPages } }` | PostgreSQL (indexed by `user_id, created_at DESC`) | Returns only reservations belonging strictly to authenticated caller identity. |

---

## 3. Operations & Admin Dashboard Flow

| Dashboard Panel / Tab | HTTP Method & Route | Auth & Role | Query / Body Schema | Response Envelope | Performance Guarantee |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Executive KPI Summary Cards** | `GET /api/v1/admin/dashboard/summary` | Bearer (`admin`) | None | `AdminDashboardSummaryDto` (`campaigns`, `reservations`, `generatedAt`) | Single round-trip SQL aggregate query. No N+1 scans. |
| **Campaign Management Table** | `GET /api/v1/admin/campaigns` | Bearer (`admin`) | `?status=...&search=...&page=1&limit=20` | `PaginatedResponseDto<CampaignResponseDto>` | Parameterized query using `idx_flash_campaigns_created`. |
| **Campaign Creator Modal** | `POST /api/v1/campaigns` | Bearer (`admin`) | `CreateCampaignDto` | `CampaignResponseDto` | Creates DB record and preloads Redis stock & metadata. |
| **Campaign Activation Toggle** | `POST /api/v1/campaigns/:id/activate` | Bearer (`admin`) | Path: `:id` | `CampaignResponseDto` | Atomically sets `isActive: true` in Redis hash. |
| **Campaign Deactivation Toggle** | `POST /api/v1/campaigns/:id/deactivate` | Bearer (`admin`) | Path: `:id` | `CampaignResponseDto` | Sets `isActive: false` in Redis hash. |
| **Stock & Reconciliation Audit Panel** | `GET /api/v1/admin/campaigns/:id/inventory` | Bearer (`admin`) | Path: `:id` | `AdminCampaignInventoryDto` (`availableStockRedis`, `activeReservedUnits`, `paidUnits`, `expiredUnits`, `driftDetected`) | Audits live Redis stock counter against database reservation breakdown. |
| **Reservations Master Table** | `GET /api/v1/admin/reservations` | Bearer (`admin`) | `?search=...&campaignId=...&status=...&userId=...&from=...&to=...&page=1&limit=20` | `PaginatedResponseDto<AdminReservationDetailDto>` | Indexed search across ULID and customer IDs. |
| **Reservation Inspector Drawer** | `GET /api/v1/admin/reservations/:id` | Bearer (`admin`) | Path: `:id` | `AdminReservationDetailDto` | Includes DB sync timestamp and optimistic lock version. |
| **Engine & Worker Monitoring Tab** | `GET /api/v1/admin/metrics/summary` | Bearer (`admin`) | None | `AdminMetricsSummaryDto` (`streamPendingCount`, `streamLength`, `database`, `redis`, `uptimeSeconds`) | Clean JSON summary without parsing raw Prometheus text. |

