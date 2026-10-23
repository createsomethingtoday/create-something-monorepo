# Inline provider acceptance

On October 23, 2026 at 20:34 UTC, the actual inline writer passed a bounded live Notion test through the existing authorized CLI session and local Miniflare D1. One fresh synthetic child page was created under the existing isolated fixture, outside the production meeting database and its page-added trigger. It is retained for inspection.

| Run | Timestamp cues | Root blocks | Archive artifacts | Exact reconstruction | Repeat mutations |
| --- | ---: | ---: | ---: | --- | ---: |
| A | 120 | 242 | 6 | Pass | 0 |
| B correction | 18 | 38 | 9 | Pass | 0 |
| A restored | 120 | 242 | 9 | Pass | 0 |

The source includes a BOM, CRLF and Unicode. Readback reconstructed both the exact original and canonical text. Restoring A reused its content version while retaining B's archive. The page has one FULL TRANSCRIPT heading, timestamp headings and paragraphs, followed by one Source archive toggle. Paginated readback crossed the 100-block boundary.

The adapter hid one successful visible append response and one successful paragraph-update response. Readiness remained empty until reconciliation and complete verification. These are controlled response-loss cases after known successful provider writes, not genuine provider timeouts or outages. The test made one page creation, 261 owned-block mutations and 720 reads. It made no production meeting writes, schema changes, credential changes or automation changes.

The actual Notion UI showed the updating heading during a partial write, then the completed FULL TRANSCRIPT heading and inline opening timestamps and text. The final UI check showed the last readable timestamp followed by one collapsed Source archive toggle. Archive-last order also matches API readback.

This proves the inline core against live Notion through the CLI and local D1. It does not prove the deployed Worker credential, production replacement, attendee categorization or task extraction. Production direct-credential acceptance from the preceding release is separate evidence. The retired Hub is unrelated.

Private request receipts and block IDs remain in the ignored `.cache/zoom-inline-live-fixture/receipt.json`. No meeting content or credentials are included in this document.
