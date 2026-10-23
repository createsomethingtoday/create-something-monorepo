# Verify the transcript before downstream work

Review this contract before adding live Notion properties or changing downstream triggers. This PR adds internal D1 evidence. It does not connect that evidence to task extraction.

## What ready means

A meeting is ready only when `ready_version = version`, both are nonempty, and `page_id`, `index_block_id`, and `verified_at` are present in `transcript_ingestion`. The selected file must still match `selected_key`. Legacy ledger `synced` or `skipped` status is insufficient.

The worker clears readiness before downloading the selected file. It reads each written artifact back, checks every child in order, reconstructs the original and canonical text exactly, and verifies the ordered index. It downloads the source again before publishing readiness through an owner-checked D1 update. Partial writes, empty text, changed sources, ambiguous renditions, expired ownership, and failed verification cannot publish readiness.

Each scan also clears readiness for admitted meetings in its date window. The forward-only rollout leaves excluded legacy rows untouched. This covers selected files that disappear or become ineligible. Meetings outside the lookback retain historical verification, which is not evidence that Zoom has remained unchanged. A failed recording-list request does not establish freshness.

## Proposed downstream check

1. Read the authoritative D1 meeting record. Require the ready contract above. Capture `version`, `selected_key`, `page_id`, and `index_block_id`.
2. Read that exact index. Require its version to match the captured version. Follow every numbered part in index order. Check the expected block ranges and reconstruct the canonical text. Concatenate the indexed original chunks, decode their standard base64 as UTF-8 while preserving the BOM, and reconstruct the original exactly. Recompute SHA-256 over the JSON array `["indexed-transcript-v2", original, canonical]` and require it to equal the captured version. This detects changed text under an unchanged version label. Do not search page excerpts or consume prior-version artifacts.
3. Read D1 again after retrieval. Require the same ready version and selected file. If they changed or readiness cleared, discard the retrieved input and retry later.
4. Store `input_transcript_version` on any downstream extraction receipt. Check it again before committing results. A correction must invalidate or supersede extraction results from an older version.

If the workflow requires current Zoom content, request a fresh ingestion verification first. A timestamp alone cannot prove that the source has not changed. Notion can also be edited after a verified snapshot. Downstream retrieval must detect changed, missing, or duplicated parts, rather than trusting a cached readiness value.

Proposed Notion fields, pending agreement: `Transcript state` (`pending`, `ready`, `blocked`), `Transcript version`, `Transcript index`, and `Transcript verified at`. D1 remains authoritative. A later change must define property-write reconciliation and trigger deduplication before these fields drive any automation. No such properties or trigger changes are included here.

Retrieval correctness means the consumer received the complete selected version. Task-extraction correctness needs separate examples, expected tasks, and review. A retrieval pass does not prove extraction quality.

## Resume interrupted work

The durable `transcript_write_journal` reserves each page creation and artifact append once. A retry first reads the target. A matching marker with exact children is a receipt, even when the original response was lost. Completed artifacts are reused. Missing or changed children block completion; the worker preserves them for review.

A reservation with no visible receipt has an uncertain outcome. The worker does not resend it. This also applies to a process stopping between reservation and send, or a provider rejecting a reserved write. Readiness stays empty for admitted records. An operator must inspect the operation key, target page, and provider evidence before any journal repair. Do not delete reservations while a prior request could still complete. This PR provides no automatic reset endpoint. This conservative path trades unattended recovery for protection against duplicate writes.

D1 leases expire after ten minutes. Owner tokens prevent an expired worker from publishing readiness or releasing its successor's lease. Durable reservations prevent both owners from sending the same artifact. A late append from an expired worker remains tied to its own content version. It cannot make that version ready. Longer jobs stop safely and need reconciliation or a smaller input budget.

## Evidence and rollout limits

The source was verified against `origin/main` at `3396d7755`. The existing configuration targets the Half Dozen account and an hourly cron. Deployment verification is separate from successful ingestion. This change has not been deployed or run against live Zoom or Notion records.

The manual fixture was left untouched: [11 parts, 478 timestamp blocks, 01:36–56:25](https://app.notion.com/p/e3ccf11baf124889a7453e188b2b1b09). Those counts are supplied context, not a verification performed by this PR. The synthetic tests use their own text. The roughly 6,500-character manual size is not a platform guarantee.

Before production promotion, review this contract, verify the direct and Hub transport behavior against an approved nonproduction page, measure runtime and request use, and verify downstream version checks. Do not use OD x DM as a test. A rollout needs separate authorization for deployment and any live writes.

The forward-only cutoff is proposed in [ROLLOUT.md](./ROLLOUT.md). It excludes legacy records from ingestion and readiness mutations. No production cutoff has been chosen.
