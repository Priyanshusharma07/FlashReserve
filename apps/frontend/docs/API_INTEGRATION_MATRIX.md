# FlashReserve API integration matrix

## Inspection result
The supplied file describes a separate NestJS/Fastify service. Its source is not in this checkout. `http://localhost:3000/api` and `http://localhost:3000/docs` are unreachable from the Lovable sandbox (connection refused). Localhost refers to the machine making the request, not the user's development computer. No controller, DTO, guard, idempotency behavior, or response has been verified. Consequently **no real endpoints are integrated** and no success responses are fabricated.

| Feature | HTTP Method | Endpoint | Authentication | Request | Response |
|---|---|---|---|---|---|
| Campaign listing | Unverified | Not supplied | Unverified | Unverified | Unverified |
| Campaign details | Unverified | Not supplied | Unverified | Unverified | Unverified |
| Create reservation | POST (reported only) | `/api/v1/sales/:campaignId/reserve` (reported only) | Unverified | Unverified, including idempotency key | Unverified |
| Reservation status | Unverified | Not supplied | Unverified | Unverified | Reported statuses: ACCEPTED, RESERVED, PAID, EXPIRED; not source-verified |
| Checkout | Unverified | Not supplied | Unverified | Mock token contract unknown | Unverified |
| Health | GET (reported only) | `/health/liveness` (reported only) | Unverified | None reported | Unverified |
| Readiness | GET (reported only) | `/health/readiness` (reported only) | Unverified | None reported | Unverified |
| Metrics | GET (reported only) | `/metrics` (reported only) | Unverified | None reported | Prometheus exposition reported; metric names unknown |
| Login / role verification | Unverified | Not supplied | PASETO v3 local reported | Unverified | Unverified |

The `/api` base path supplied by the user must be reconciled with reported `/api/v1` and root health paths before implementing adapters. Do not concatenate these speculatively.

Next inspection inputs: backend source archive or an accessible HTTPS backend URL with Swagger/OpenAPI, auth source, and isolated test access. Do not upload backend secrets.