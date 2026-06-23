# Webflow App Review MCP

Remote MCP server for Webflow App Review workflows and the Airtable-backed Webflow Governance & Transparency database.

## Scope

- Base: `appMoIgXMTTTNIc3p`
- Tables:
  - `👛Assets` (`tblRwzpWoLgE9MrUm`)
  - `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`)
  - `App Review Governance Findings` (`AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID` when provisioned)
  - `Reviewer Exceptions` (`tblqkbW0SptshgPiw`) in base `appXfYXnivsUT1kLg`
- Data policy:
  - apps-only filtering (`Capabilities`, `Client ID`, `APP ID`, `Visibility`)
  - read/write for approved fields
  - computed/lookup fields are read-only
  - governance findings are the structured backlog for cross-app policy/docs/platform gaps; they do not mutate official app review decisions
  - reviewer exceptions are mutable knowledge candidates; MCP-created records are not retrievable by Dify until approved in Airtable

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
- `AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY` (PAT scoped to the reviewer exceptions base; falls back to `AIRTABLE_GOVERNANCE_API_KEY`/`AIRTABLE_API_KEY`)
- `AIRTABLE_REVIEWER_EXCEPTIONS_BASE_ID` (defaults to `appXfYXnivsUT1kLg`)
- `AIRTABLE_REVIEWER_EXCEPTIONS_TABLE_ID` (defaults to `tblqkbW0SptshgPiw`)
- `DIFY_EXTERNAL_KNOWLEDGE_API_KEY` (bearer token for Dify External Knowledge API `/retrieval`)
- `DIFY_REVIEWER_EXCEPTIONS_KNOWLEDGE_ID` (defaults to `reviewer-exceptions`)

Recommended Infisical path:

- `prod:/webflow-app-review-mcp:MCP_BEARER_TOKEN`
- `prod:/webflow-app-review-mcp:AIRTABLE_REVIEWER_EXCEPTIONS_API_KEY`
- `prod:/webflow-app-review-mcp:DIFY_EXTERNAL_KNOWLEDGE_API_KEY`

## Tools

- `app_review_health`
- `app_review_list_queue`
- `app_review_get_asset`
- `app_review_list_versions`
- `app_review_get_version`
- `app_review_get_review_context`
- `app_review_save_draft_feedback`
- `app_review_set_review_status`
- `app_review_get_field_map`
- `governance_database_health`
- `governance_database_list_findings`
- `governance_database_get_finding`
- `governance_database_create_finding`
- `governance_database_update_finding`
- `app_review_list_reviewer_exceptions`
- `app_review_propose_reviewer_exception`
- `app_review_preview_reviewer_exception_knowledge`
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

Write posture:

- no reviewer session or assigned-reviewer context is required
- queue filters can inspect assigned, unassigned, or all records without binding to a reviewer
- draft feedback and controlled status changes write explicit Airtable fields only
- narrow decision verbs are available for request-changes, approve, and reject
- reviewer exception proposals create `Draft`/`Proposed` non-retrievable knowledge candidates only
- broad metadata and marketplace-status updates should stay operator-gated

## Resources

- `app-review://field-map`
- `app-review://status-options`
- `app-review://governance-finding-schema`
- `app-review://governance-findings-snapshot`
- `governance://finding-schema`
- `governance://findings-snapshot`
- `app-review://reviewer-exception-schema`
- `app-review://reviewer-exceptions-snapshot`
- `app-review://queue-snapshot`
- `app-review://database-workflow`

## Prompts

- `app_review_decision_support`
- `app_review_feedback_refiner`
- `app_review_governance_finding_capture`
- `governance_database_finding_capture`

## Dify Governance Database Access

For Dify cards whose job is direct access to the governance database, register this MCP server once:

- Server ID: `webflow-app-review`
- URL: `https://webflow-app-review-mcp.createsomething.workers.dev/mcp`
- Auth: bearer token from Infisical `prod:/webflow-app-review-mcp:MCP_BEARER_TOKEN`

Enable the neutral `governance_database_*` tools for the governance database workflow. Do not register Airtable API URLs, base IDs, or table IDs as MCP servers in Dify. The table `tblIH1LQ8H3b2piNi` is accessed through this MCP, not as a standalone MCP endpoint.

The older `app_review_*_governance_finding` tools remain for backward compatibility with app-review hubs, but the neutral tools are preferred when the caller is not acting as a specific reviewer.

## Dify External Knowledge: Reviewer Exceptions

The Worker exposes Dify's External Knowledge API at:

- Endpoint base URL: `https://webflow-app-review-mcp.createsomething.workers.dev`
- Dify request path: `/retrieval`
- Knowledge ID: `reviewer-exceptions`
- Auth: bearer token from Infisical `prod:/webflow-app-review-mcp:DIFY_EXTERNAL_KNOWLEDGE_API_KEY`

Dify retrieval returns Airtable records only when all retrieval gates pass:

- `Knowledge Status` is `Approved` or `Active`
- `Include in Dify Retrieval` is checked
- `Expires At` is empty or today/future

Reviewer agents should use `app_review_propose_reviewer_exception` when a reviewer reports a missed guideline, exception, or temporary update. That tool always creates a non-retrievable `Draft`/`Proposed` record. A human reviewer lead must approve the row in Airtable before Dify can retrieve it.

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
| `Reporter` | Single line text | Defaults to `Dify Governance Database` when omitted |
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
