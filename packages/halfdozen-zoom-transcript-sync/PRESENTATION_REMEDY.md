# Restore the inline transcript

The local candidate restores one `📝 FULL TRANSCRIPT` section with timestamp headings and readable paragraphs. One `Source archive` toggle sits at the bottom. Encoded originals, bounded canonical parts and their index stay inside that toggle. Readers and agents can retrieve the transcript directly from the page body.

The October 23 indexed writer changed the reading experience. The reference page uses inline headings and paragraphs. It also contains two overlapping transcript sections; the repair preserves the reading style without copying that duplication.

## Writes and source corrections

Each cue owns two stable blocks: its timestamp and paragraph. Rich-text chunks preserve long cue text without changing that layout. The writer inserts bounded batches before the archive, reads them back and reconstructs the canonical text exactly. Requests use a product budget of 80 visible blocks and 400,000 serialized UTF-8 bytes. These budgets are not platform guarantees.

Corrections update owned slots, append growth and recoverably archive surplus slots. Original source bytes and immutable canonical versions remain in the source archive. A repeated source version sends no mutations. Pending writes reconcile by block identity and expected hashes. An uncertain write with no matching receipt fails closed rather than resending blindly.

A new additive D1 table, `transcript_inline_projection`, records owned IDs, source version, generation and pending intent. Every state mutation is fenced by the active ingestion owner. Each delivery permits at most 40 visible changes and four visible append batches, shared across prior-version reconciliation. Archive writes and provider reads have separate bounds. Queue continuations finish long projections without declaring them ready.

During initial writes and corrections the heading says `📝 FULL TRANSCRIPT (updating)`. The exact heading returns only after visible reconstruction succeeds. This warning does not make provider writes atomic. D1 readiness remains withheld until the current source is rechecked and the ingestion lease publishes the verified version. Consumers must check that version before and after retrieval or action. No Notion property, downstream trigger or resolver service is added.

## Existing records and the one-meeting repair

Normal deliveries exclude existing pages without tracked inline state, including empty pages discovered by a matching query when D1 has no page hint. A lost creation response without projection ownership fails closed until explicit replay reconciles the page; it never creates another page automatically. Nonempty untracked pages are never silently converted. Replacing an archived page requires explicit replay. The existing forward-only cutoff and both meeting-start and ledger-first-seen checks remain unchanged.

The operator has authorized replacement of one reported meeting. Capture its content, properties, relations and ledger before changes. Check for an existing replacement. Preserve the old page recoverably and create one new page through the supported ingestion path after release gates pass. Do not relax the global cutoff, replay other meetings, guess attendees, enable paused agents or force completion flags.

Inspect the actual enabled automation triggers before creation. Normal automation may start when a new page is created, before all transcript batches finish. That behavior needs evidence, not an assumption that D1 readiness controls Notion agents.

## Provider acceptance before release

The fresh inline provider test passed reconstruction, pagination, correction/restoration, lost-response reconciliation and zero-write repeats. See [LIVE_INLINE_ACCEPTANCE.md](LIVE_INLINE_ACCEPTANCE.md). The final UI check confirms the collapsed Source archive follows the last readable timestamp.

Use one fresh synthetic child page under the existing isolated test fixture. Keep it outside the production meeting database and its agents. Do not change schema, credentials, properties or automation configuration. The page must start empty because the writer refuses implicit conversion.

Use the actual inline core with local D1 and an adapter through the existing authorized Notion CLI session. Label this separately from deployed Worker credential acceptance. Use 120 synthetic timestamp cues, then a shorter correction and restoration of the original source. Include BOM, CRLF and Unicode. Verify pagination, one full section, archive last, exact source and canonical reconstruction, and preserved IDs. Intercept one committed append response and one committed update response, then reconcile retries. Repeat unchanged and require zero mutations. Capture actual Notion UI preview. Retain the disposable page and sanitized receipt; do not permanently delete it.

Only after this acceptance, independent review and exact-head CI should deployment and the separately authorized one-meeting replacement proceed. Retrieval completeness, attendee categorization and task extraction each need their own result.
