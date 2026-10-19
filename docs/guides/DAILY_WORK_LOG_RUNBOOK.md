# Daily Slack work log playbook and runbook

Documented October 13, 2026. Owner: Micah Johnson. Audience: operators and the daily work-log agent.

## Purpose and authority

Make completed work visible in CREATE SOMETHING Slack `#log`, with one parent per distinct task and subsequent checkpoints in its thread. Include product, client, artifact, operational, and communication work across workspaces: Webflow, CREATE SOMETHING, Half Dozen, Grantbot/GiGi, presentations, FigJams, debugging, guidelines, and walkthroughs.

The established routine is daily at **17:00 America/Chicago**, including weekends and daylight saving time. This is the operating contract; verify the saved automation when auditing its actual schedule. This document does not create or modify an automation.

The authorized destination is channel `C0C4CUWPSSF`, workspace `TCER5DFCM`. Revalidate both before delivery. Treat the channel as an external audience when preparing copy, even when Slack identifies it as private. Routine task summaries do not authorize raw history disclosure or posting elsewhere.

The installed `daily-work-log` skill and its `references/delivery.md` supply the execution procedure. Read their current versions before running. This repo document makes the operating contract discoverable; reconcile any drift against operator authorization and current CLI documentation.

## Three-tier ownership

| Tier | Responsibility |
| --- | --- |
| Database | CTX evidence, task ledger, candidate dispositions, staged copy, send receipts, readbacks, certified discovery cutoff |
| Automation | Bounded refresh, terminal event enumeration, duplicate checks, sequential Slack delivery, scheduled execution |
| Judgment | Decide distinct task versus checkpoint, establish proof level, sanitize audience-facing copy, escalate uncertain delivery or coverage |

Debug data first, execution second, policy third. Linear remains authoritative for tracked work; the log communicates evidence and does not close issues or establish client acceptance.

## Durable artifacts

### Using another device

Pull the committed runbook into that device's checkout. Resolve its installed `daily-work-log` and `ctx` skills locally; macOS home paths and plugin cache versions are device-specific. The schedule, destination IDs, proof rules and delivery protocol in this document apply across devices.

Before enabling execution there, securely transfer the authoritative ledger, seed ledger, pending attempts and receipts, and verify the existing authorized Composio connection and approved CTX source inventory. These local operational artifacts are not supplied by a Git pull. Keep one execution device active: a local `run.lock` cannot exclude a simultaneous run on another machine. Pause the old device's automation before transferring ownership, verify no run remains active, then enable the new device. Never begin with an empty ledger against the existing Slack channel.

Use `output/daily-work-log/` in this repository. Keep full provenance and private receipts local.

An OpenProse executable view of this runbook lives at `.agents/prose/src/daily-work-log/` (pin: `docs/openprose/VENDOR.md`). This document stays the operating contract; the contract files are derived from it and corrected when they drift.

| Artifact | Contract |
| --- | --- |
| `state.json` | Authoritative current task ledger, pending delivery, discovery receipts and health; never reset it |
| `run.lock` | Single-writer ownership; inspect owner/PID before recovery |
| `output/work-retrospective-2026-09-25/task-threads.json` | Original 82-thread seed for additional duplicate detection; never replace the current ledger with it |
| Dated run directory | Run start, status/freshness receipts, event pages/completion, dispositions, exact staged copy, delivery attempts, responses/readbacks, closeout |

Preserve unknown fields when updating state. Persist changes atomically. Existing dated scripts are historical run artifacts, not a general runner: do not replay them against live Slack or reuse their old candidate lists.

## Run procedure

### 1. Establish ownership and dependencies

1. Capture one UTC run-start timestamp and use it throughout discovery.
2. Acquire the existing lock using an atomic exclusive operation before writing state or sending. If a live run owns it, stop quietly. A PID alone is insufficient proof of ownership; inspect process identity and run evidence. Do not delete an ambiguous lock. Release only the lock owned by this run.
3. Read the full current ledger, pending/uncertain attempts, seed ledger, and last certified cutoff. Resume reconciliation before creating more writes.
4. Resolve installed `ctx` and the existing developer `composio` CLI. Missing delivery dependencies must be recorded even if there are zero pending sends. Do not install replacements or switch accounts to bypass a failure.

Read-only diagnostic commands:

```sh
ctx status --format json
ctx sources
ctx docs show event-queries
ctx list events --help
command -v composio
```

### 2. Obtain a bounded freshness receipt

Save stdout and stderr in the dated run directory. Run:

```sh
ctx index wait --lexical --timeout-seconds 45 --format json
ctx search "daily completed work" --backend lexical --refresh wait --limit 1 --format json
```

Bound each refresh attempt to 45 seconds, with at most three attempts. Use the installed runtime's timeout mechanism; on timeout stop only the foreground waiter, retaining daemon/history. Lexical readiness establishes availability, not source freshness. A successful process exit does not establish successful refresh.

Inspect the structured outcome, generation ID, source-failure total and record diagnostics. Pending, paused, missing receipts, source failures, request-metadata conflicts, or mismatched generations mean degraded discovery. `completed_with_rejections` may certify the approved selected roots when there are zero source failures and terminal enumeration matches; retain record rejections as disclosed coverage diagnostics. `completed_with_rejections_and_source_failures` cannot certify discovery.

The October 8 approved profile uses `[sources] automatic = false`: twelve named roots retain fourteen legitimate history locations; the OpenHands and CodeBuddy skills-only roots are intentionally unselected. Verify the current inventory. New roots need explicit registration after provider/layout validation. Do not re-enable automatic discovery, follow protected symlinks, delete installed skill links, clear cursors, or suppress failing sources to obtain a green result.

### 3. Enumerate and review

Start 24 hours before `last_successful_discovery_start`; on a first run start 48 hours before run start. End at run start. CTX requires both `--since` and `--until`; the interval is half-open. Use installed help to construct the invocation with `--scope all`, assistant message selection, and `--content full`. Do not narrow discovery to the current repo or one provider.

Follow opaque continuation cursors until terminal completion. JSONL must contain its final `event_range_completion`; EOF alone, a capped result, or ranked search hits do not prove completeness. Keep the same normalized selection and immutable generation across pages. If generation changes, obtain a matching receipt and enumerate again, or retain the prior certified cutoff.

Review actual completion evidence. Every enumerated event needs a disposition, including previously reviewed overlap. Exclude this logging agent's own reports, synthetic tests, approval-review decisions, and repeated supporting subagent evidence. Keep unresolved candidates pending instead of claiming completion. Retain event/session/provider provenance locally.

Preserve these proof levels: authored, tested, reviewed, merged, deployed, live-verified, delivered, and accepted. Prepared presentations are not delivered presentations. Historical production statements are dated evidence, not current live audits. Cross-check consequential claims against accessible artifacts/providers or state the narrower proof level.

### 4. Deduplicate and stage exact copy

Compare issue/artifact identity, source IDs, and normalized outcome against the entire current ledger, seed ledger, and paginated recent channel history. Different dates or wording do not make a new task. A new checkpoint belongs in the existing thread. If neither local state nor available history can rule out duplicates, retain drafts and report the blocker.

Parent copy contains a concise task title, workstream, outcome, checkpoint date and accurate status. Detail replies explain delivery, practical value, useful artifact/issue links and compact dated evidence. Keep secrets, contacts, private paths, transcripts and sensitive client financial/HR/medical details out. Label drafts and prepared artifacts. Do not tag everyone.

Stage exact JSON requests before any write. Use JSON files for multiline copy rather than interpolating it into shell commands.

### 5. Verify Slack access and deliver

Use the existing account selector `createsomething-retrospective`, user `acct_mj`. An ACTIVE connection label does not establish working authentication or send permission. Read-only preflight:

```sh
composio dev playground-execute SLACK_RETRIEVE_CONVERSATION_INFORMATION --user-id acct_mj --account createsomething-retrospective -d '{"channel":"C0C4CUWPSSF"}'
composio dev playground-execute SLACK_FETCH_CONVERSATION_HISTORY --user-id acct_mj --account createsomething-retrospective -d '{"channel":"C0C4CUWPSSF","limit":100}'
```

Verify workspace and channel from provider evidence. Honor `has_more` and `response_metadata.next_cursor`; the actual page may be smaller than requested. Inspect tool schemas with `--get-schema` before constructing new arguments.

For each message, sequentially:

1. Persist an attempt marker containing task identity, exact staged request, destination, attempt time and known parent timestamp.
2. Send using `SLACK_SEND_MESSAGE`: `channel`, `markdown_text`, `unfurl_links:false`, `unfurl_media:false`, `reply_broadcast:false`. Details and updates include the confirmed parent's `thread_ts`.
3. Require `successful:true`, `data.ok:true`, and `data.ts`. Save the full response and timestamp immediately, before the next send.
4. Read back via `SLACK_FETCH_MESSAGE_THREAD_FROM_A_CONVERSATION`, using channel and parent `ts`. Match exact timestamp and content. Record the verification method; successful detail receipts plus matching channel `reply_count`/`latest_reply` are a narrower alternative when individual reads are throttled.
5. Update the ledger with verified timestamps and preserve remaining pending work. Pace channel sends at no more than one per second.

Slack writes are non-idempotent. A timeout is an uncertain result, not permission to retry. Reconcile exact staged content and attempt time in history/thread state. Exactly one match recovers the timestamp. Ambiguous matches need operator review. A confirmed parent missing details receives only its missing reply. Never replay a whole batch.

For 429, honor Retry-After; otherwise defer that method at least 60 seconds. Persist deferred verification if needed. Read throttling does not justify replaying a successful write. Stop on access errors or send denial; preserve candidates. Do not reconnect, change grants, or switch connectors unattended.

### 6. Close out discovery and delivery separately

Advance the certified discovery cutoff to run start only when a successful selected-source freshness receipt matches terminal enumeration and every candidate/event disposition is persisted. Pending or uncertain delivery survives this advancement independently. Degraded discovery may still yield useful reviewed evidence for delivery, but must retain the prior certified cutoff.

Persist counts for new parents, updates, verified messages, skipped events, pending candidates/sends and uncertain attempts, plus source coverage, generations and diagnostics. Counts must distinguish task threads from individual messages. Record the run outcome and release only this run's lock.

Report useful deliveries with confirmed Slack links, or exact failures and next safe action. Stay quiet for certified fresh discovery with no publishable work. Do not silently expand a daily run into an all-time backfill.

## Recovery and escalation

| Condition | Required action |
| --- | --- |
| Live or ambiguous lock | Leave ownership intact; stop or inspect owner evidence |
| Degraded freshness | Review the published generation with disclosed gaps; retain certified cutoff |
| Source routing/symlink failure | Preserve source policy/history; obtain approval for source-selection changes or pursue parser correction |
| Incomplete stream/cursor failure | Preserve pages and error; resume supported cursor or re-enumerate with a new matching receipt |
| Missing CLI/account/access | Record `delivery_dependency_unavailable`; retain drafts; do not bypass denial |
| Send timeout/uncertain response | Reconcile before any retry; unresolved ambiguity remains pending |
| Successful send, unavailable readback | Save receipt and deferred verification; do not resend |
| Disk pressure/daemon problem | Save typed errors; do not delete history/indexes or restart services unattended |

Maintain `discovery_health`: consecutive degraded runs, first degraded cutoff, latest generation, latest new-event count, last alert time and last certified cutoff. Reset the degradation counter only after matching successful freshness and terminal enumeration. Alert in the owning chat after two degraded runs or a certified cutoff older than 24 hours, including missed interval and safe recovery action. Suppress identical alerts for at most 24 hours; notify immediately for a new failure or materially worse gap. Zero pending sends does not establish a healthy delivery dependency.

After recovery, enumerate all unreviewed events from the retained cutoff with the 24-hour overlap, deduplicate and backfill meaningful results. Preserve pending and uncertain attempts throughout.

## Completion evidence and acceptance checks

A run is reviewable when its directory establishes:

- Source receipt and terminal completion generation agree, or degradation and retained cutoff are explicit.
- Every enumerated event has a disposition; unresolved candidates remain recoverable.
- Each distinct task has one parent; checkpoints use the recorded parent.
- Every attempted write has a durable attempt record and a successful receipt or explicit uncertainty.
- Delivery claims identify exact readback evidence and pending verification.
- Ledger updates preserve prior tasks, pending work and unknown fields.
- Closeout states discovery coverage, delivery counts, remaining gaps and lock disposition.

For tracked repairs, record evidence in Linear with `Worktree disposition:`. Do not mark the repair done solely because the runbook exists.

## Grounding receipts

These dated artifacts document historical outcomes, not current operational health:

- `output/daily-work-log/2026-10-08-recovery-backfill/README.md`: approved source profile, freshness diagnostics and recovery evidence; tracked repair CRE-2252.
- `output/daily-work-log/2026-10-09T220341Z/README.md`: eight new task threads and four updates, 798 event dispositions, matching zero-source-failure receipt and terminal enumeration.

Local output artifacts are retained operational evidence and may not exist in a fresh clone. Restore them from the operator's retained store before executing against an existing channel; absence is not permission to initialize an empty ledger.
