---
name: work-log-delivered
kind: responsibility
version: 0.1.0
id: 01M58ERJXCFZJBZVA15D5MQF67
---

# Work Log Delivered

> Automation tier of the daily work log. Turns reviewed candidates into exactly
> one Slack parent per distinct task and one checkpoint reply per update, with a
> durable attempt record and readback for every write. Derived from
> `docs/guides/DAILY_WORK_LOG_RUNBOOK.md` §4 to §6.

### Goal

Completed work is visible in the authorized Slack log channel, one parent per
distinct task, with every write proven by a receipt and readback or held as
pending.

### Requires

- `reviewed_candidates`: the candidate set after independent review, with
  dispositions, proof levels, and review status. *(Maintained by
  `candidates-reviewed`, facet `reviewed_candidates`.)*

### Maintains

The delivery ledger projection. The authoritative ledger stays in
`output/daily-work-log/state.json`.

**Type**:

- `threads`: map keyed by task identity of `{ parent_ts, checkpoints[],
  last_verified_at }`.
- `pending_delivery`: list of `{ identity, staged_request_path, attempt_at,
  status, reason }` where `status` is `pending`, `uncertain`, or
  `deferred_verification`.
- `delivery_health`: `{ dependency_unavailable, last_denial_at,
  verified_count, uncertain_count }`.

**Canonicalization spec**: task identity, `parent_ts`, checkpoint timestamps,
and pending status are material. Readback payloads, rate-limit headers, and
`last_verified_at` are immaterial. Threads are ordered by identity.

#### threads

Confirmed parents and checkpoints. Material: identity, `parent_ts`, and the
set of checkpoint timestamps.

#### pending_delivery

Work that must survive to the next run. Material: identity, status, reason.

#### delivery_health

Material: `dependency_unavailable`, `verified_count`, `uncertain_count`.

**Postconditions**:

- Each distinct task has exactly one parent. A checkpoint uses the recorded
  parent's `thread_ts`.
- Every attempted write has a durable attempt record and either a successful
  receipt with readback evidence or an explicit pending or uncertain entry.
- Ledger updates preserve prior tasks, pending work, and unknown fields.
- Counts distinguish task threads from individual messages.
- Closeout states delivery counts, remaining gaps, and lock disposition.

### Continuity

- **input-driven**: a new `candidates-reviewed` receipt whose
  `reviewed_candidates` facet fingerprint moved.

### Tools

- `cli:composio`: Slack reads and writes through the existing developer CLI

### Environment

- `COMPOSIO_ACCOUNT`: the existing account selector for the retrospective
  workspace. Presence only; never logged.

### Invariants

- Destination is channel `C0C4CUWPSSF` in workspace `TCER5DFCM`, revalidated
  from provider evidence before delivery. The channel is treated as an
  external audience.
- Slack writes are non-idempotent. A timeout is an uncertain result, not
  permission to retry. A whole batch is never replayed.
- Sends are sequential and paced at no more than one per second.
- An ACTIVE connection label does not establish send permission; the
  read-only preflight must succeed first.
- Secrets, contacts, private paths, transcripts, and sensitive client
  financial, HR, or medical details never appear in copy. Nobody is tagged
  with a group mention.

### Shape

- `self`: deduplicate against the ledger, seed ledger, and recent channel
  history; preflight access; deliver sequentially; reconcile; close out.
- `delegates`:
  - `stage-work-log-copy`: decide new task versus checkpoint, set proof
    level, sanitize copy, stage the exact JSON request
  - `deliver-slack-message`: one send with attempt marker and readback
- `prohibited`: reconnecting, changing grants, or switching connectors;
  retrying an uncertain send; posting outside the authorized channel; closing
  Linear issues; claiming client acceptance.

### Execution

```prose
let prior = session "Read the current ledger, pending and uncertain attempts, and seed ledger by reference from output/daily-work-log/state.json. Return them without modification."
  context: []

let preflight = session "Runbook §5 read-only preflight. Retrieve conversation information and paginated recent history for the destination channel, honoring has_more and next_cursor. Verify workspace and channel from provider evidence. On access error or denial return { ok: false, reason } and stop."
  context: []

if preflight is not ok:
  return {
    threads: prior.threads
    pending_delivery: prior.pending_delivery
    delivery_health: { dependency_unavailable: true, last_denial_at: preflight.at }
  }

let reconciled = session "Runbook §5 reconciliation. For each uncertain attempt in prior, search channel history and thread state for the exact staged content and attempt time. Exactly one match recovers the timestamp; ambiguous matches stay uncertain for operator review."
  context: { prior, preflight }

let staged = reviewed_candidates
  | filter:
      if item.review.status is held:
        return false
      if item.disposition is new_task or item.disposition is checkpoint:
        return true
      return false
  | map:
      call stage-work-log-copy
        candidate: item
        ledger: reconciled.ledger
        seed_ledger: prior.seed_ledger
        recent_history: preflight.history

let results = staged
  | map:
      if item.kind is duplicate or item.kind is pending:
        return item
      try:
        return call deliver-slack-message
          staged_request: item.request
          parent_ts: item.parent_ts
          attempt_record: item.attempt_record_path
      catch as err:
        if err is access_denied:
          throw err
        return { identity: item.identity, status: "uncertain", reason: err }

let closeout = session "Runbook §6 delivery half. Update the ledger with verified timestamps, preserve pending and uncertain work, persist counts that distinguish threads from messages, and report confirmed Slack links or exact failures and the next safe action. Stay quiet when there is nothing publishable."
  context: { reconciled, results }

return {
  threads: closeout.threads
  pending_delivery: closeout.pending_delivery
  delivery_health: closeout.delivery_health
}
```

### Strategies

- when neither local state nor available history can rule out a duplicate:
  retain the draft as pending and report the blocker.
- when a send succeeds but readback is throttled: save the receipt with
  deferred verification; matching `reply_count` and `latest_reply` on the
  parent is a narrower acceptable alternative.
- when a 429 arrives: honor Retry-After, otherwise defer that method for at
  least 60 seconds. Read throttling never justifies replaying a write.

### Runtime

- `persist`: project
