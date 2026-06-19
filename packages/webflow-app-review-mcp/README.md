# Webflow App Review MCP

Remote MCP server for Webflow App Review workflows, scoped to Airtable `Assets`, `Asset Versions`, and the app-review governance tracking hub.

## Scope

- Base: `appMoIgXMTTTNIc3p`
- Tables:
  - `👛Assets` (`tblRwzpWoLgE9MrUm`)
  - `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
  - `App Review Governance Findings` (`AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID` when provisioned)
- Data policy:
  - apps-only filtering (`Capabilities`, `Client ID`, `APP ID`, `Visibility`)
  - read/write for approved fields
  - computed/lookup fields are read-only
  - governance findings are the structured backlog for cross-app policy/docs/platform gaps; they do not mutate official app review decisions

## Auth

Worker boundary bearer auth:

- Header: `Authorization: Bearer <MCP_API_KEY>`
- Configure with:
  - `wrangler secret put MCP_API_KEY`
- `MCP_API_KEY` is required in all environments.
- If `MCP_API_KEY` is missing, `/mcp` and `/sse` return `503` with `MISCONFIGURED`.

## Secrets / Vars

Required:

- `AIRTABLE_API_KEY` (Airtable PAT)
- `MCP_API_KEY` (worker boundary bearer token)

Optional:

- `AIRTABLE_BASE_ID` (defaults to `appMoIgXMTTTNIc3p`)
- `AIRTABLE_GOVERNANCE_API_KEY` (optional PAT for a separate tracker base; falls back to `AIRTABLE_API_KEY`)
- `AIRTABLE_GOVERNANCE_BASE_ID` (optional separate tracker base; discovered tracker base: `app1Q0o9xw2Zny7gw`)
- `AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID` (defaults to table name `App Review Governance Findings`)
- `REVIEWER_DIRECTORY_JSON` (JSON map from hub `account_id` to reviewer identity, used by reviewer resources and write attribution payloads)

## Tools

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_my_queue`
- `app_review_get_review_context`
- `app_review_assign_self`
- `app_review_unassign_self`
- `app_review_save_draft_feedback`
- `app_review_set_review_status`
- `app_review_get_field_map`
- `app_review_list_governance_findings`
- `app_review_get_governance_finding`
- `app_review_create_governance_finding`
- `app_review_update_governance_finding`
- `app_review_request_changes`
- `app_review_approve_version`
- `app_review_reject_version`
- `app_review_update_version_review`
- `app_review_update_asset_metadata`
- `app_review_set_marketplace_status`

Reviewer-owned write posture is intended to mirror the Webflow template-review lane:

- self-assignment before review writes
- draft feedback and controlled status changes before final decisions
- narrow decision verbs for request-changes, approve, and reject
- broad metadata and marketplace-status updates kept outside the normal reviewer flow

## Resources

- `app-review://field-map`
- `app-review://status-options`
- `app-review://governance-finding-schema`
- `app-review://governance-findings-snapshot`
- `app-review://queue-snapshot`
- `app-review://reviewer-me`
- `app-review://reviewer-workflow`

## Prompts

- `app_review_decision_support`
- `app_review_feedback_refiner`
- `app_review_governance_finding_capture`

## Governance Findings Table

Create a table named `App Review Governance Findings` in the app review Airtable base or a dedicated tracker base. If using the dedicated tracker base, set `AIRTABLE_GOVERNANCE_BASE_ID` separately from `AIRTABLE_BASE_ID`, then set `AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID` to the table ID in deployed environments.

Live tracker base:

- Base: `App Review · Governance & Transparency Tracker` (`app1Q0o9xw2Zny7gw`)
- Findings table: `App Review Governance Findings` (`tblIH1LQ8H3b2piNi`)

Optional synced-table layer:

- Synced Apps table: `🔄🖥️Apps (Synced)` (`tblIdQTFyMa38pcjb`)
- Synced Asset Versions table: `All Apps Sync` (`tbl2fob2i4ommzc15`)
- Sync the Marketplace Assets `👛Assets` / `🖥️Apps` shared view into the tracker base after enabling syncing on the source view.
- Sync the relevant `🖌️Asset Versions` review view into the tracker base when version-level lookup is needed.
- Keep `Asset ID` and `Asset Version ID` as text trace fields for MCP writes; Airtable views/automations can add local linked-record fields to the synced tables once the sync exists.

Recommended fields:

| Field | Type | Notes |
|---|---|---|
| `Title` | Single line text | Required by `app_review_create_governance_finding` |
| `Status` | Single select | `New`, `Triage`, `In Progress`, `Needs Decision`, `Waiting on Owner`, `Done`, `Parking Lot` |
| `Priority` | Single select | `P0`, `P1`, `P2`, `P3` |
| `Category` | Single select | Runtime integrity, private/beta governance, inspectability, Forms API/credentials, docs/tracking hub, tooling/security scanning, ecosystem watch, parking lot |
| `Summary` | Long text | Required |
| `Evidence` | Long text | Concrete thread/ticket/docs evidence |
| `Recommendation` | Long text | Proposed policy, docs, platform, or tooling action |
| `Decision Needed` | Checkbox | True when product/legal/platform decision is needed |
| `Next Action` | Long text | Operational next step |
| `Owner` | Single line text | Human or team owner |
| `App Name` | Single line text | Optional app label |
| `App ID` | Single line text | Optional Webflow app ID |
| `Asset ID` | Single line text | Optional app-review asset record ID |
| `Asset Version ID` | Single line text | Optional app-review version record ID |
| `Source URL` | URL | Primary Slack/Zendesk/docs/Airtable source |
| `Linked URLs` | Long text | One URL per line |
| `Reporter` | Single line text | Defaults to resolved reviewer identity when available |
| `Created By Agent` | Single line text | Defaults to `webflow-app-review-mcp` |

## Canonical Mappings

- `Icon image` -> `🖼️Thumbnail Image`
- `Payment times` -> `ℹ️💲Payment Types`
- `relationships status` -> `👤Relationship Owner`

## Development

```bash
pnpm --filter=@create-something/webflow-app-review-mcp build
pnpm --filter=@create-something/webflow-app-review-mcp test
node packages/webflow-app-review-mcp/dist/index.js
```

## Worker

```bash
cd packages/webflow-app-review-mcp/worker
pnpm install
pnpm dev
pnpm deploy
```

## Token Rotation

Rotate shared bearer token:

```bash
cd packages/webflow-app-review-mcp/worker
pnpm exec wrangler secret put MCP_API_KEY
```

Distribute the new token to the app review team and invalidate prior copies operationally.
