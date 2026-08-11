# Exception Expiry Proposal

Status: proposal only — no Airtable schema, record, interface, or automation
changes are authorized by this document.

## Objective

Make temporary app-review exceptions expire visibly and block future approval
until a reviewer renews, replaces, or closes the exception. Preserve permanent
exceptions and the existing one-row-per-guideline-item model.

## Observed before state

Read back through Airtable on 2026-08-11:

- Base: Marketplace Assets (`appMoIgXMTTTNIc3p`)
- Table: `⚖️Exceptions` (`tblnbaaIbIulWl0b7`)
- Current records: 17
- Existing decision fields: `⚖️Status`, `⚖️Decision By`,
  `📅Decision Datetime`, `⚖️Decision Notes`
- Existing scope fields: `Item`, `⚖️Type`, `🖌️Asset Version`, `👛Asset`
- Existing approval-gate helpers: `Undecided?`, `Denied?`, `Approved?`
- Missing: validity mode, expiry date, computed effective state, renewal notes,
  and an idempotent expiry-alert receipt

## Non-goals

- Do not encode expiry in Governance Findings or `Next Action` prose.
- Do not change historical decision owner/date.
- Do not auto-renew or silently convert permanent exceptions.
- Do not delete or bulk-edit existing exception records without a reviewed
  migration set.

## Proposed additive fields

Field IDs must be captured from Airtable after creation; none are guessed here.

| Field | Type | Ownership | Purpose |
|---|---|---|---|
| `⚖️Validity` | Single select: `Permanent`, `Time-boxed` | Reviewer/MCP writable | Makes a blank expiry unambiguous |
| `📅Expires At` | Date-time, America/Chicago | Reviewer/MCP writable | Required for an approved time-boxed exception |
| `⚖️Effective Status` | Formula | Airtable read-only | Returns `⚠️Expired` when a time-boxed approved exception is past `📅Expires At`; otherwise mirrors `⚖️Status` |
| `⚖️Renewal Notes` | Rich text | Reviewer/MCP writable | Evidence and scope for renewal, replacement, or refusal |
| `⚙️Expiry Alert Stage` | Single select: `30d`, `7d`, `1d`, `expired` | Automation-managed | Idempotency receipt for the latest alert sent |

Proposed `⚖️Effective Status` behavior:

```text
IF(
  AND(
    {⚖️Status} = "✅Approved",
    {⚖️Validity} = "Time-boxed",
    {📅Expires At},
    NOW() >= {📅Expires At}
  ),
  "⚠️Expired",
  {⚖️Status}
)
```

The exact Airtable formula must be created and read back through the official
schema surface before dependent changes are applied.

## Gate behavior

After every existing row has an explicit validity classification:

1. Change `Undecided?` so `⚠️Expired` counts as undecided.
2. Change `Approved?` so only an effectively approved, non-expired row counts
   as approved.
3. Preserve `Denied?` unchanged.
4. Keep the existing asset-level undecided rollup as the approval blocker, so
   an expired exception on any prior version stops a new approval until review.

This ordering prevents the gate from treating legacy blank values as expired.

## Automation proposal

Create one daily scheduled automation after the schema and migration readback:

1. Find time-boxed approved exceptions approaching expiry at 30, 7, and 1 day,
   plus newly expired records.
2. Send the existing review-team Slack destination an item-scoped message with
   app, version, item, decision owner/date, expiry, and Airtable record link.
3. Write `⚙️Expiry Alert Stage` only after successful delivery.
4. Never renew, approve, deny, or change creator-facing review state.
5. On delivery failure, leave the stage unchanged so the next run retries and
   expose the automation failure in the existing operations channel.

The automation should be created off, inspected in Airtable, and enabled only
after one fixture record passes every alert stage in a non-creator-facing test.

## MCP changes after Airtable approval

- Add the returned field IDs to `FIELD_IDS.exceptions`.
- Expose `validity`, `expires_at`, and `renewal_notes` as writable inputs on the
  exception create/update tools.
- Expose `effective_status` and `expiry_alert_stage` as read-only or
  automation-managed fields; do not advertise them as user-writable.
- Require `expires_at` when a write sets an exception to `✅Approved` with
  `validity = Time-boxed`.
- Return a validation error rather than typecasting an unknown validity value.
- Add unit, field-map, tool-boundary, and live readback smoke coverage.

## Migration sequence

1. Capture a schema and record-count snapshot.
2. Add the five fields without changing formulas, gates, interfaces, or
   automations.
3. Classify all existing rows as `Permanent` or `Time-boxed` through a bounded,
   reviewer-approved migration sheet. Do not infer validity from prose.
4. Read back every migrated record and confirm decision fields are unchanged.
5. Update `Undecided?` and `Approved?`; verify version and asset rollups on one
   permanent, one future time-boxed, and one expired fixture.
6. Add the MCP field contract and deploy it through the normal PR gate.
7. Create the disabled daily automation, test it, then request exact approval
   to enable it.
8. Add expiry columns and filters to the existing Exceptions interface only
   after interface-change approval.

## Verification

The change is complete only when:

- Airtable schema readback shows the exact field types/options/formula.
- Existing record count is unchanged and every existing row has a reviewed
  validity classification.
- A permanent exception remains effective with no expiry.
- A future time-boxed exception remains effective until its timestamp.
- An expired exception appears as `⚠️Expired`, contributes to the undecided
  rollup, and blocks approval on a later app version.
- Alert-stage writeback prevents duplicate 30d/7d/1d/expired messages.
- MCP create/update rejects approved time-boxed input without `expires_at` and
  returns the new fields after a successful fixture write.
- No creator email or review decision is emitted by the expiry automation.

## Rollback

1. Turn off the expiry automation.
2. Restore the prior `Undecided?` and `Approved?` formulas from the before
   receipt.
3. Revert the MCP field-contract commit and redeploy the last known-good worker.
4. Hide the additive expiry fields from interfaces while retaining their data
   for audit; deletion requires a separate destructive approval.
5. Verify the original status, decision owner/date, record count, and app/version
   links are unchanged.

## Required approval

One exact architecture approval is required before field creation. Separate
approval is required before formula/gate changes, bulk classification, interface
edits, or enabling the automation. Approval for one step does not authorize the
others.
