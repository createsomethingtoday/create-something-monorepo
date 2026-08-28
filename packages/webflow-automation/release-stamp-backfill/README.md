# Release-Stamp Backfill (CRE-1874)

One-off backfill that stamped durable release evidence onto every
🖌️Asset Versions row (base `appMoIgXMTTTNIc3p`, table `tblHxZ2hgSFLZxsZu`)
already sitting in a notification-released review status when the
release-evidence automation (`wflnGkIDBgGGpKru9`) went live.

## What it writes

| Field | Value |
|---|---|
| `📅Feedback Released At` (`flddzMIDaAO9TSbKT`) | The run timestamp — an approximation of the original release time, sufficient because consumers gate on stamp *presence* |
| `🌐Released Feedback (Snapshot)` (`fldd1FbAW3sVFw0UU`) | Verbatim copy of `📝Review Feedback`, only when populated |

Rows in exactly `📤Changes Requested` or `❌Rejected` get both fields. The
"(No Notification)" variants are excluded on purpose — those releases were
deliberately silent (partnership shield included) and must stay unstamped.
Writes never touch a status field, so no notification automation can fire.

Rows in `🔁Response to Review` (CRE-1876) get `📅Feedback Released At`
**only**: in the normal flow that status is reached exclusively from a sent
`📤Changes Requested` email, so the round's release provably happened — but
the live feedback field may already hold an unreleased redraft
(`save_draft_feedback` writes it without a status change), so it is never
snapshotted. Rows that passed through `🔁Response to Review` and were then
moved on (`🏃🏾In Review`, `⏸️On Hold`) leave no API-visible release evidence
(Airtable exposes no status history); they stay fail-closed until their next
release flip stamps them organically via the automation.

Idempotent: the filter matches only unstamped rows, so reruns are safe and
report `Found 0` once complete. Going forward the automation stamps every
new release; this script should never find work again unless the automation
was disabled during a release.

## Usage

```bash
AIRTABLE_API_TOKEN=... node backfill.mjs --dry-run   # count only
AIRTABLE_API_TOKEN=... node backfill.mjs             # stamp
```

Paced at ~4 requests/second (Airtable's limit is 5/sec/base); the full run
takes a few minutes.

## Run receipt

Executed 2026-08-26 (operator-approved):

```
RECEIPT: stamped 3928 versions (663 with snapshots) at 2026-08-26T04:38:16.743Z.
```

Post-run dry-run verified `Found 0 unstamped released versions`. Five
exception-linked versions had been stamped by hand the day before (see
CRE-1874), bringing the total stamped population to 3,933.

Responded-rounds extension (CRE-1876), executed 2026-08-26
(operator-approved):

```
RECEIPT: stamped 19 versions (0 with snapshots, 19 responded-only, 0 skipped as stale) at 2026-08-26T05:14:23.569Z.
SWEEP: no silenced rows carry this run’s stamp — clean.
```

Post-run dry-run verified `Found 0`.
