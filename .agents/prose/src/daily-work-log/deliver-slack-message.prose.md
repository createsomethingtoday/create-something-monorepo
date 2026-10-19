---
name: deliver-slack-message
kind: function
version: 0.1.0
---

# Deliver Slack Message

> One non-idempotent Slack write with the attempt marker, receipt, and readback
> that the runbook requires. Called once per staged message, sequentially.
> Derived from `docs/guides/DAILY_WORK_LOG_RUNBOOK.md` §5.

### Parameters

- `staged_request`: the exact JSON request staged by `stage-work-log-copy`.
- `parent_ts`: the confirmed parent timestamp for a reply, or null for a
  parent.
- `attempt_record`: path for the durable attempt marker.

### Returns

- `result`: `{ identity, status, ts, readback_method, response_path }` where
  `status` is one of `verified`, `deferred_verification`, `uncertain`,
  `denied`.
- if the response lacks `successful:true`, `data.ok:true`, and `data.ts`: the
  status is `uncertain` and the full response is saved.
- if readback is throttled after a successful send: the status is
  `deferred_verification` with the receipt saved.

### Errors

- `access_denied`: the provider refused the write. The caller must stop.
- `rate_limited`: a 429 with the Retry-After value. The caller defers.

### Invariants

- The attempt marker, containing task identity, exact staged request,
  destination, attempt time, and known parent timestamp, is persisted before
  the send.
- Exactly one send per call. A timeout or missing `data.ts` never triggers a
  retry inside this function.
- The full response and timestamp are saved immediately after the send,
  before anything else.
- Readback uses the thread fetch with channel and parent `ts`, matching exact
  timestamp and content, and records the verification method.

### Shape

- `self`: persist marker, send, save response, read back, report.
- `prohibited`: retrying; reconnecting; changing grants; switching
  connectors; editing or deleting messages.
