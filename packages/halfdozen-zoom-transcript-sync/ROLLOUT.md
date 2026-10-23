# Admit only new meetings after release

Approve one UTC release instant before merge or deployment. Configure it as `INDEXED_INGESTION_NOT_BEFORE`. No production value has been chosen or added to Wrangler configuration. Missing or invalid configuration stops ingestion before discovery or queue writes. The hourly schedule stays unchanged.

## Cutoff semantics

Use the actual approved release instant in UTC, in `YYYY-MM-DDTHH:mm:ss.sssZ` format. A value without milliseconds is also accepted and normalized. Do not use a historical date to include old records. The boundary is inclusive: a timestamp equal to the cutoff is eligible.

A meeting is admitted only when both its Zoom occurrence start and its original D1 `first_seen_at` are at or after that instant. A pre-cutoff meeting remains excluded even if its transcript arrives late or its download URL changes. A row first seen before cutoff remains excluded even if later discovery supplies a post-cutoff start. Missing, malformed, or date-only timestamps fail closed. Eligibility uses the ledger, not timestamps supplied in a replay or queue envelope.

Newly queued messages carry the normalized cutoff. An old envelope without it, or with a different cutoff, is acknowledged as excluded before source downloads, claims, provider writes, or ledger updates. A matching marker is not enough to bypass ledger admission. Mismatched meeting identity or date is also excluded. The marker is a rollout receipt, not a security credential.

Discovery skips excluded files before selecting a rendition, updating their ledger, or queuing them. Its readiness invalidation applies only to admitted ledger rows. Replay returns HTTP 409 for an excluded record and does not enqueue it. Queue exclusions do not increment an old run's counters. Existing Notion pages also need a valid `created_time` at or after cutoff before any update or append. A missing creation timestamp blocks reuse.

This excludes existing OD x DM occurrences and the manual fixture by their pre-release timestamps. Tests use synthetic records with those roles. No live meeting, fixture, or transcript has been read or changed to prove the boundary.

## Keep checks for admitted records

Once admitted, a record retains the existing version checks, immutable originals, numbered parts, index receipts, and exact read-back verification. A corrected source clears readiness and creates a new version. Repeated runs reuse receipts. Unknown writes remain blocked for reconciliation. Keep the approved cutoff stable across routine redeployments so newly admitted records remain eligible.

Moving the cutoff is a separate rollout decision. Moving it forward excludes earlier admissions and their old queue envelopes. Moving it backward can admit legacy work and requires explicit approval for that expanded scope. Deployment rollback must preserve D1 originals, journals, and readiness evidence. An older Worker without this gate can resume legacy processing; do not deploy that older code as an automatic rollback while the no-rerun boundary applies.

No new Notion properties or downstream triggers are added. Existing pages retain all operator properties during verification and source corrections. New admitted pages retain the existing creation defaults; page creation and body appends can still emit existing automation events. D1 readiness is not connected to downstream extraction. The readiness design in [READINESS.md](./READINESS.md) still needs agreement before those changes. Admission controls which records this Worker may mutate. It does not certify downstream retrieval or extraction quality.

## Approval and verification

Micah approved completion through the parent task, including configuration repair and a forward-only deployment. The release will record its actual deployment-time UTC cutoff. No historical date will be used.

After approval, rerun checks for the revised PR head, merge only that reviewed version, and deploy with the approved cutoff using existing credentials. Verify the deployed version and inspect `/health` with a GET. The health handler performs no D1 initialization or provider calls. Its cutoff value is configuration evidence, not proof of successful ingestion. Do not call `/scan` or `/replay` for a live acceptance test without separate authorization.

The required CI checks passed on the original PR head `1ffcf2096358100a863bc79a67f99eabdda64960`. Those results do not validate this local revision. The revised package tests exercise cron, replay, stale queues, legacy first-seen dates, malformed timestamps, existing Notion page creation times, and admitted source updates with synthetic inputs.
