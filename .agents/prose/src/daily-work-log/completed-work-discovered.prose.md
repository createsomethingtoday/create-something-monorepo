---
name: completed-work-discovered
kind: responsibility
version: 0.1.0
id: 01M58ERJWCETMBYD9V5VSC0P0J
---

# Completed Work Discovered

> Database tier of the daily work log. Keeps the reviewed set of completed-work
> candidates, the certified discovery cutoff, and discovery health current.
> Derived from `docs/guides/DAILY_WORK_LOG_RUNBOOK.md` §1 to §3 and §"Recovery
> and escalation". The runbook is the operating contract; this file is the
> executable view of it.

### Goal

Every completed task across the approved CTX sources is enumerated, reviewed,
and given a disposition before anything is delivered, and the certified cutoff
advances only on proven coverage.

### Requires

- `run_request`: the current run's start timestamp, mode, and overlap window.
  *(Maintained by the `daily-work-log-tick` gateway.)*

### Maintains

The discovery world-model. The authoritative ledger stays in
`output/daily-work-log/state.json`; this truth is the reviewed projection the
delivery responsibility subscribes to.

**Type**:

- `candidates`: list of `{ identity, workstream, outcome, proof_level,
  disposition, checkpoint_date, provenance }` where `proof_level` is one of
  `authored`, `tested`, `reviewed`, `merged`, `deployed`, `live-verified`,
  `delivered`, `accepted` and `disposition` is one of `new_task`,
  `checkpoint`, `excluded`, `pending`.
- `certified_cutoff`: the last `last_successful_discovery_start` that a
  matching freshness receipt and terminal enumeration proved.
- `discovery_health`: `{ consecutive_degraded, first_degraded_cutoff,
  latest_generation, latest_new_event_count, last_alert_at,
  last_certified_cutoff, dependency_unavailable }`.

**Canonicalization spec**: candidate identity, disposition, and proof level are
material. Run timestamps, generation ids, page counts, and raw event payloads
are immaterial. Candidates are ordered by identity before hashing.

#### candidates

The reviewed candidate set. Material: the set of identities and each one's
`disposition` and `proof_level`. A re-run over the same interval with the same
dispositions leaves this facet unmoved, so delivery does not wake.

#### certified_cutoff

The certified discovery cutoff. Material: the cutoff value. It moves only when
§6 of the runbook allows it to advance.

#### discovery_health

Degradation state. Material: `consecutive_degraded`,
`last_certified_cutoff`, and `dependency_unavailable`. `last_alert_at` is
immaterial.

**Postconditions**:

- Every enumerated event has a disposition, including previously reviewed
  overlap. Unresolved candidates are `pending`, never dropped.
- `certified_cutoff` advances to `run_started_at` only when a successful
  selected-source freshness receipt matches terminal enumeration and every
  disposition is persisted. Otherwise the prior cutoff is retained.
- This logging agent's own reports, synthetic tests, approval-review decisions,
  and repeated supporting subagent evidence are `excluded`.
- Prepared presentations carry `proof_level: authored`, never `delivered`.

### Continuity

- **input-driven**: a new `daily-work-log-tick` receipt whose `run_request`
  fingerprint moved.

### Tools

- `cli:ctx`: CTX history index and event enumeration

### Invariants

- The existing lock is acquired atomically before any state write. A live or
  ambiguous lock stops the run quietly. A PID alone is not proof of ownership.
- The ledger is never reset, replaced with the seed ledger, or initialized
  empty against the existing channel.
- Automatic source discovery stays off. Protected symlinks are not followed,
  installed skill links are not deleted, cursors are not cleared, and failing
  sources are not suppressed to obtain a green result.
- Each refresh attempt is bounded to 45 seconds with at most three attempts.
  A process exit does not establish a successful refresh.
- Enumeration is complete only when the JSONL contains its final
  `event_range_completion`. EOF, a capped result, or ranked search hits are
  not completeness.
- Secrets, contacts, private paths, and transcripts stay in the private
  workspace and never enter the published truth.

### Shape

- `self`: acquire the lock, obtain a bounded freshness receipt, enumerate the
  interval, review completion evidence, assign dispositions, maintain health.
- `delegates`: none
- `prohibited`: sending to Slack; installing replacement tools; switching
  accounts; re-enabling automatic discovery; narrowing discovery to one repo
  or provider; expanding a daily run into an all-time backfill.

### Execution

```prose
let prior = session "Read the current ledger, pending and uncertain attempts, seed ledger, and last certified cutoff by reference from output/daily-work-log/state.json. Resume any pending reconciliation before new writes. Preserve unknown fields."
  context: []

let lock = session "Runbook §1. Acquire the existing run.lock with an atomic exclusive operation. Inspect owner process identity and run evidence. If a live or ambiguous lock exists, return { held: false, reason }. Never delete an ambiguous lock."
  context: run_request

if lock is not held by this run:
  return {
    candidates: prior.candidates
    certified_cutoff: prior.certified_cutoff
    discovery_health: prior.discovery_health
  }

let deps = session "Runbook §1 step 4. Resolve installed ctx and the developer composio CLI with read-only diagnostic commands. Record any missing dependency as dependency_unavailable; do not install replacements."
  context: []

let receipt = session "Runbook §2. Run ctx index wait and one lexical search with --refresh wait, each bounded to 45 seconds. Save stdout and stderr in the dated run directory. Return the structured outcome, generation id, and source-failure total. completed_with_rejections certifies only with zero source failures."
  context: run_request
  retry: 2
  backoff: none

let events = session "Runbook §3. Enumerate from overlap_hours before the certified cutoff until run_started_at with --scope all, assistant messages, --content full. Follow continuation cursors until the final event_range_completion. If the generation changes mid-stream, stop and report; do not mix generations."
  context: { run_request, receipt, prior }

let reviewed = session "Runbook §3. Give every enumerated event a disposition. Exclude this agent's own reports, synthetic tests, approval-review decisions, and repeated subagent evidence. Preserve proof levels; cross-check consequential claims against accessible artifacts or state the narrower level. Keep unresolved items pending. Review per session: read the last two assistant messages and up to five completion-signal messages; when those cannot support a disposition, read the session in full or keep it pending. Session batches may render in parallel; a disposition is per session and inherited by its events."
  context: { events, prior }

let closeout = session "Runbook §6 discovery half. Advance the certified cutoff only when the receipt and terminal enumeration match and every disposition is persisted. Update discovery_health. Alert in the owning chat after two degraded runs or a cutoff older than 24h, suppressing identical alerts for 24h. Release only this run's lock."
  context: { run_request, receipt, events, reviewed, deps, prior }

return {
  candidates: reviewed.candidates
  certified_cutoff: closeout.certified_cutoff
  discovery_health: closeout.discovery_health
}
```

### Strategies

- when the freshness receipt is degraded: review the published generation
  with disclosed gaps and retain the prior certified cutoff.
- when a source routing or symlink failure appears: preserve source policy and
  history; obtain approval for source-selection changes.
- when the stream or cursor fails: preserve pages and the error; resume a
  supported cursor or re-enumerate with a new matching receipt.
- when disk pressure or a daemon problem appears: save typed errors; do not
  delete history or indexes or restart services unattended.

### Runtime

- `persist`: project
