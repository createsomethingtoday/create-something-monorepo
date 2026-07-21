# Webflow App Review MCP

Remote MCP server for Webflow App Review workflows and the Airtable-backed Webflow Governance & Transparency database.

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

The Worker has two deliberately separate authentication surfaces:

- `/mcp` and `/sse` retain the shared bearer boundary for existing Hub and
  Dify integrations. `MCP_API_KEY` remains required for these paths.
- `/access/mcp` and `/access/sse` are reserved for the Webflow-owned Cloud
  adapter. Cloudflare Access Managed OAuth sends users through Webflow Okta,
  then adds a signed `Cf-Access-Jwt-Assertion` for the origin request.

The Access assertion is verified against the exact
`https://webflow.cloudflareaccess.com` issuer, the dedicated App Review Access
application audience, RS256, expiry, and the `type=app` claim. The Worker then
applies the App Review email allowlist and maps a known email to the canonical
account in `REVIEWER_DIRECTORY_JSON`. It does not trust an opaque Managed OAuth
bearer or an unsigned forwarded-email header.

The dedicated audience is intentionally empty until the Webflow Cloud hostname
and Okta-backed Access application are provisioned. Until then,
`/access/mcp` fails closed with `503 MISCONFIGURED`; the existing `/mcp` route
continues to provide the rollback path.

## Secrets / Vars

Required:

- `AIRTABLE_API_KEY` (Airtable PAT)
- `MCP_API_KEY` (worker boundary bearer token)

Optional:

- `AIRTABLE_BASE_ID` (defaults to `appMoIgXMTTTNIc3p`)
- `AIRTABLE_GOVERNANCE_API_KEY` (optional PAT for a separate tracker base; falls back to `AIRTABLE_API_KEY`)
- `AIRTABLE_GOVERNANCE_BASE_ID` (optional separate tracker base; discovered tracker base: `app1Q0o9xw2Zny7gw`)
- `AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID` (defaults to table name `App Review Governance Findings`)
- `OAUTH_ALLOWED_EMAIL_DOMAIN` (defaults to `webflow.com`)
- `OAUTH_ALLOWED_EMAILS` (explicit App Review sign-in allowlist)
- `REVIEWER_DIRECTORY_JSON` (optional canonical account mapping for Access telemetry)
- `REVIEWER_AUTH_EMAIL_ALIASES_JSON` (optional canonical-account email aliases)
- `CF_ACCESS_TEAM_DOMAIN` (exact Cloudflare Access issuer)
- `CF_ACCESS_AUD` (exact App Review Access application audience; no default)

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
- broad metadata and marketplace-status updates should stay operator-gated

## Resources

- `app-review://field-map`
- `app-review://status-options`
- `app-review://governance-finding-schema`
- `app-review://governance-findings-snapshot`
- `governance://finding-schema`
- `governance://findings-snapshot`
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
