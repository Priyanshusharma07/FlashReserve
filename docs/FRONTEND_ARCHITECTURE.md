# Frontend architecture

This Lovable project uses **TanStack Start, React 19, TypeScript, Tailwind v4, shadcn controls, Lucide, and TanStack Query**. Next.js is not supported in this environment; the requested experiences use equivalent TanStack file routes. The existing NestJS service is not replaced.

- Routes own unique page metadata; generated route trees remain untouched.
- Customer pages share `PublicShell`; operations use a distinct sidebar layout.
- Shared semantic tokens live in `src/styles.css`; the generated cover is brand imagery, not a campaign/product photograph.
- `src/lib/flashreserve.ts` centralizes unavailable integration state, status helpers, and metadata. `readCampaigns` explicitly rejects with a sanitized integration error; it never returns mock campaign rows.
- UI filters/search/sort maintain local state but cannot return results before real data exists. Retry reports that the service is still unavailable; it does not pretend to contact an unknown endpoint.
- Reservation lookup navigates to the entered ID without asserting it exists. Details and checkout are blocked pending verified API/auth contracts.
- Admin pages show no private records or metrics before verified production authorization. This is a deny-by-default presentation boundary, not a substitute for future server authorization.
- No cookies/tokens are created, no credentials are stored, and no server API proxy is implemented until the source contracts are inspected. Later integration requires supported Lovable server infrastructure, verified authorization and secure credential configuration.
- Stable reservation attempt keys, CSRF protection, secure sessions, visibility-aware polling and mutation reconciliation remain future integration work, not claimed implemented features.

## Route inventory
`/`, `/sales`, `/sales/$campaignId`, `/how-it-works`, `/reservations/$reservationId`, `/checkout/$reservationId`, `/admin`, `/admin/campaigns`, `/admin/campaigns/$campaignId`, `/admin/reservations`, `/admin/reservations/$reservationId`, `/admin/metrics`, `/admin/settings`.

## Tests
Safety tests verify nonterminal/terminal status rules, reserved-only checkout eligibility and fail-closed campaign reads. Routing tests verify all required pages match. Browser tests exercise browsing, search/filter/sort, reservation lookup, blocked checkout and admin navigation in desktop/mobile layouts. Backend-dependent acceptance journeys cannot pass until a verified accessible service and isolated test data exist.