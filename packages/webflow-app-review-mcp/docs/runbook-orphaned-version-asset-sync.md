# Runbook: Sync Orphaned Asset Versions to Their Asset

When a submission lands in **🖌️Asset Versions** with an App ID but **no linked Asset**, the
Version Creation Trigger's follow-up validation flips it to `🚨Error: Field Missing (Email, Type, etc.)`
— because Email, Type, and Creator are all lookups through the Asset link. The record then sits
invisible to the review queue until someone links the Asset and resets the status.

This runbook covers finding those records, picking the correct Asset, and restoring them to
`🆕Ready for Review`. Worked example: the Optibase submission of 2026‑07‑14
(App ID `65845e1ac4ba1acfb6861cb4`, TMPUID `optibase`).

## Where things live

| Thing | ID |
|---|---|
| Base | `appMoIgXMTTTNIc3p` (👛Marketplace Assets) |
| 🖌️Asset Versions table | `tblHxZ2hgSFLZxsZu` |
| 🍑Assets table | `tblRwzpWoLgE9MrUm` |
| Version → APP ID (text, from submission) | `fldypmytG4DpK8a8h` |
| Version → 🍑Asset (linked record) | `fldemWilqCQcOCh5s` |
| Version → Review Status (single select) | `flde8Huk5NRIdm2wZ` |
| Version → Review Type | `fldjYFJMGTerFYlol` |
| Asset → App Name | `fldUzJBor3Gnkykjc` |
| Asset → App ID (lookup via All Apps sync) | `fldxFrPOO2xtLk93e` |
| Asset → App IDs rollup **(do not trust — see gotchas)** | `fldfoalkTejrE86Xp` |

Target status option: `🆕Ready for Review` (`selDUZfEjMbrpcJjk`).

## Procedure

### 1. Find orphaned version(s)

Query Asset Versions with a structured filter (not free-text search — it over-matches):

- `fldypmytG4DpK8a8h` (APP ID) `=` the app id, **and**
- `fldemWilqCQcOCh5s` (Asset) `isEmpty`

Via Airtable MCP `list_records_for_table`, or in the UI: filter the All Apps view by
APP ID + empty Asset. Expect one record per stuck submission.

### 2. Resolve which Asset to link

**Do not** match on the Assets-table rollup `fldfoalkTejrE86Xp` — it rolls up APP IDs *from the
versions already linked to that asset*, so it's circular and can point at the wrong app when a
creator has multiple apps with historical mis-links (Optibase's app id appears on both the
**Optibase** and **Base.** assets for exactly this reason).

Instead, list **all** versions carrying the same APP ID (drop the isEmpty condition) and look at
where the non-orphaned ones link:

- Majority + most-recent `✅Approved` version → that's your asset.
- Cross-check the orphan's TMPUID and Version Notes (activity feed / hidden fields) — the app
  name usually appears in both.
- If history is split with no clear majority-and-recency winner, stop and confirm with the
  creator's submission before linking.

Optibase example: 15 of 19 historical versions (incl. the 2025‑10‑27 ✅Approved) linked to
`rec3zbVNdmnZdlY8f` (Optibase); the 4 linked to Base. were all ☠️Archived. TMPUID `optibase`
and notes referencing "Optibase installation snippet" sealed it.

### 3. Apply the fix in ONE write

Update the version record with **both fields in a single update** so the validation automation
never observes a linked-but-still-errored intermediate state:

```json
{
  "fldemWilqCQcOCh5s": ["<asset record id>"],
  "flde8Huk5NRIdm2wZ": "🆕Ready for Review"
}
```

(Airtable MCP `update_records_for_table` on `tblHxZ2hgSFLZxsZu`. The App Review MCP's
`app_review_update_version_review` can set the status but cannot write the Asset link, so the
link must go through Airtable either way.)

### 4. Verify

Wait ~20s for automations, then re-read the record and confirm:

- Asset link = expected asset, Review Status still `🆕Ready for Review` (not re-flipped to
  `🚨Error…` — if it re-flipped, another required lookup is still broken; check the Asset's
  Creator/Email chain).
- The record now appears in the review queue (`app_review_list_queue` or the queue view).

## Scale finding (2026-08-11) and the recency guard

The first base-wide sweep found the orphan pattern is **not rare**: 275 orphaned versions total —
265 in `🚨Error: Field Missing` dating back to July 2023, across 26 app IDs. Two consequences,
now baked into the automated routine (`trig_01LMSYPSKVT4wy2urMRZ3aBF`, twice daily 13:00/21:00 UTC):

- **14-day recency guard.** Only orphans created in the last 14 days are auto-fixed. Flipping
  years-old submissions into `🆕Ready for Review` floods the queue and wrecks SLA metrics —
  stale orphans are report-only.
- **Hard cap of 10 fixes per run**, newest first, as a blast-radius limiter.

The 2026-08-11 sweep (pre-guard) fixed 23 records across 6 apps (Figma to Webflow ×15,
Smart Shadows ×2, Wes ×2, Quizell ×2, Finsweet Extension ×1, HTML Viewer ×1). The remaining
**~246 legacy orphans across ~20 app IDs could not be auto-resolved at all**: those apps have
*zero* versions ever linked to an Asset (largest: app `681e46a6006cbb381e5ecb59` with 78 such
versions). That is a data gap needing human investigation — either the Asset was never created
or the App ID never matched; the sibling-history rule has nothing to work with.

## Gotchas

- **APP ID on the version ≠ the Asset's App ID lookup.** The version field is whatever the
  submission pipeline stamped; the Asset's `fldxFrPOO2xtLk93e` looks up the Mongo App ID from the
  All Apps synced table. They can legitimately differ (App ID vs Client ID, re-registered apps).
  Match on version history, not on that lookup.
- **Free-text `search_records` for a 24-hex id returns every version of the app** (the id is on
  all of them), and results can silently truncate at your limit. Use the structured filter.
- **Status enum is emoji-prefixed**: the option is `🆕Ready for Review` — "Ready to Review" or
  a bare "Ready for Review" string will fail or typecast to nothing.
- `app_review_get_asset` on the App Review MCP can time out on large assets; Airtable directly
  is the reliable read path (same pattern as the queue-list timeout).
