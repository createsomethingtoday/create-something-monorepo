---
name: template-review-tick
kind: gateway
version: 0.1.0
id: 01M58T5M4RBYB32FM623WEXGQ3
---

# Template Review Tick

> Ingress for the scheduled template review run. The launchd job
> `com.createsomething.template-review` fires `bin/template-review-run.sh`,
> which starts a headless Claude Code session with this gateway's
> `run_request`. The run stops at staged verdicts; no decision leaves this
> program without the reviewer's sign-off through `apply-reviewer-decisions`.

### Continuity

external-driven

### Schedule

- `30 8 * * 1-5` and `30 13 * * 1-5` in `America/Chicago`. The plist at
  `.agents/prose/bin/com.createsomething.template-review.plist` is the
  source; the installed copy lives in `~/Library/LaunchAgents/`.

### Receives

- Manual kick: the reviewer runs `bin/template-review-run.sh` or asks for a
  run in a Claude Code session.
- Targeted kick: the reviewer names one or more version ids.

### Maintains

- `run_request`: `{ run_started_at, mode, version_ids, max_versions }` where
  `run_started_at` is one UTC timestamp captured once, `mode` is one of
  `scheduled`, `manual`, `targeted`, `version_ids` is empty unless
  targeted, and `max_versions` defaults to 12.

**Canonicalization spec**: `run_started_at`, `mode`, and `version_ids` are
material. Transport ids are immaterial.

### Emits

- review-queue-loaded
