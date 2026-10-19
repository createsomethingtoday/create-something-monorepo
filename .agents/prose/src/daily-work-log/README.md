# Daily work log: OpenProse pilot

Started October 18, 2026. Owner: Micah Johnson. Status: pilot. On 2026-10-19,
discovery, review and delivery each ran once, by hand.

This package is the executable view of
`docs/guides/DAILY_WORK_LOG_RUNBOOK.md`. The runbook remains the operating
contract an operator reads first. If the two disagree, the runbook wins and
this package is corrected. Pin: `docs/openprose/VENDOR.md`.

## Shape

| File | Kind | Playbook role | Tier |
| --- | --- | --- | --- |
| `daily-work-log-tick.prose.md` | gateway | Signal | Ignition |
| `completed-work-discovered.prose.md` | responsibility | Play state | Database |
| `candidates-reviewed.prose.md` | responsibility | Decision gate | Judgment |
| `work-log-delivered.prose.md` | responsibility | Runbook | Automation |
| `stage-work-log-copy.prose.md` | function | Judgment | Judgment |
| `deliver-slack-message.prose.md` | function | Receipt-producing step | Automation |
| `tests/*.prose.md` | test | Acceptance checks | Judgment |

Wiring: the gateway maintains `run_request`; discovery requires it and
maintains `candidates`, `certified_cutoff`, `discovery_health`; the reviewer
requires `candidates` and maintains `reviewed_candidates`; delivery requires
only `reviewed_candidates`. A health-only change never wakes a Slack write,
and nothing reaches Slack without a review render that did not produce it.

## What stays outside OpenProse

- The launchd schedule keeps firing the existing skill. The gateway documents
  the trigger; `prose serve` is not enabled.
- `output/daily-work-log/state.json` and `run.lock` remain the authoritative
  ledger and single-writer lock. The maintained truths here are projections.
- Account selectors, channel ids, and the approved CTX source profile stay
  where the runbook keeps them.

## Running it

In a Claude Code session at the repo root, with `ctx` and `composio` on PATH:

```text
prose lint .agents/prose/src/daily-work-log/completed-work-discovered.prose.md
prose test .agents/prose/src/daily-work-log/tests
prose run .agents/prose/src/daily-work-log/daily-work-log-tick.prose.md
```

A gateway refuses direct `prose run`; use it to compile, then run the
discovery responsibility with a manual `run_request`. Run artifacts land in
`.agents/prose/runs/` and are ignored by git.

## Judging the pilot

First real run: 2026-10-19T00:40Z, manual `run_request`, discovery only.
Receipt and world-model: `.agents/prose/runs/20261019-004020-1df175/` and
`.agents/prose/state/world-model/`. Dated run directory:
`output/daily-work-log/2026-10-19T004020Z/`. Result: 2,335 events in 166
sessions, every event dispositioned, 47 candidates, cutoff advanced after a
5.5-day degraded gap. Delivery untouched (Composio 401 from 2026-10-15).

1. **Did the gateway and responsibility kinds express trigger, gate, stop, and
   recovery without ProseScript carrying all of it?** Expressed, yes. Enforced,
   no. The gateway's `### Schedule` and `### Receives` read as the Signal, the
   `### Invariants` and `Shape.prohibited` read as the stop and gate, and
   `### Strategies` read as recovery, all without Execution code. But at this
   pin nothing executes those sections: the lock stop ran only because the
   Execution block returns early, the receipt retry is the Execution's
   `retry: 2`, and the prohibitions held because the host agent honored them.
   The declarative sections are legible policy, not enforced policy.
2. **Did receipts add anything the dated run directories do not already
   give?** Yes, two things. The receipt carries the memo key
   (`contract_fingerprint`, `input_fingerprints`) and per-facet fingerprints,
   so "did the candidate set move" is a deterministic comparison: a rerun with
   the same dispositions writes `skipped` and delivery does not wake. The dated
   directory has no such object. The receipt also records which postconditions
   were checked deterministically and which were only attested by the render.
   Missing at this pin: token cost (the host does not expose it) and a signer.
3. **Who evaluated the semantic postconditions?** The render itself. Three
   Sonnet sessions reviewed message excerpts and self-attested the exclusion
   and proof-level rules; the VM session verified only the deterministic
   postconditions (every event has a disposition, pending never dropped, cutoff
   advanced only on a matching receipt). No independent reviewer read the
   dispositions. The Playbook reviewer role is not composed in yet, and the
   review ran on excerpts (last two messages plus up to five completion-signal
   messages per session), a narrowing the contract does not state.

What changed after the run: `candidates-reviewed.prose.md` now sits between
discovery and delivery, and the excerpt rule is stated in the discovery
contract's review session.

## Reviewer and delivery, 2026-10-19

The reviewer ran once (run `20261019-133009-98ecce`). Six review sessions read
the full text of the 45 candidate sessions, not excerpts. A seventh re-read 10
of the 103 sessions discovery excluded. The host checked the postconditions in
code: every candidate appears once, no proof level rose, and held items stay
pending.

| Review result | Count |
| --- | --- |
| Confirmed | 37 |
| Narrowed wording, same proof level | 4 |
| Held as pending | 5 |
| Exclusion errors in the sample | 0 |

Three held items added nothing new to their existing threads. Two were real
work that the reviewer could not map to a thread, because the review input
carried a thread reference only for checkpoints. The next contract revision
should pass recent ledger titles to the reviewer.

Delivery ran after an operator restored the Composio login. The 15 drafts
from 2026-10-15 posted first, then the 41 reviewed candidates: 89 messages,
each read back from Slack by timestamp and content, with no uncertain sends.

The answer to question 3 changes from "the render itself" to "separate review
sessions over full text, with deterministic checks by the host." That is still
a model evaluator, not a human. Send approval stayed with the operator for
every delivery.

Known limits at this pin: the runtime does not enforce the declarative
sections, receipts carry no signer or token cost, and runs start by hand.
