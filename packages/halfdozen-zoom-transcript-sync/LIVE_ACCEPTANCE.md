# Synthetic Notion acceptance

The approved single-page test passed with `indexed-transcript-v2`. It used the actual `planTranscript`, `writeIndexedTranscript`, and `IngestionLease` core through an adapter for the existing Notion CLI session. The journal was local Miniflare D1. No Worker was deployed.

[Retained synthetic page](https://app.notion.com/p/402019187ac5818ba035fcb4d41bbc0d) in `Goldin Coordination — SYNTHETIC TESTS ONLY`. Exactly one page was created. Its `Synthetic` flag is true. No existing record, database schema, credential, schedule, or downstream trigger changed. No Zoom or real transcript was read.

## Results

| Check | Result |
| --- | --- |
| Exact reconstruction | Both synthetic source versions passed original-byte and canonical-text reconstruction and shared version-hash checks. Each has 24 timestamp blocks, three encoded-original chunks, two readable numbered parts, and one ordered index with five links. |
| Interrupted write | The adapter hid one successful live append response. Readiness stayed empty. Retry found the committed artifact and completed without duplicating it. This was a controlled response-loss simulation, not a genuine provider outage. |
| Repeated run | Zero new append requests for an unchanged complete source. |
| Source correction | A changed synthetic source cleared readiness, produced a new version, and preserved prior artifacts. |
| Final counts | 13 top-level toggles and 36 paragraph children: two complete v2 versions plus one preserved partial v1 original toggle. |

The first attempt found a real provider difference: Notion removed a leading BOM and converted CRLF to LF in paragraph text. The v1 core rejected readback and withheld readiness. It wrote no index. The local v2 correction stores original UTF-8 bytes as standard base64; canonical parts remain readable. Its format-specific hash and markers prevent reuse of v1 receipts. The failed artifact remains on the same fixture as evidence. No second page was created.

All 49 Node tests, 12 local workerd/D1 scenarios, TypeScript, and independent Sol 6.1 review passed after the correction. The independent tests include Notion-style normalization, Unicode bytes, response-loss recovery, and separation from v1 artifacts.

## Limits and disposition

This establishes live Notion block acceptance and readback for this synthetic size through the CLI adapter. It does not validate the Hub path, deployed Worker bindings, full meeting-page creation, production D1, queue redelivery timing, large provider limits, or task-extraction quality. The roughly 9,000-character originals are test sizes, not a platform guarantee.

The existing Danny Hub credential authenticates, but its operator service rejects the configured Composio project API key with HTTP 401 `APIKey_InvalidAPIKey`. That failure is separate from the existing Notion CLI session. No failed access was bypassed and no credential configuration changed. See [diagnosis](./COMPOSIO_AUTH_DIAGNOSIS.md).

A final read-only audit independently decoded and rehashed both v2 versions after the correction; both still matched. Two preliminary audit invocations waited on open CLI stdin and timed out without a response. Closing stdin, as the successful adapter already does, resolved the audit harness issue. No mutation was retried.

The fixture is retained, not archived or deleted. [Sanitized acceptance receipt](./live-notion-acceptance.json) records versions, counts, request IDs, and phases. [Normalization diagnosis](./live-notion-readback-diagnosis.json) records the initial failure. The revised implementation is being published to the existing draft PR. Production cutoff approval, revised-head CI, rollout, and readiness-design agreement remain pending. No completion message was sent to Danny.
