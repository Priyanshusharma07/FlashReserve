# Backend integration gaps

These are **unverified capabilities**, not assertions that the backend lacks them.

1. Backend is inaccessible: provide its source or publish a reachable HTTPS service. This sandbox cannot reach a service running on the user's localhost.
2. Campaign discovery/detail: need verified methods, paths, pagination and filtering, timestamps, descriptions, live stock source, supported quantities and eligibility limits. Do not use the brief's initial 10,000 stock as current stock.
3. Reservation creation: need request schema, auth header, idempotency header and conflict/reconciliation contract. Persist a logical attempt key safely across refresh and reuse it for ambiguous retries. Do not retry mutations blindly.
4. Reservation lookup: need owner authorization, response schema, actual states and expiry. Poll nonterminal records with visibility-aware intervals only once verified.
5. Mock checkout: need test token format, expiry rules, backend-confirmed results and a lookup after ambiguous responses. No real payment details are collected.
6. Admin: need production token issuance, session validation and actual role rules. All operations currently fail closed with no sensitive reads. No development fallback or fake login is implemented.
7. Metrics: need verified protected endpoints, metric names and suitable history. No synthetic charts or summary counts are displayed.

## Recommended contracts (proposals, not callable endpoints)
- Campaign collection: `{ items: Campaign[], nextCursor?: string }`; detail includes authoritative availability, status, start/end timestamps and reservation rules.
- Create reservation: campaign ID, supported quantity, authenticated identity and stable idempotency key; returns reservation ID and confirmed state. Reconciliation should resolve the same key without allocating twice.
- Reservation detail: ID, campaign reference, actual state, quantity, createdAt, expiresAt, and backend-derived checkout eligibility. Restrict to the owner or verified privileged role.
- Checkout: reservation ID plus an explicitly documented mock token; returns persisted payment/reservation outcome; repeated requests must not double-charge or double-transition.
- Auth: issuance, validation, expiration and documented roles; frontend-managed cookies must be Secure, HttpOnly and SameSite with CSRF protection.
- Admin collections/health: documented role-checked data, cursor pagination, stable metrics and timestamped observations.

No frontend-managed inventory, fake reservations, local payments, direct Redis/Postgres connections or fabricated campaigns are permitted.