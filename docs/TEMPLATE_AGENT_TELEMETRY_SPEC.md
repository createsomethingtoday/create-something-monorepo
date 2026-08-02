# Template Chat Worker-Side Telemetry + Slack Alerting — Spec

**Status:** Draft for review · 2026-08-01
**Owner:** Micah Johnson
**Scope:** `packages/webflow-template-agent` (Worker, currently on the template-agent branch lineage at `e493e7b42`, deployed as `webflow-template-agent` on account `9645bd52e640b8a4f40a3a55ff1dd75a`) + a new scheduled digest/alert handler.

## Why

Client-side chat telemetry (`Code Component Event` / `component: TemplateChat` → Amplitude) has been dark since the webflow.com front-end tracking outage began 2026-07-21. Every chat scope reads zero while backend events (`Marketplace Order Created`) are normal. Conclusion: we currently have **no reliable signal on whether the chat works at all**. Server-side telemetry is immune to that failure mode, and the Worker already has the substrate: an Analytics Engine dataset (`webflow_template_agent_abuse`) receiving abuse/cost events since 2026-07-10.

This spec (1) extends that dataset into a full turn-quality record and (2) adds Slack alerting + a daily digest driven from it.

Pre-outage baseline (from Amplitude, Jul 10–20): **11–48 turns/day**, error spikes up to 35/day (Jul 11). All thresholds below are calibrated to that volume.

## Current state (verified)

`src/telemetry.ts` — `recordAbuseEvent()` writes to AE binding `AGENT_ANALYTICS`:

| Slot | Current contents |
|---|---|
| `index1` | event type |
| `blob1–4` | type, reason, model, environment |
| `double1–4` | actualCostMicroUsd, inputTokens, outputTokens, cacheInputTokens |

Event types: `session_minted`, `session_rejected`, `request_rejected`, `turn_allowed`, `turn_denied`, `turn_failed`, `turn_settled`.

**PII allowlist discipline (keep):** no request body, prompt, IP, auth/challenge token, session identifier, or template context enters Analytics Engine. All new fields below are numbers or fixed enums.

## Phase 1 — Digest + alerts on existing events (no Worker schema change)

Everything needed for traffic/error/spend monitoring is already being recorded. Ship the delivery layer first.

### Delivery: scheduled handler in the same Worker

Add to `wrangler.toml`:

```toml
[triggers]
crons = [
  "5 * * * *",    # hourly alert scan
  "0 15 * * *",   # daily digest — 15:00 UTC = 8am PT
]

[[kv_namespaces]]
binding = "ALERT_STATE"   # cooldown/dedup state
id = "<create>"
```

New secrets (via `wrangler secret put`):

- `CF_ANALYTICS_API_TOKEN` — API token scoped to **Account Analytics: Read** only (the AE SQL API does not accept the Worker's own identity; a token is required).
- `SLACK_WEBHOOK_URL` — incoming webhook for the target channel.

New module `src/digest.ts` exporting a `scheduled()` handler wired into `src/index.ts`.

### Querying Analytics Engine

Endpoint: `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql`
Table: `webflow_template_agent_abuse`. Counts must be sample-weighted:

```sql
SELECT blob1 AS type, SUM(_sample_interval) AS n,
       SUM(double1 * _sample_interval) / 1e6 AS usd
FROM webflow_template_agent_abuse
WHERE timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY blob1
```

(At current volume sampling never engages, but weighted queries stay correct if traffic grows. Retention is 90 days — long-baseline comparisons live in the digest text, not the dataset.)

### Alert rules

Scanned hourly. Each rule posts at most once per cooldown window (state in `ALERT_STATE` KV, TTL = cooldown). One Slack message per firing, no `@here`.

| # | Rule | Condition (trailing window) | Min sample | Cooldown | Meaning |
|---|---|---|---|---|---|
| A1 | Zero traffic | `turn_settled + turn_failed = 0` in 24h | — | 24h | Chat down, removed from page, or session mint broken |
| A2 | Error rate | `turn_failed / (turn_settled + turn_failed) > 0.20` in 6h | ≥ 5 turns | 6h | Model/stream failures (Jul 11 spike would have fired this) |
| A3 | Turn denials | `turn_denied > 0` in 1h, grouped by reason | — | 6h per reason | Budget exhausted or concurrency cap hit — users being refused |
| A4 | Spend | daily spend > 80% of `DAILY_BUDGET_MICRO_USD` ($25/day) | — | 24h | Budget pressure before hard denials start |
| A5 | Session rejections | `session_rejected > 50` in 1h | — | 6h | Bot pressure or Turnstile misconfiguration |
| A6 | Latency (Phase 2) | p95 `ttft_ms > 8000` in 6h | ≥ 10 turns | 6h | Requires Phase 2 fields |

Alert message shape (Block Kit): rule name, window, observed vs threshold, and one AE query link/snippet for follow-up. No raw user content ever (none exists in the dataset).

### Daily digest

Posted 8am PT. Compact — six lines, not a dashboard:

```
Template Chat — Fri Aug 1 (prev 24h, vs 7-day avg)
Turns: 34 (+13%) · Sessions minted: 41 · Denied: 0
Errors: 2 (5.9%) · p95 TTFT: 3.1s [Phase 2]
Displays: 51 · Templates shown: 204 · Page actions: 9 [Phase 2]
Spend: $4.12 of $25 · Tokens: 312k in / 48k out
⚠ Client-side Amplitude tracking still degraded (since Jul 21)
```

The ⚠ line is Phase 2's divergence check (see below); until then it's a hardcoded note while the outage persists.

## Phase 2 — Turn-quality fields (Worker schema extension)

Extend `AbuseEvent` and `recordAbuseEvent()` — **append-only** so existing queries keep working:

| Slot | New field | Source |
|---|---|---|
| `blob5` | `errorCode` (fixed enum: `model_or_stream_error`, `upstream_search_error`, `client_abort`, …) | catch sites in `sseResponse` |
| `blob6` | `stopReason` (Anthropic enum) | `AgentUsage` |
| `double5` | `durationMs` | wall clock around `runTurn` |
| `double6` | `ttftMs` (first `text`/`display` event) | timestamp in `emitFromAgent` wrapper |
| `double7` | `displaysShown` | count of `display` events in `emitFromAgent` |
| `double8` | `templatesShown` | sum of `payload.items.length` |
| `double9` | `pageActions` | count of `page_action` events |
| `double10` | `turnIndex` | `body.messages` length (position in conversation) |

All measured inside the existing `emitFromAgent` wrapper in `sseResponse` (`src/index.ts`) — no new plumbing; the wrapper already sees every SSE event. Attach to the existing `turn_settled` / `turn_failed` writes so it stays one row per turn.

These mirror the client's `response_completed` payload, so when Amplitude recovers, client and server numbers are directly comparable — which enables:

**A7 — client/server divergence (the outage detector):** digest-time comparison of Amplitude `message_sent` (last complete day, via Amplitude Export API or a saved-chart query) against server `turn_allowed`. Divergence > 50% on ≥ 10 turns → "client tracking degraded" line in the digest. This is what turns the next front-end tracking outage from a 10-day silent gap into a next-morning Slack line. Requires an Amplitude API secret; keep it digest-only (not a paged alert) since it's a data-quality signal, not a user-facing failure.

### Tests

- `test/telemetry.test.ts`: new fields land in the right slots; absent fields default to 0/''.
- `test/worker.test.ts`: a streamed turn records `ttftMs > 0`, correct display/template counts; a failed turn records `errorCode`.

## Slack channel

New channel, suggested `#template-chat-telemetry` (or fold into an existing marketplace-eng channel — owner's call; at ~1 digest + rare alerts/day it won't be noisy). Prerequisite: incoming webhook provisioned for it (Flowbot/IT request), URL stored only as a Worker secret.

## Rollout

0. **Merge `packages/webflow-template-agent` to main.** It's deployed production infra that exists only on a non-main branch lineage — that's the riskiest thing in this document. All subsequent steps assume it's on main.
1. Phase 1: KV namespace, secrets, `src/digest.ts`, crons. Verify with a manual `__scheduled` invocation against the live dataset before enabling crons.
2. Run alerts in shadow mode for 3 days (log instead of post) to confirm thresholds don't flap at this volume; then enable Slack posting.
3. Phase 2: schema extension + tests + deploy. Digest picks up latency/quality lines automatically (queries tolerate zero-filled history).
4. Phase 2b: Amplitude divergence check once an Amplitude API credential is provisioned.

## Non-goals

- Replacing Amplitude funnels — conversion attribution (chat → detail page → order) stays client-side + Snowflake.
- Per-user or per-session analytics — the dataset's PII allowlist forbids session identifiers by design; keep it that way.
- A dashboard. Alerts + a six-line digest fit the volume; revisit only if turns/day grows ~10×.
