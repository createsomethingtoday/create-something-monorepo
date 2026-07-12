# Agents: CREATE SOMETHING Scheduler

## Product boundary

This app owns the `createsomething/together` scheduling workflow for Micah Johnson. It is an AI-native, API-first, MCP-first public booking system, not a general calendar product.

The `BookingService` command/query interface owns scheduling behavior and all booking mutations. `RoomService` owns first-party meeting identity, role capabilities, participant capacity, provider reconciliation, join credential exchange, and terminal end semantics. HTTP API handlers, MCP handlers, the public browser client, and operator utilities must call these interfaces. They must not implement availability, conflict, booking/room lifecycle, idempotency, reminder, credential, or provider rules independently.

The host-scoped Durable Object is the authoritative state and serialization boundary for link configuration, recurring availability exceptions, booking state, idempotency, lifecycle receipts, encrypted provider credentials, and reminder alarms. Google Calendar remains the external source of truth for busy intervals and created meeting events. If Calendar availability or event mutation cannot be confirmed, fail closed and return an operator-actionable receipt.

## Tier ownership

- Database: Durable Object storage for configuration, date-specific availability overrides, bookings, rooms, role-capability fingerprints, idempotency, OAuth state/credentials, reminder queue, and receipts.
- Automation: `BookingService`, `RoomService`, Google Calendar, RealtimeKit and notification adapters, versioned HTTP API, MCP server, OAuth callbacks, and alarm processing.
- Judgment: versioned scheduling and meeting-room policies, approval semantics, capacity, escalation/rollback rules, MCP prompt, and tool mutation boundaries.

## Interface rules

- Public reads and booking preparation are non-mutating.
- Date-specific availability overrides require operator authorization, explicit intent, a bounded wall-clock window, and a reason. Deletion is the rollback.
- Booking commits require a short-lived signed proposal, a caller-supplied idempotency key, and explicit intent.
- Browser commits require the approved anti-abuse proof. MCP commits require scoped operator authorization.
- Reschedule and cancellation require either a scoped booking action token or operator authorization.
- Mutating MCP tools return `structuredContent`, conform to an output schema, set accurate tool annotations, and include a lifecycle receipt plus next safe actions.
- Do not expose Google access/refresh tokens, provider event payloads containing unnecessary data, scheduler action tokens, or raw PII in logs/resources.
- RealtimeKit API credentials remain server-side. Provider participant tokens are issued only in immediate no-store join responses and never appear in room URLs, durable records, receipts, logs, or MCP resources.
- A room permits exactly one host and one guest. Raw display names and email addresses are never used as RealtimeKit `custom_participant_id` values.
- Keep deterministic scheduling policy outside the model. Sampling or AI reasoning may explain or sequence actions but cannot override busy intervals, atomicity, notice windows, authorization, or committed state.

## Validation

```bash
pnpm --filter @create-something/create-something-scheduler check
pnpm --filter @create-something/create-something-scheduler test
pnpm --filter @create-something/create-something-scheduler build
```

Interactive changes also require the Browser/MCP/API/Google Calendar workflow in `/Users/micahjohnson/Code/create-something-monorepo/.codex/first-party-scheduler/goal.md`; meeting-room changes additionally require `/Users/micahjohnson/Code/create-something-monorepo/.codex/first-party-meeting-room/goal.md`.
