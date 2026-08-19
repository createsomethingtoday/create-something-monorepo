# exception-decisions-mcp

Decision-scoped MCP for the Webflow app-review exceptions loop. It lets decision-makers and one
constrained automation work the ⚖️Exceptions queue with identity-stamped writes. Reviewer-side
fields are out of scope (those live in `webflow-app-review-mcp`).

- **Production:** `https://exceptions.mcp.createsomething.agency` (worker `exception-decisions-mcp`,
  CREATE SOMETHING Cloudflare account)
- **Version:** 1.3.0 (deployed 2026-08-18)
- **Data:** Airtable base `appMoIgXMTTTNIc3p` — `🖌️Asset Versions` (`tblHxZ2hgSFLZxsZu`) and
  `⚖️Exceptions` (`tblnbaaIbIulWl0b7`), via the `⚖️ Exception Decisions` view (`viwM48eXQT4Mxc4Ak`)

## The contract (MCP, not OpenAPI)

This service speaks MCP only. There is no REST or OpenAPI surface: clients read the live tool
contract from `tools/list`, so the contract ships in the same deploy as the behavior. Endpoints:

| Path | What it is |
|---|---|
| `/` and `/health` | Status JSON: name, version, whether Airtable and deciders are configured |
| `/mcp` | MCP over HTTP. `Authorization: Bearer <key>`, or path form `/mcp/<key>` for clients without header support (claude.ai custom connectors, some Dify setups) |

Dify agents register this as an MCP server (not a custom tool, so no OpenAPI schema to maintain).
Dify caches tool schemas per app: after a version bump, refresh tools in each agent's MCP
settings so descriptions match the deployed behavior.

## Identity

`DECIDERS_JSON` (worker secret) maps each `exd_…` bearer key to `{name, email, role, surface?}`.
Every write appends a signed attribution line naming the identity. Adding or removing identities
is a secret re-upload, no code change: update `.deciders.local.json` (gitignored, the local
mirror), then `wrangler secret put DECIDERS_JSON < .deciders.local.json`. Verify with `whoami`.

Roles: `final` (Adam), `partner-lead` (Greg), `operator` (Micah), `automation` (the
recommendation runner).

## Decision rights (v1.3.0)

| Action | Person keys | `role: automation` keys |
|---|---|---|
| `list_pending_exceptions`, `get_exception_item`, `whoami` | yes | yes |
| `recommend_exception_item` (advisory, sets 👀Under Review) | yes, notes prefixed "Partner-lead recommendation:" | yes, notes prefixed "Automated recommendation (advisory):" |
| `decide_exception_item` → denied | yes | yes (deny-only) |
| `decide_exception_item` → approved / under_review | yes | **refused server-side** |
| `decide_version_exception` (any decision) | yes; denying requires `confirm_release: true` because it emails the review feedback to the developer | **refused server-side** |
| `draft_developer_update` | yes (returns a DRAFT; never contacts the developer) | yes (draft only) |

The reasoning: an automated deny waives nothing, it means the guideline stands. Granting an
exception and sending anything to a developer are people's calls, enforced by the server rather
than by prompt instructions. Decided items refuse further writes; corrections happen directly in
Airtable.

## Tools

| Tool | What it does |
|---|---|
| `list_pending_exceptions` | The decision queue: versions awaiting a decision with their per-item rows |
| `get_exception_item` | One item in full: technical finding, plain-English translation, decision trail |
| `recommend_exception_item` | Record an advisory approve/deny lean without deciding |
| `decide_exception_item` | Record the item decision (see decision rights above) |
| `decide_version_exception` | Record the version-level aggregate; approval requires every item decided first |
| `draft_developer_update` | Compose a developer-facing status draft from the records |
| `whoami` | The identity this key acts as and its limits |

## Runner

`scripts/runner.mjs` drives the automation lane (see
`docs/dify-recommendation-runbook.md` for the operating rules):

```bash
node scripts/runner.mjs --leans docs/<leans>.json            # dry run
node scripts/runner.mjs --leans docs/<leans>.json --write    # record advisory recommendations
node scripts/runner.mjs --leans docs/<leans>.json --decide --write  # record deny-only decisions
```

Leans come from a reviewed leans file today; the Dify workflow (`DIFY_RECOMMENDER_APP_KEY`)
replaces the file once the app exists in Dify Studio. The runner enforces the soft guarantees:
technical types only, skip items already carrying a recommendation, confidence at or above 0.7,
never over a conflicting human note, capped writes per run.

## Secrets

| Name | Where | Purpose |
|---|---|---|
| `AIRTABLE_API_KEY` | worker secret | Airtable PAT scoped to the base |
| `DECIDERS_JSON` | worker secret + `.deciders.local.json` mirror | identity map |
| `RECOMMENDER_MCP_KEY` | to vault in Infisical (`prod:/exception-decisions-mcp`) | the automation's key |
| `DIFY_RECOMMENDER_APP_KEY` | to vault once the Dify app exists | Dify Service API key for the recommendation workflow |

## Deploy

```bash
cd packages/exception-decisions-mcp
npx wrangler deploy   # secrets persist across deploys
curl -s https://exceptions.mcp.createsomething.agency/health | jq .version
```

## History

The original v1.1.0 TypeScript source was lost from disk in a worktree cleanup; the deployed
bundle was recovered from Cloudflare on 2026-08-18 (`docs/recovered-deploy-v1.1.0.{md,js}`) and
`src/index.ts` was rebuilt from it. v1.2.0 added role-aware recommendation prefixes and refused
decide tools for automation keys; v1.3.0 narrowed that to deny-only automation decisions.
Companion docs: `docs/dify-recommendation-runbook.md` (the automation lane),
`docs/shadow-run-2026-08-18.md` (first run), and the canonical loop runbook
`packages/webflow-app-review-mcp/docs/exception-transparency-loop.md` in the
root-preserve-20260811-1955 tree.
