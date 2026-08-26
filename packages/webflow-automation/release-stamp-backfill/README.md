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

Only rows in exactly `📤Changes Requested` or `❌Rejected` qualify. The
"(No Notification)" variants are excluded on purpose — those releases were
deliberately silent (partnership shield included) and must stay unstamped.
Writes never touch a status field, so no notification automation can fire.

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
