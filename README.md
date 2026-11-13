# FlashReserve frontend

Premium customer flash-sale pages and a separate operations console using Lovable's supported **TanStack Start / React 19**, not Next.js. The existing NestJS/Fastify service remains untouched.

## Delivery status

Implemented: customer navigation, sales browsing controls, reservation-ID lookup, campaign/reservation/checkout unavailable states, operations layouts, protected directories, system health unavailable states and connection information.

**Not integrated:** real campaigns, inventory, reservations, payments, authentication, metrics or campaign mutations. Backend source was not supplied and `http://localhost:3000/api` refuses connections in the sandbox. No silent demo data or success states are used; the seeded campaign's initial stock is not live inventory.

## Local development

Install Bun, then run:

```sh
bun install
bun run dev --host 0.0.0.0 --port 8080
```

Open `http://localhost:8080`. Run the existing backend and worker separately according to **their own verified README**, with Redis/PostgreSQL configured there. Backend scripts cannot be documented accurately without its source. Localhost only reaches services on the same machine; an accessible HTTPS service is required for hosted integration.

## Configuration

See `.env.example`. Its `BACKEND_API_URL`, `APP_URL`, `SESSION_COOKIE_NAME`, and `ENABLE_DEV_AUTH` values document future integration; **no adapter reads them yet**. Setting a URL alone does not activate guessed endpoints. Never copy the backend `.env` or expose database, Redis or PASETO secrets. No direct database/Redis connections exist.

## Routes

`/`, `/sales`, `/sales/:campaignId`, `/how-it-works`, `/reservations/:reservationId`, `/checkout/:reservationId`, `/admin`, `/admin/campaigns`, `/admin/campaigns/:campaignId`, `/admin/reservations`, `/admin/reservations/:reservationId`, `/admin/metrics`, `/admin/settings`.

## Structure and contracts

- `src/routes`: typed file routes and unique page metadata.
- `src/components`: separate customer/operations shells and shared shadcn controls.
- `src/lib/flashreserve.ts`: fail-closed integration and state safety helpers.
- `src/styles.css`: semantic design system.
- `src/test`: safety and routing tests.

Read [API integration matrix](docs/API_INTEGRATION_MATRIX.md), [integration gaps](docs/BACKEND_INTEGRATION_GAPS.md), and [frontend architecture](docs/FRONTEND_ARCHITECTURE.md).

## Authentication and payments

Token issuance and role contracts are unverified. All private reads/mutations are disabled. Operations pages disclose no sensitive records but are **not a completed sign-in system**. Future integration needs server-validated Secure/HttpOnly/SameSite sessions, CSRF protection, owner/role checks and idempotent mutation reconciliation. No localStorage tokens or implicit development login exist. Checkout is mock-only; no card data is collected and no state is marked paid locally.

## Testing

```sh
bun run test
bun run lint
bun run build
```

Lovable validates compilation automatically. Backend-dependent reservation/payment/admin journeys are blocked until verified contracts, an accessible service and isolated test data are supplied. Do not mutate existing seeded stock or production databases in tests.

## Docker and publishing

The Dockerfile is a **local development container**, not a production deployment claim:

```sh
docker build -t flashreserve-dev .
docker run --rm -p 8080:8080 flashreserve-dev
```

Containers must reach the separate backend through a network service name, not their own localhost. Production publishes through Lovable's managed runtime. The generated output is a Cloudflare Worker, not a Node standalone server; production container deployment needs a compatible runtime and is not verified here.
## Monorepo layout

```text
/                         TanStack Start web app (root, required by Lovable preview)
packages/shared-types/    Shared API contracts (@flashreserve/shared-types)
apps/backend/             NestJS/Fastify sale service (add source here)
turbo.json                Task pipeline
.github/workflows/ci.yml  CI with path filters
```

Use Conventional Commits (`feat(api): ...`, `fix(ui): ...`) and short-lived `feat/...` branches merged into `main`. Never commit `.env` files.
