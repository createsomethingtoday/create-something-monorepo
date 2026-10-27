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

The scheduler OAuth identity remains `micah@createsomething.io`. On October 27, 2026, Google Calendar allowed `micah@webflow.com` to share **See only free/busy (hide details)** with that identity. A direct free/busy read verified access. No Webflow event details or additional OAuth credentials are required.

The production Worker runs `*/15 * * * *` in UTC. Its scheduled handler calls the host Durable Object, which uses the existing encrypted OAuth credential and `GoogleCalendarPort` to query only `micah@webflow.com`. Successful refreshes publish a 42-day, busy-only projection with a 45-minute TTL through the existing projection validator. Provider errors do not overwrite or extend the previous projection; failed scheduled events surface in Cloudflare observability.

Verification:

1. Keep the local producer running during migration.
2. Read operator status: `webflowCloudRefresh` records the last cloud attempt, trigger (`cron` or `operator`), outcome, receipt, coverage, and expiry without intervals or event metadata.
3. An operator can invoke `POST /api/v1/operator/conflict-projections/webflow-google-calendar/refresh` with bearer authorization and JSON `{"explicitIntent":true}` to test cloud access. An operator-triggered success is not proof of the cron trigger.
4. Require a successful `trigger: cron` receipt, advancing `observedAt`, and `ready`, `webflowProjectionFresh`, and `webflowProjectionHorizonCovered` all true. Check public availability excludes a known busy interval and includes a neighboring open interval before retiring the local trigger.
5. Only after that proof, unload the local LaunchAgent `com.createsomething.scheduler.webflow-busy-sync`. Preserve its wrapper and plist for rollback.

Local fallback remains `apps/create-something-scheduler/scripts/sync-webflow-busy-projection.swift`, bound to EventKit source `WEBFLOW` / calendar `micah@webflow.com`. Runtime credentials come from Infisical. The local producer and cloud producer both publish opaque intervals through the same validator. Do not extend the TTL or disable the projection requirement to hide a refresh failure.

Rollback: bootstrap the preserved local LaunchAgent and require an accepted projection and green readiness before rolling back the cloud deployment or removing its cron. Removing the free/busy share revokes cloud access; failures then retain the last projection only until its original expiry.

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

## Independent sync warning monitor

`wrangler.monitor.jsonc` owns `create-something-scheduler-monitor`, a separate Worker and singleton `SyncMonitor` Durable Object. Its five-minute cron reads the scheduler's authenticated operator status. It never writes calendar events, bookings, or projections.

Warnings go to `micah@createsomething.io` when the latest cloud refresh fails or is missing, the last successful refresh is at least 20 minutes old, projection expiry is within 20 minutes, or scheduler readiness/status cannot be confirmed. A missed refresh normally leaves 20–25 minutes of warning before the unchanged 45-minute expiry. Provider delivery latency and outages can affect notification timing.

The monitor persists one warning per incident and one recovery after health returns. Frozen email content and an idempotency key are saved before sending. Uncertain sends retry with identical content/key; after 23 hours delivery retries stop for operator reconciliation while scheduler health checks continue rather than risk duplication beyond Resend's 24-hour dedupe window. Monitor failures surface as failed Cloudflare scheduled events; this monitor and the sync still share Cloudflare infrastructure.

Bindings `OPERATOR_API_TOKEN` and `RESEND_API_KEY` are injected from the existing Infisical production secrets. Do not commit or print their values. Activate the cron only after installing the code and secret bindings and running a healthy operator check. The normal scheduler release and its 15-minute refresh remain independent of this monitor deployment.

Operator endpoints on `https://create-something-scheduler-monitor.createsomething.workers.dev` require bearer authorization:

- `GET /status`: last check, trigger provenance, open-incident state, and test receipt.
- `POST /check`: JSON `{"explicitIntent":true}` performs a real check and sends a warning or recovery if warranted.
- `POST /test`: JSON `{"explicitIntent":true,"idempotencyKey":"cre-2277-alert-test-v1"}` sends a clearly labelled delivery test to the fixed configured recipient. Reuse that exact key to reconcile this test, not to create a new test. It does not inject a fake incident or alter scheduler health.

Validation adds `vitest.monitor.config.ts` and `pnpm build:monitor`. Generate binding types with `pnpm types:monitor`; the fixture includes secret names with controlled values, never production secrets. The pinned local Workers test binary uses compatibility date 2026-07-11; production monitor compatibility is 2026-10-27 and requires live deployment verification.

Rollback: remove only the monitor's cron from its owning config and redeploy its triggers, preserving incident/delivery receipts for reconciliation. Keep the scheduler's refresh cron and Google sharing unchanged. To restore the old local refresh separately, first run `launchctl enable gui/503/com.createsomething.scheduler.webflow-busy-sync`, then bootstrap its preserved plist.

`POST /reconcile` requires operator authorization plus `explicitIntent: true`, the exact pending `idempotencyKey`, a `reason`, and an evidence-backed `outcome` of `delivered` or `not_delivered`. A delivered outcome also requires the provider `messageId`. It records an atomic reconciliation receipt; stale keys are rejected and identical retries are idempotent. Confirming non-delivery archives the old incident so future checks can open a new incident; confirming delivery resumes the existing incident/recovery flow. Never confirm an outcome without checking provider evidence.

The monitor enables `global_fetch_strictly_public` so its authenticated HTTPS status request reaches the scheduler Worker through Cloudflare’s public routing rather than bypassing Worker routing or failing a same-zone fetch.
