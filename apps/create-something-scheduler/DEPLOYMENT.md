# Scheduler deployment and cutover runbook

Linear: [CRE-1213](https://linear.app/createsomething/issue/CRE-1213/replace-createsomethingtogether-savvycal-link-with-first-party)

## Verified inventory

- Owning Cloudflare account: `Create Something`.
- Worker name: `create-something-scheduler`.
- Public origin: `https://schedule.createsomething.agency`.
- The legacy `workers.dev` public page routes redirect permanently to the custom domain. The existing Google OAuth callback and operator ingestion endpoint remain available on `workers.dev` to avoid an unrelated credential cutover.
- Durable Object migration `v1` and static asset binding are deployed.
- Live operator status on 2026-07-11 reports ready, Google OAuth connected, 11 selected calendars discovered, writable event calendar `micah@createsomething.io`, and RealtimeKit/room-capability configuration present.
- RealtimeKit App `8011e22d-a0e9-40f8-8a7a-27d3e5982744` uses the least-privilege `create_something_host` and `create_something_guest` presets.
- Current rollback state is `CONFERENCING_PROVIDER=google_meet`; first-party rooms are deployed and independently verifiable, but future booking commits have not yet been cut over.

## Runtime configuration

Non-secret Worker variables:

- `GOOGLE_EVENT_CALENDAR_ID=micah@createsomething.io`
- `GOOGLE_SELECTED_CALENDAR_IDS=micah@createsomething.io` initially; the approved OAuth callback discovers and durably persists all Calendar-list entries marked selected.
- `WEBFLOW_BUSY_PROJECTION_REQUIRED=true`; readiness and public availability fail closed unless the Webflow projection is fresh and covers the requested window.
- `GOOGLE_REDIRECT_URI=https://<approved-preview-host>/oauth/google/callback`
- `RESEND_FROM=CREATE SOMETHING <noreply@createsomething.io>`
- `TURNSTILE_EXPECTED_HOSTNAME=<approved-preview-host>`
- `REALTIMEKIT_APP_ID=8011e22d-a0e9-40f8-8a7a-27d3e5982744`
- `REALTIMEKIT_HOST_PRESET_ID=5015ba09-150e-40d2-9724-54bc6350d547`
- `REALTIMEKIT_GUEST_PRESET_ID=9227fe9f-0586-4c49-aa45-87780f4867e0`
- `SCHEDULER_PUBLIC_ORIGIN=https://schedule.createsomething.agency`
- `CONFERENCING_PROVIDER=google_meet|first_party`

Secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OAUTH_ENCRYPTION_SECRET` (new random value, at least 32 bytes)
- `PROPOSAL_SIGNING_SECRET` (new random value, at least 32 bytes)
- `ACTION_SIGNING_SECRET` (new random value, at least 32 bytes)
- `OPERATOR_API_TOKEN` (new random value, at least 32 bytes)
- `RESEND_API_KEY` (reuse only after confirming the sending domain and key scope)
- `TURNSTILE_SECRET_KEY`
- `REALTIMEKIT_API_TOKEN` (Worker secret; Infisical source `SCHEDULER_REALTIMEKIT_API_TOKEN`)
- `ROOM_CAPABILITY_SIGNING_SECRET` (Worker secret; Infisical source `SCHEDULER_ROOM_CAPABILITY_SIGNING_SECRET`)
- `TURNSTILE_SITE_KEY` is public configuration but remains in the managed inventory.

Google OAuth scopes are limited to:

- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.freebusy`
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`

## Webflow conflict-projection activation

The scheduler OAuth identity remains `micah@createsomething.io`. The Webflow-managed account cannot depend on cross-organization sharing, so the local EventKit producer publishes busy-only state from the exact macOS Calendar source `WEBFLOW` and calendar `micah@webflow.com`:

1. Run `pnpm --filter @create-something/create-something-scheduler sync:webflow-busy -- --dry-run` to verify EventKit access and the exact calendar match without making a network request. The producer projects event data immediately to opaque `{ start, end }` intervals; it never reads titles, attendees, descriptions, locations, or private Calendar URLs into the output or Worker payload.
2. Send the complete replacement projection to `PUT /api/v1/operator/conflict-projections/webflow-google-calendar` with operator authorization and `explicitIntent: true`. The payload must include `source`, `rangeStart`, `rangeEnd`, `observedAt`, `expiresAt`, and `intervals`.
3. Keep `expiresAt` no more than 90 minutes after `observedAt`. Production cadence is 15 minutes, so a missed run has bounded grace while repeated failures quickly fail closed.
4. Cover at least the next 28 days. Operator status must report `webflowProjectionFresh: true` and `webflowProjectionHorizonCovered: true` before `/ready` can pass.
5. Confirm a real Webflow busy interval is absent from Browser, API, and MCP availability while a neighboring open interval remains. Record only timestamps and receipt IDs in CRE-1376.

The production sync command is `infisical run --env=prod --path=/ --include-imports=true -- pnpm --filter @create-something/create-something-scheduler sync:webflow-busy`. The script reads the scoped `SCHEDULER_OPERATOR_API_TOKEN` injected at runtime; never place it in the repository, automation prompt, arguments, or logs. The committed defaults intentionally bind to one source/calendar pair and abort if the match is missing or ambiguous.

The recurring job is an ingestion producer, not a runtime dependency. If it stops, the projection expires, `/ready` returns unavailable, and public availability exposes no bookable slots. Restore the job and publish a fresh full replacement; do not extend expiry or disable the projection requirement to make readiness green.

## Approval gates

Stop for explicit operator approval before:

1. Creating or changing a Google OAuth client, consent screen, redirect URI, or production credential.
2. Deploying the new public preview Worker or creating its Durable Object migration.
3. Registering or changing a public/custom domain, DNS, or Turnstile hostname.
4. Sending a real booking invitation or reminder to any identity other than the specifically approved controlled test identity.

## Controlled conferencing cutover

1. Complete the two-participant room verifier in `.codex/first-party-meeting-room/goal.md`, including real camera/microphone, screen-share start/stop, reconnect, API/MCP parity, terminal end, and negative paths.
2. Change only `vars.CONFERENCING_PROVIDER` in `wrangler.jsonc` from `google_meet` to `first_party`.
3. Run `pnpm check`, `pnpm test`, `pnpm build`, and `git diff --check` in this package.
4. Deploy with `pnpm exec wrangler deploy` and record the Worker version in CRE-1217.
5. Read `/api/v1/operator/status` with operator authorization and require `ready: true` plus `conferencingProvider: first_party`.
6. Read the public link through Browser/API/MCP and confirm the conferencing policy reports the owned CREATE SOMETHING room.
7. Do not create a real Calendar invitation or reminder unless the controlled recipient has been separately approved.

## Rollback

- Set `vars.CONFERENCING_PROVIDER` back to `google_meet`, rerun package gates, deploy, and require operator status to report `google_meet`. This changes new booking commits only; existing first-party rooms remain readable/endable so lifecycle receipts and cleanup are preserved.
- If the public scheduling link itself is unhealthy, roll back Agency and Worker to the last green first-party deployments while preserving Durable Object records, first-party receipts, and Google event identifiers for diagnosis.
- Do not delete RealtimeKit meetings or revoke the App token as part of an ordinary rollback. End active controlled rooms through `RoomService` first.
- Rotate scheduler-specific secrets if a preview credential or action token is exposed. Do not rotate shared Resend or Turnstile credentials without confirming their other consumers.
