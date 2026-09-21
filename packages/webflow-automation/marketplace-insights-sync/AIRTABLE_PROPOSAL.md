# Additive Marketplace Insights snapshot table — approval required

Observed September 21, 2026 through the official Airtable MCP in Marketplace
Assets (`appMoIgXMTTTNIc3p`): the leaderboard table (`tblcXLVLYobhNmrg6`) has no
stable template-ID field. The category table (`tblDU1oUiobNfMQP9`) contains
category-level metrics, not a unique marketplace aggregate. No snapshot table
with the proposed name exists in the inspected schema.

## Exact proposed operation

Create one **empty** table named **Marketplace Insights Snapshots** in base
`appMoIgXMTTTNIc3p`, through `mcp__airtable__create_table`, with these fields:

| Field | Type | Meaning |
|---|---|---|
| KEY | singleLineText, primary | Canonical ISO window-end timestamp; upsert key |
| SNAPSHOT_AT | dateTime, UTC, ISO date, 24-hour time | Source window end, also used to select the latest snapshot |
| SUMMARY_JSON | multilineText | Schema version 1 plus unique total sales, gross revenue and selling-template count |
| LEADERBOARD_JSON | multilineText | Top 160 rows keyed by stable template ID, including attribution and ranks |
| CATEGORIES_JSON | multilineText | Category breakdowns; contributions overlap and are not marketplace totals |

The publisher rejects fields over 90,000 UTF-8 bytes, malformed snapshots,
ambiguous identities and missing source mappings before writing. All parts are
published in one record mutation; earlier weeks are retained without pruning.

## Scope and impact

This approval covers table creation only. It does **not** cover writing a
snapshot, modifying either legacy table, changing existing records or fields,
creating/publishing an interface, changing permissions, enabling an automation,
changing launchd, or activating the dashboard reader. The new table will inherit
the base's existing access; its eventual contents are private sales/creator data.
No downstream consumer is switched merely by creating the table.

## Execution and verification

1. Re-read the base schema; stop if the proposed name already exists or targets changed.
2. Create only the empty table and five fields above.
3. Read back the returned table ID and all field types/configuration.
4. Save the confirmed IDs and a mutation receipt. Do not invent a table ID.
5. Leave the table empty and reader configuration unset pending a reviewed dry-run/promotion checkpoint.

Policy: Airtable System Architect `policy.airtable-system-architect.v1`, R2
structural draft. It requires a visible proposal and explicit approval.

Rollback: leave the empty unused table disconnected. No source data or consumer
behavior has changed, so no data restoration is needed. Table deletion would be
a separate approved operation, not an automatic cleanup step.
