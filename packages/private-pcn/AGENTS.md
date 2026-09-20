# Private PCN

Managed single-network service. Database owns videos, memberships and receipts; Automation owns Stream upload/delivery; Judgment owns publication and access policy.

- Entry point: `README.md`, `src/hooks.server.ts`, `src/routes/api/[...path]/+server.ts`.
- Boot command: `pnpm dev` for layout; `pnpm build && node ../../scripts/run-wrangler.mjs dev` for Worker/D1 behavior.
- Smoke command: `pnpm check && pnpm test && pnpm build`.
- Validation surfaces: SQL-route tests, Identity hook tests, real Stream and browser acceptance in `docs/delivery-runbook.md`.
- UI validation path: home -> library -> sign in; admin upload -> readiness refresh -> publish -> member playback -> revoke -> reload/logout. Test anonymous and valid uninvited identities.
- Escalation rule: missing provider permissions or test identity is an external gate. Never add an auth bypass or public original URL to satisfy the demo.

Use CREATE SOMETHING Identity, exact audience `agency`, live user validation and fresh network membership. Keep host-only credentials server-side. Do not bind client resources. Stream originals require signed delivery even for public previews. `env.preview` has its own D1 and no production routes. Do not promote before CRE-2030 acceptance/review gates.
