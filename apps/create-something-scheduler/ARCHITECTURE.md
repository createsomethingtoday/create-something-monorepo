# CREATE SOMETHING Scheduler Architecture

Linear: [CRE-1213](https://linear.app/createsomething/issue/CRE-1213/replace-createsomethingtogether-savvycal-link-with-first-party), [CRE-1239](https://linear.app/createsomething/issue/CRE-1239/add-secure-emailed-booking-management-links)

## Deep-module proposal

Concept: A provider-backed appointment booking link for one CREATE SOMETHING host.

Current interface: The first-party scheduler owns the complete workflow. The repo's `schedule-mcp` owns internal D1 calendars, events, members, backfill, forecast, and conflict analysis. CLEARWAY owns facility/court reservations. Those systems remain separate from this secure Google-backed public booking lifecycle shared by Browser, JSON API, and MCP clients.

Problem: Adding public appointment booking directly to `schedule-mcp` would make callers understand its unrelated member/unit/template model and would mix its authoritative internal calendar CRUD with Google Calendar's external authority. Reusing CLEARWAY would leak facility, court, payment, and reservation concepts. A separate UI plus separate MCP server would duplicate lifecycle behavior and deploy state.

Proposed interface: One `BookingService` owns link reads, conflict-checked availability, booking lifecycle, receipt reads, and operator-owned availability overrides. HTTP API, MCP, Browser, and operator adapters translate to this interface and return the same typed outcomes and receipt identifiers.

Tier ownership: Database = host-scoped Durable Object SQLite and alarms; Automation = `BookingService`, provider adapters, API/MCP/UI adapters; Judgment = versioned scheduling policy, explicit-intent/approval rules, failure classification, escalation, and cutover policy.

Leverage: One implementation supplies a public booking page, direct API clients, MCP agents, operator recovery, concurrency protection, provider mutations, and cross-surface receipts.

Locality: Calendar/provider changes remain behind `CalendarPort`; email behind `NotificationPort`; time behind `Clock`; booking persistence and serialization behind `BookingStore`; date exceptions behind `AvailabilityOverrideStore`; policy behind `SchedulingPolicy`. UI and protocol changes do not alter domain rules.

Test surface: service tests through the public `BookingService`; adapter contract/parity tests through direct API calls, an in-memory MCP client, and the Browser; provider tests through fakes and the approved real Google Calendar verifier; Durable Object alarm tests through `cloudflare:test`.

Migration: The owned `/book` route and first-party Worker are the production authority. Rollback uses the prior first-party deployment while preserving Durable Object records and receipts for diagnosis.

## Runtime shape

```text
Browser SPA ─────┐
HTTP API client ─┼─> Worker adapters ─> BookingService ─> host Durable Object
MCP client ──────┘                          │                    │
                                           ├─> CalendarPort ───> Google Calendar + Meet
                                           └─> NotificationPort -> confirmation/reminder email
```

The Cloudflare Worker serves static browser assets, `/api/v1/*`, `/mcp`, OAuth callbacks, and operator receipt endpoints. A stateless Streamable HTTP MCP handler is sufficient because application state belongs to the host Durable Object, not the MCP session. The Durable Object serializes booking/reschedule/cancel operations and uses its single alarm as an ordered notification queue with idempotent confirmation, reminder, and reschedule delivery. Queue payloads contain only booking identity, notification kind, policy, schedule, and status; recipient data and lifecycle-bound action credentials are resolved at send time.

Booking-management email links use `https://createsomething.agency/book?booking=<id>#access=<token>`. The fragment is removed by the owned parent page before any network navigation and is handed only to the exact scheduler iframe origin through `postMessage`. Action credentials expire one day after the current meeting ends; a successful reschedule returns and emails a fresh credential for the moved slot.

## Application contracts

| Operation | Mutation | Authorization | Core result |
| --- | --- | --- | --- |
| `getLink` | no | public | public link config, default duration, allowed duration options + policy version |
| `listAvailability` | no | public, rate-limited | duration-specific slots or fail-closed provider receipt |
| `prepareBooking` | no persistent write | public/operator | signed expiring proposal + policy evaluation |
| `commitBooking` | yes | browser anti-abuse proof or MCP operator scope | booking + provider event/Meet refs + committed receipt |
| `getBooking` | no | booking action token or operator scope | scoped lifecycle state + receipts |
| `rescheduleBooking` | yes | booking action token or operator scope | same logical booking/event moved + receipt |
| `cancelBooking` | yes | booking action token or operator scope | canceled booking/event + receipt |
| `listAvailabilityOverrides` | no | operator scope | bounded date exceptions + receipt metadata |
| `upsertAvailabilityOverride` | yes | operator scope + explicit intent | applied date window + receipt |
| `deleteAvailabilityOverride` | yes | operator scope + explicit intent | rollback confirmation + receipt |

Every result is a discriminated union with `status`, `receiptId`, `policyVersion`, `occurredAt`, and `nextActions`. Expected statuses include `available`, `applied`, `deleted`, `proposed`, `committed`, `rescheduled`, `cancelled`, `rejected`, `retryable`, and `operator_required`.

Recurring Tuesday/Thursday hours remain the baseline policy. Policy V2 offers exactly 30- and 60-minute meetings, with starts only on the hour and half hour; 30 minutes is the backward-compatible default, and availability is calculated for the selected duration as one continuous conflict-free interval. Rescheduling preserves the original duration, while changing length requires a new proposal and booking. An availability override adds one bounded wall-clock window for one explicit date; it does not bypass Google Calendar conflict checks, minimum notice, allowed durations, or half-hour start alignment. Overrides are durable, operator-scoped, and reversible by ID.

## HTTP API v1

- `GET /api/v1/links/createsomething/together`
- `GET /api/v1/availability?from=<ISO>&to=<ISO>&timezone=<IANA>&durationMinutes=<30|60>`
- `POST /api/v1/bookings/prepare`
- `POST /api/v1/bookings`
- `GET /api/v1/bookings/:bookingId`
- `POST /api/v1/bookings/:bookingId/reschedule`
- `POST /api/v1/bookings/:bookingId/cancel`
- `GET /api/v1/receipts/:receiptId`
- `GET /api/v1/operator/availability-overrides`
- `POST /api/v1/operator/availability-overrides`
- `DELETE /api/v1/operator/availability-overrides/:overrideId`
- `GET /openapi.json`

## MCP contract

Resources:

- `scheduler://links/createsomething/together`
- `scheduler://policy/createsomething/together`
- `scheduler://bookings/{bookingId}` (scoped template)
- `scheduler://receipts/{receiptId}` (scoped template)
- `scheduler://availability-overrides` (operator-scoped)

Tools:

- `scheduler_get_link`
- `scheduler_list_availability`
- `scheduler_prepare_booking`
- `scheduler_commit_booking`
- `scheduler_get_booking`
- `scheduler_reschedule_booking`
- `scheduler_cancel_booking`
- `scheduler_get_receipt`
- `scheduler_list_availability_overrides`
- `scheduler_upsert_availability_override`
- `scheduler_delete_availability_override`

Prompt:

- `schedule_create_something_together`: inspect policy, list availability, prepare without mutation, obtain explicit intent, commit once with idempotency, then read the receipt.

MCP uses Streamable HTTP at `/mcp`, validates `Origin`, requires scoped authorization for private resources and mutating tools, and returns both human-readable content and schema-valid `structuredContent`. Tool annotations are hints only; server-side authorization and policy checks are authoritative.

## Rejected alternatives

- Extend `schedule-mcp`: rejected because it owns internal calendars/backfill/forecast and currently has a different authority model; provider-backed public booking would widen its caller interface and security blast radius.
- Reuse CLEARWAY: rejected because facility/court/payment concepts would leak into appointment scheduling.
- Separate UI, API, and MCP implementations: rejected because lifecycle and receipt parity would be unverifiable and changes would spread across deployables.
- Use the LLM for slot/conflict decisions: rejected because availability and commit truth must be deterministic, fail-closed, and independently testable.
- Store booking authority only in D1: rejected for this single-host boundary because a host-scoped Durable Object provides serialization, strongly consistent storage, and reminder alarms behind one interface.

## First-party conferencing V1 extension

Linear: [CRE-1217](https://linear.app/createsomething/issue/CRE-1217/build-first-party-create-something-11-meeting-rooms)

Concept: a scheduler-owned one-to-one room capability backed by Cloudflare RealtimeKit as a replaceable media plane.

Current interface: `BookingService` asks `CalendarPort.createEvent` to create both the Calendar event and Google Meet conference, then persists the returned `meetUrl`. Browser, API, and MCP know only that provider URL. No application-owned room, role, join, presence, end, or receipt contract exists.

Problem: putting RealtimeKit REST calls directly in booking commit, API routes, MCP tools, and the room page would make every caller know provider App IDs, meeting IDs, presets, participant tokens, retry behavior, and token security. Deleting that shallow integration would spread the same authorization and lifecycle rules across every surface.

Proposed interface: one `RoomService` owns four stable capabilities:

- `createRoom({ bookingId?, title, idempotencyKey, explicitIntent })`
- `issueJoinCredential({ roomId, capability, displayName })`
- `getRoom({ roomId })`
- `endRoom({ roomId, idempotencyKey, explicitIntent })`

`RealtimeProvider` is a narrow seam behind that service: create/fetch a provider meeting, add or refresh a participant with a named preset, inspect active session state, and end the active session. Provider API credentials never cross the seam. The booking service consumes a separate `ConferencingPort` that returns an application room ID and public CREATE SOMETHING join URL; Google Calendar receives that URL as event location/description rather than generating Meet conference data.

Tier ownership:

- Database: room record, optional booking mapping, provider meeting reference, host/guest participant references, join-capability fingerprints, idempotency, lifecycle status, and receipts in the host Durable Object.
- Automation: RealtimeKit provider adapter, signed join exchange, Browser SDK initialization, Calendar join-link insertion, API/MCP adapters, and recovery.
- Judgment: one host plus one guest, role presets, join window, capability expiry, fresh provider-token issuance, explicit end, provider fail-closed behavior, and Google Meet rollback.

Room lifecycle:

```text
proposed -> ready -> active -> ended
               \-> retryable (provider uncertainty, no join token issued)
```

`createRoom` is idempotent by caller key and booking mapping. `issueJoinCredential` verifies a signed CREATE SOMETHING capability bound to room, role, and expiry before adding or refreshing the provider participant; raw RealtimeKit tokens are returned only in the immediate no-store response and are never placed in URLs, receipts, logs, or durable storage. Host/operator `endRoom` is destructive, explicitly intended, idempotent, and terminal. Capacity and role checks remain server-side.

Leverage: the same module supports booking commit, direct operator room creation, Browser joining, API clients, MCP agents, lifecycle receipts, provider recovery, and later media-plane replacement without duplicating policy.

Locality: provider API/schema changes stay in `RealtimeProvider`; room state and authorization stay in `RoomService`; booking only knows `ConferencingPort`; HTTP/MCP/Browser remain adapters.

Test surface: test-first public `RoomService` behavior, Worker-runtime durable storage and signed exchange, real MCP/API parity, current official RealtimeKit fixtures, and a two-participant real Browser verifier with observable media state.

Migration: create controlled RealtimeKit App/presets and verify rooms independently while Google Meet remains configured. After two clean real-room verifier passes, switch future booking conferencing to the first-party port. Rollback restores Google Meet for new booking commits while preserving existing room lifecycle access and receipts for safe end/recovery.

Rejected conferencing alternatives:

- Raw Cloudflare Realtime SFU for V1: rejected because it intentionally provides no rooms or presence protocol and would make CREATE SOMETHING own track coordination and reconnection before product behavior is proven.
- Direct RealtimeKit calls from adapters: rejected because provider tokens, presets, idempotency, and lifecycle policy would leak across callers.
- Provider participant token in the join URL: rejected because URLs leak through history, logs, referrals, and calendar forwarding; exchange a scoped application capability for a fresh token instead.
- Recording/transcription in V1: rejected because it expands consent, retention, storage, cost, and deletion policy before the live one-to-one call loop is proven.
