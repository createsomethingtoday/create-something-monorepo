# Verify the transcript before downstream work

Use the format recorded by the selected index when verifying a transcript. The writer supports the archive index and two child-page index formats. Readiness verification and downstream task extraction remain separate acceptance gates.

## What ready means

A meeting is ready only when `ready_version = version`, both are nonempty, and `page_id`, `index_block_id`, and `verified_at` are present in `transcript_ingestion`. The selected file must still match `selected_key`. Legacy ledger `synced` or `skipped` status is insufficient.

The worker clears readiness before downloading the selected file. It reads each written artifact back, checks every child in order, reconstructs the original and canonical text exactly, and verifies the ordered index. It downloads the source again before publishing readiness through an owner-checked D1 update. Partial writes, empty text, changed sources, ambiguous renditions, expired ownership, and failed verification cannot publish readiness.

Each scan also clears readiness for admitted meetings in its date window. The forward-only rollout leaves excluded legacy rows untouched. This covers selected files that disappear or become ineligible. Meetings outside the lookback retain historical verification, which is not evidence that Zoom has remained unchanged. A failed recording-list request does not establish freshness.

## Verification contract

1. Read the authoritative D1 meeting record. Require the ready contract above. Capture `version`, `selected_key`, `page_id`, and `index_block_id`.
2. Read that exact index with complete pagination. Require its Version to match the captured version. Select the supported format from its Format metadata using the layout below; do not infer it from the shared `Zoom indexed v2` artifact marker. Follow every numbered canonical part in index order, check contiguous part numbers and timestamp-block ranges, and reconstruct the canonical text. Retrieve the matching original chunks from the indicated archive location, decode standard base64 as UTF-8 while preserving a BOM, and reconstruct the original exactly. Recompute SHA-256 over the JSON array `[format, original, canonical]`, using the exact format identifier from the table, and require it to equal the captured version. A matching version label alone is not a computed checksum. Missing, duplicate, changed, or inaccessible content rejects verification; do not substitute excerpts or prior-version artifacts.
3. Read D1 again after retrieval. Require the same ready version and selected file. If they changed or readiness cleared, discard the retrieved input and retry later.
4. Store `input_transcript_version` on any downstream extraction receipt. Check it again before committing results. A correction must invalidate or supersede extraction results from an older version.

### Select the index layout and hash domain

| Format identifier / hash domain | Canonical retrieval | Original retrieval |
| --- | --- | --- |
| `indexed-transcript-v2` | Follow the archive index's ordered part links into toggles. | Follow its ordered original-chunk links in the same Source archive. |
| `indexed-transcript-pages-v1` | Follow the index's ordered child pages; its metadata also includes their direct URLs. Each part counts once. | Find the same-version original artifacts in the meeting's Source archive. The direct page index does not list originals. |
| `indexed-transcript-pages-v2` | Follow the index's ordered native child-page entries. Its compact paragraph metadata lists part titles, part total, and block total without repeating their URLs. | Find the same-version original artifacts in the meeting's Source archive. The direct page index does not list originals. |

The legacy archive Format line also contains `; original encoding: UTF-8 base64`; that suffix is metadata, not part of the hash domain. Reject any unknown format rather than guessing or trying a different hash until one matches. Identical original and canonical text intentionally produces different version hashes under different format identifiers.

For a page index, use the captured canonical meeting page to locate Source archive. Select only original artifacts whose marker contains the captured version. Require exactly one of every `original:n`, in numeric order through its declared `n/N` total, and retrieve every paragraph through terminal pagination. Preserve and verify exact original bytes and ordered canonical text; encoded originals are verification evidence, not text for analysis. Missing original fragments prevent a checksum claim even when every readable part is present. The writer separately verifies the archive and reading projection before publishing Ready.

A native agent that cannot access D1 or compute this checksum must follow its own published token/retrieval contract, open the exact index and every canonical part, and report what it actually verified. It must not claim this stronger D1/byte-hash verification. Updating these repository documents neither publishes native instructions nor qualifies native extraction.

If the workflow requires current Zoom content, request a fresh ingestion verification first. A timestamp alone cannot prove that the source has not changed. Notion can also be edited after a verified snapshot. Downstream retrieval must detect changed, missing, or duplicated parts, rather than trusting a cached readiness value.

Proposed Notion fields, pending agreement: `Transcript state` (`pending`, `ready`, `blocked`), `Transcript version`, `Transcript index`, and `Transcript verified at`. D1 remains authoritative. A later change must define property-write reconciliation and trigger deduplication before these fields drive any automation. No such properties or trigger changes are included here.

Retrieval correctness means the consumer received the complete selected version. Task-extraction correctness needs separate examples, expected tasks, and review. A retrieval pass does not prove extraction quality.

## Resume interrupted work

The durable `transcript_write_journal` reserves each page creation and artifact append once. A retry first reads the target. A matching marker with exact children is a receipt, even when the original response was lost. Completed artifacts are reused. Missing or changed children block completion; the worker preserves them for review.

A reservation with no visible receipt has an uncertain outcome. The worker does not resend it. This also applies to a process stopping between reservation and send, or a provider rejecting a reserved write. Readiness stays empty for admitted records. An operator must inspect the operation key, target page, and provider evidence before any journal repair. Do not delete reservations while a prior request could still complete. This PR provides no automatic reset endpoint. This conservative path trades unattended recovery for protection against duplicate writes.

D1 leases expire after ten minutes. Owner tokens prevent an expired worker from publishing readiness or releasing its successor's lease. Durable reservations prevent both owners from sending the same artifact. A late append from an expired worker remains tied to its own content version. It cannot make that version ready. Longer jobs stop safely and need reconciliation or a smaller input budget.

## Evidence and rollout limits

The source was verified against `origin/main` at `3396d7755`. The existing configuration targets the Half Dozen account and an hourly cron. Deployment verification is separate from successful ingestion. The actual indexed core passed one approved synthetic Notion fixture through the CLI adapter and local D1. This is separate from deployed Worker or Hub acceptance.

The manual fixture was left untouched: [11 parts, 478 timestamp blocks, 01:36–56:25](https://app.notion.com/p/e3ccf11baf124889a7453e188b2b1b09). Those counts are supplied context, not a verification performed by this PR. The synthetic tests use their own text. The roughly 6,500-character manual size is not a platform guarantee.

Before production promotion, review this contract, verify the direct and Hub transport behavior against an approved nonproduction page, measure runtime and request use, and verify downstream version checks. Do not use OD x DM as a test. A rollout needs separate authorization for deployment and any live writes.

The forward-only cutoff is proposed in [ROLLOUT.md](./ROLLOUT.md). It excludes legacy records from ingestion and readiness mutations. The approved release will record its deployment-time UTC cutoff.
