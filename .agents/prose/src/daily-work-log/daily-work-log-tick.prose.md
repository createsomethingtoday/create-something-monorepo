---
name: daily-work-log-tick
kind: gateway
version: 0.1.0
id: 01M58ERJVEER9A20ZX73C8NMCJ
---

# Daily Work Log Tick

> Ingress for the daily Slack work log. This gateway is the contract form of
> the existing 17:00 America/Chicago schedule. It does not replace the launchd
> job that fires today; it documents the trigger so the discovery
> responsibility has one declared wake source. Runbook §"Purpose and authority".

### Continuity

external-driven

### Schedule

- `0 17 * * *` in `America/Chicago`, including weekends and daylight saving
  transitions. Verify the saved automation when auditing the real cadence; this
  file does not create or modify an automation.

### Receives

- Manual kick: an operator asks for a run in the owning chat.
- Recovery kick: an operator asks for a backfill after a degraded period.

### Maintains

- `run_request`: `{ run_started_at, mode, overlap_hours }` where
  `run_started_at` is one UTC timestamp captured once and used throughout the
  run, `mode` is one of `scheduled`, `manual`, `recovery`, and
  `overlap_hours` is 24 (48 on a first run).

**Canonicalization spec**: `run_started_at` and `mode` are material; a new tick
must move the fingerprint or nothing downstream wakes. Transport request ids
are immaterial.

### Emits

- completed-work-discovered
