# CREATE SOMETHING Private

Managed private content networks. Public offer: https://private.createsomething.agency. https://private.createsomething.io redirects to the canonical host, preserving path and query.

SvelteKit/Cloudflare, isolated D1, Cloudflare Stream, and CREATE SOMETHING Identity. [Source selection](docs/source-reconciliation.md). Private media requires both current application access and a short-lived signed delivery grant. No Outerfields resources are shared.

Commands: `pnpm dev`, `pnpm check`, `pnpm test`, `pnpm build`. Deploy only after CRE-2030 promotion checks and provider configuration. Provisioned resource IDs belong in the committed Wrangler configuration; secret values never do. No placeholder deployment bindings are supplied.

## Access
`PCN_ADMIN_EMAILS` is the explicit verified administrator allow-list. Members are granted or revoked in the private network database after a verified CREATE SOMETHING Identity sign-in. Membership changes do not send email. `agency` is the exact Identity audience; PCN entitlement remains separate from Agency commercial entitlement. Host-only secure HTTP-only cookies hold credentials. There is no preview or demo administrator bypass.

## Media
`CLOUDFLARE_ACCOUNT_ID` and secret `CLOUDFLARE_STREAM_API_TOKEN` must reference the owning CREATE SOMETHING account. All originals require signed URLs. Uploads begin as private drafts. Administrator status refresh verifies Stream readiness and signed-delivery settings before publication. Polling is deliberately used for this bounded demo, avoiding changes to an account-wide Stream webhook shared with existing clients.

Demo limits: 20 unarchived videos, 1 GB per upload, 30 minutes per film. Archiving does not delete originals or free billed storage. Provider usage must be reviewed separately. No new paid capacity is implicitly authorized. Playback grants last 60 seconds and are renewed while the player is open. Revocation stops new grants; it cannot recall buffered/downloaded media.

## Verification boundary
Unit tests and build are supporting evidence. Completion additionally requires real production browser upload/processing/publication/playback, anonymous and uninvited denial, membership revocation, session reload/logout, mobile/keyboard checks, and canonical/redirect host readback. See the root `.codex/private-pcn/goal.md` and CRE-2030 for live evidence and current gates.

## Delivery and development

[Delivery runbook](docs/delivery-runbook.md) covers provisioning, acceptance, support, usage, backup and rollback. Build workspace dependencies before a fresh check/build: `pnpm --filter @create-something/auth-platform build && pnpm --filter @create-something/tufte package && pnpm --filter @create-something/canon package`.

Preview uses `node ../../scripts/run-wrangler.mjs deploy --env preview` after build and `d1 migrations apply cs-private-pcn-preview --remote --env preview` for its isolated schema. Preview has no production custom domains. Stream and Identity browser acceptance remain mandatory before production promotion.
