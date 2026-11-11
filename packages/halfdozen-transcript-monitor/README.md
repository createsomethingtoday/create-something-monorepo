# Half Dozen transcript monitor

Separate scheduled Worker for CRE-2407. Reads the writer's existing D1 ledger,
ingestion state, and inline projection using one SELECT (no schema initialization,
journal reservation, Notion calls, queue publishing, or source mutation).

Every 15 minutes, emits `transcript_monitor_alert` at error severity when scoped
rows have failed jobs, stale queued/discovered work, stale writing, missing
readiness, or readiness/projection version mismatch. Successful checks emit
`transcript_monitor`. Read/config failures emit `transcript_monitor_failed` and
fail the cron invocation. This is a log signal, not delivery to a human: no Slack,
email, or Cloudflare notification destination is configured by this package.
Operators must inspect Worker logs or separately authorize/configure an alert route.

GET `/status` recomputes the report, requires `Authorization: Bearer <token>` using
secret `MONITOR_API_TOKEN`, and returns `Cache-Control: no-store`. Missing/wrong
credentials fail before D1 reads. Other methods/routes cannot mutate state.
Outputs contain only identifiers, deterministic Notion page links, codes and
check metadata. No transcript contents, titles, original source/download URLs,
raw upstream errors, manifests or credentials are selected or logged.

## Scope and grace

Before deployment set `MONITOR_NOT_BEFORE` to the approved **existing indexed
pipeline rollout instant**, matching writer `INDEXED_INGESTION_NOT_BEFORE`.
The configured cutoff is the live writer rollout instant verified during CRE-2407; invalid or empty scope fails closed. Ledger rows require both
recording start and first seen at/after cutoff. Ingestion without a ledger is
included only when its meeting-date key is strictly after cutoff's UTC date;
same-day ledger-less rows cannot be safely scoped with this schema. Projection
rows without a scoped ledger/ingestion link have no timestamp and are excluded.
No lookback horizon hides old unresolved failures within this scope.

`GRACE_SECONDS` defaults to 1800 (accepted range 600–86400). Failed jobs alert
immediately; other checks wait until the most recent ledger update, verified-at,
or lease expiry is older than grace. A valid active lease suppresses transient
readiness alerts. Unknown age is explicitly reported, rather than called healthy.
Page links fall back to ingestion page IDs, then a projection matching the ingestion version only when that version matches exactly one projection. Stale unresolved work uses its pending journal reservation timestamp, falling back to the latest ledger activity/verification/lease expiry when no pending reservation exists. Retry updates cannot hide an old pending reservation; without one, the schema cannot distinguish a new refresh from repeated retries.
Successful superseded renditions do not receive readiness alerts; the selected rendition owns publication readiness. A superseded failed ledger row remains visible for operator investigation.

D1 consistency does **not** verify live Notion properties, blocks, source content,
or permission changes. Direct Notion property drift after a successful write is
outside coverage; `notion_live_verified:false` is present in every report. A
future authorized read-only Notion check would be needed for that guarantee.

## Validation and promotion

Run `pnpm --filter @create-something/halfdozen-transcript-monitor test` and `check`.
Tests cover actual SQLite SELECT joins/scope plus fixture-level policy/auth/
scheduled logs; they do not establish production behavior.

For an authorized deployment: configure cutoff and secret; regenerate `types`;
run checks and Wrangler deploy dry-run; deploy this Worker only (never the writer).
Verify unauthenticated 401, authenticated `/status`, then scheduled logs with the
live D1 binding. The D1 binding technically grants write capability; read-only
behavior is enforced by this small audited code path and regression checks,
not by a database-level read-only permission.

Rollback: disable this Worker's cron or roll back/delete this Worker only. This
monitor owns no source state to undo. Do not change the writer or its D1 schema.
