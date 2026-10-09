# Existing Worker + D1 setup recommendation

This supersedes the earlier Pages/KV publisher proposal. Pages documents bindings for production and preview environments; no branch-specific binding isolation was established. We therefore do not change any `maverick-x` Pages environment, branch, alias, binding or credential. [Cloudflare Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/).

The concrete non-secret setup is in `approval-packet.json`. Existing Worker `client-workspace` at `workspace.createsomething.io` uses its existing D1 `DB` binding, database `3000e7d4-99e9-4103-9a9e-536ad172f16c`. New cloud resources and collaboration storage bindings: zero. The old injectable `publisher.ts` and migration 0002 remain tested research fixtures; neither is mounted or needed by this rollout.

## Implemented locally

- `/collaboration/` mounts before the existing operator-only Sandbox boundary, behind its own exact-project membership check. The existing workspace allowlist is unchanged. The new route is disabled unless `COLLABORATION_ENABLED` is exactly `true`.
- Migration 0001 adds only `collaboration_projects` and `collaboration_members`. A single bounded D1 aggregate commits publication, immutable per-job snapshot, current pointer, audit and replay outcome together. SQL checks publication actor, reviewer and original requester membership revisions at commit. Stale or concurrent proposals cannot overwrite a winner. [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/).
- `/collaboration/preview/<job-uuid>/` renders the exact approved headline snapshot. It escapes text, runs no script, loads no remote assets, and has no form/network capability. Historical URLs retain their version. `/collaboration/preview/` intentionally shows the current snapshot.
- The renderer is a focused component preview, not a claim to reproduce the entire deployed website. Its source bundle comes from `packages/maverick/scripts/seed-data.json` (`content:home`) at explicit commit `e0f57769f33f3aca0d654fbb79305deedf73df2c`. This is a repository seed baseline, not verified live KV parity. A changed bundle fails closed against stored publications until a reviewed migration/rebase decision.
- `/collaboration/source/<job-uuid>.json` exports the exact base commit, repository path, expected original value, approved candidate value and digest. It performs no source write. Source promotion remains a separate repository review and production remains Micah-only.
- Sign-in has one allowlisted return path for collaboration. Access refresh happens before an HTML sign-in redirect. Other return targets cannot redirect externally.
- A member can connect Claude/Codex to `/api/collaboration/mcp` using a browser-generated 256-bit task token. Only its SHA-256 hash is stored in D1. Its audience, task, owner membership revision and expiry are checked on every request. The actual MCP SDK exposes only context read and `proposal.create`; no approval or publication method exists. Stateless JSON transport runs in local workerd with the Worker-safe schema validator and no persistent sessions/SSE loops.
- The task credential is copied only by an explicit browser click into native agent secure configuration. It is never a provider credential, human session cookie, or Codex OAuth token. Tokens expire at the earlier of task expiry or the current human access-token expiry; the UI permits a replacement task at effective expiry.

## Exact setup, gated until approved

1. Review the source bundle and accept the bounded component-preview scope. Regenerate deterministically with `node apps/client-collaboration-pilot/prepare-worker-bundle.mjs <reviewed-40-character-Git-SHA>` if another source baseline is selected. No provider fetch is involved.
2. Apply only migration 0001 to the existing Client Workspace D1 using the existing authorized operator process. Do not apply legacy publication migration 0002 for this path.
3. Deploy the reviewed existing Worker and set `COLLABORATION_ENABLED=true` through its existing deployment process. No new runtime secret, publishing token, Worker, KV namespace, R2 bucket, Sandbox, DO, alarm, or model API key is needed.
4. Verify Identity invitation-mode state. Using an existing authorized `enrollment_invitation_manage` deputy, create only the three 48-hour exact-email admissions in the packet. Issuance sends no email. If no deputy exists, separately approve a narrowly scoped one through the secure secret manager and revoke it after admissions. Never enable public signup or replace unrelated allowlists.
5. Complete the actual authorized provider and browser acceptance flow before separately authorized team notifications. Native Claude/Codex secure task-token configuration and their existing provider sessions remain to be exercised; synthetic MCP transport success does not prove that live acceptance.

## Remaining acceptance and decisions

No live route, migration, admission, grant, credential, deployment or notification was created. The public hostname and existing resource IDs were previously read-only verified. All new routes remain proposed until deployment.

The approved roster is Vanessa Ortiz (`vanessa.ortiz@maverickx.com`), Estefania Fernandez (`estefania.fernandez@maverickx.com`) and Rajat Sehgal (`rajat.sehgal@maverickenergy.com`). Their accounts were absent at the read-only check. Identity issuer/audience remain the existing CREATE SOMETHING first-party configuration. ChatGPT sign-in is not a dependency; no subscription is treated as API billing authority.

Incremental cost is existing Worker/D1 usage. The application bounds mutation count, aggregate bytes, body sizes and task duration; this is not a dollar cap. No automatic model jobs or persistent compute are introduced.

Real source promotion, full-site rendering, and production deployment are deliberately separate work. The old Pages publisher interface is not a default credential request. Screenshots and tests use synthetic content/credentials; no provider model calls were made.
