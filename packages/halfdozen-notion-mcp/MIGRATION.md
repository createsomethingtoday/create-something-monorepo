# Migration: WORKWAY → CREATE SOMETHING

Moves all 11 `halfdozen-notion-mcp` deployments from the WORKWAY Cloudflare account onto the CREATE SOMETHING account, under `*.mcp.createsomething.agency`.

## Scope

11 workers. Same codebase (`halfdozen-notion-mcp`), one wrangler config per client. Each has a staged `.cs.toml` variant ready for CS-account deploy.

| Client | Current URL (WORKWAY) | Target URL (CS) | Staged config |
|--------|------------------------|------------------|---------------|
| Half Dozen × CREATE SOMETHING | `createsomething-notion.mcp.workway.co` | `createsomething-notion.mcp.createsomething.agency` | `worker/wrangler.cs.toml` |
| BLOND:ISH | `blondish-notion.mcp.workway.co` | `blondish-notion.mcp.createsomething.agency` | `worker/wrangler.blondish.cs.toml` |
| C3 Management | `c3-management-notion.mcp.workway.co` | `c3-management-notion.mcp.createsomething.agency` | `worker/wrangler.c3-management.cs.toml` |
| Cracked Live | `cracked-notion.mcp.workway.co` | `cracked-notion.mcp.createsomething.agency` | `worker/wrangler.cracked.cs.toml` |
| Fanpad | `fanpad-notion.mcp.workway.co` | `fanpad-notion.mcp.createsomething.agency` | `worker/wrangler.fanpad.cs.toml` |
| Juice Labs | `juice-labs-notion.mcp.workway.co` | `juice-labs-notion.mcp.createsomething.agency` | `worker/wrangler.juice-labs.cs.toml` |
| KK Management | `kk-management-notion.mcp.workway.co` | `kk-management-notion.mcp.createsomething.agency` | `worker/wrangler.kk-management.cs.toml` |
| Lightswitch | `lightswitch-notion.mcp.workway.co` | `lightswitch-notion.mcp.createsomething.agency` | `worker/wrangler.lightswitch.cs.toml` |
| Phase 3 | `phase-3-notion.mcp.workway.co` | `phase-3-notion.mcp.createsomething.agency` | `worker/wrangler.phase-3.cs.toml` |
| System Studio | `system-studio-notion.mcp.workway.co` | `system-studio-notion.mcp.createsomething.agency` | `worker/wrangler.system-studio.cs.toml` |
| Three Six Zero | `three-six-zero-notion.mcp.workway.co` | `three-six-zero-notion.mcp.createsomething.agency` | `worker/wrangler.three-six-zero.cs.toml` |

## What changes per config

The `.cs.toml` variants differ from their `.toml` siblings in exactly four lines:

```diff
- account_id = "5c3e9cf4d55ce171b844fad0931607f9"  # WORKWAY
+ account_id = "9645bd52e640b8a4f40a3a55ff1dd75a"  # CREATE SOMETHING
- # Production URL: https://<slug>-notion.mcp.workway.co
+ # Production URL: https://<slug>-notion.mcp.createsomething.agency
- pattern = "<slug>-notion.mcp.workway.co"
+ pattern = "<slug>-notion.mcp.createsomething.agency"
- database_id = "4eb35a0f-6ee2-4d0c-8c0a-9a2ab4049b97"
+ database_id = "TODO_CS_D1_UUID"  # set after creating halfdozen-feedback on CS
```

All other bindings (Durable Object class, migrations tag, vars, secrets list) are unchanged — same codebase, same MCP surface.

## Account-scoped resources (what doesn't transfer)

Cloudflare bindings are account-scoped. None of these transfer automatically; each has a migration step.

| Resource | Account-scoped? | Transfer path |
|----------|------------------|----------------|
| Worker code | No (just redeploy) | `wrangler deploy --config …cs.toml` |
| Custom domain | Yes (zone must be in target account) | `createsomething.agency` already on CS account — auto-provisions via `custom_domain = true` |
| Secrets (`NOTION_API_KEY`, `NOTION_CLIENT_API_KEY`) | Yes | `wrangler secret put … --config …cs.toml` per secret per config |
| D1 `halfdozen-feedback` | Yes | Create fresh D1 on CS; replay schema; optionally migrate rows |
| Durable Object `NotionHalfDozenMcp` | Yes | **No migration path.** Fresh CS-account DOs start empty |

### Durable Object state loss

`NotionHalfDozenMcp` is `new_sqlite_classes = ["NotionHalfDozenMcp"]` — SQLite-backed. Whatever it persists on WORKWAY is **not** transferable to CS-account DOs.

Before cutover, audit what the DO actually persists:
- If ephemeral (MCP session state, in-flight requests) → no user impact.
- If durable (auth tokens, user preferences, rate-limit counters) → users may re-authenticate, lose history, or temporarily exceed quotas.

## Prerequisites

```bash
# 1. Confirm CS Cloudflare account is selected
wrangler whoami
# Should show account 9645bd52e640b8a4f40a3a55ff1dd75a

# 2. Confirm createsomething.agency zone is active on CS account
wrangler zones list | grep createsomething.agency

# 3. Create the D1 on CS account (copy the emitted UUID)
cd packages/halfdozen-notion-mcp/worker
wrangler d1 create halfdozen-feedback
# → Copy database_id, paste into every *.cs.toml replacing TODO_CS_D1_UUID

# 4. Replay schema (if any schema files exist)
wrangler d1 execute halfdozen-feedback --file=./schema.sql
```

Replace `TODO_CS_D1_UUID` in all 11 `.cs.toml` configs with the single CS-account D1 UUID (same database shared across workers, same as today on WORKWAY).

## Per-client deploy procedure

Run once per client, in order of risk tolerance (start with internal tenants, end with client-facing):

### Suggested order

1. `wrangler.cs.toml` (HD × CS — low traffic, internal)
2. `wrangler.system-studio.cs.toml` (System Studio — HD internal tool)
3. `wrangler.juice-labs.cs.toml`, `wrangler.fanpad.cs.toml` (newer clients, smaller blast radius)
4. `wrangler.cracked.cs.toml`, `wrangler.blondish.cs.toml` (established, larger traffic)
5. `wrangler.c3-management.cs.toml` (two interconnected deployments on C3)
6. `wrangler.kk-management.cs.toml`, `wrangler.lightswitch.cs.toml`, `wrangler.phase-3.cs.toml`, `wrangler.three-six-zero.cs.toml` (pending-migration clients)

### Per-deploy steps

```bash
CONFIG=wrangler.blondish.cs.toml

# Push secrets (reads from Infisical via wrapper OR one-at-a-time prompts)
infisical run --env=prod --path=/mcp-hub/notion -- \
  wrangler secret put NOTION_API_KEY --config "$CONFIG"
infisical run --env=prod --path=/mcp-hub/notion -- \
  wrangler secret put NOTION_CLIENT_API_KEY --config "$CONFIG"
# (For infisical run to work, set env-var aliases so the wrapper passes the
# right client key into the generic NOTION_CLIENT_API_KEY slot — or export
# and pipe manually.)

# Deploy to CS account
wrangler deploy --config "$CONFIG"

# Verify
curl -sS --max-time 15 \
  -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1.0"}}}' \
  https://blondish-notion.mcp.createsomething.agency/mcp

# Update fleet.json status → "deployed"
# Old WORKWAY worker remains live — decommission after grace period.
```

### Post-all-deploys: decommission WORKWAY workers

Once all 11 CS-account deployments are verified and downstream consumers have updated their URLs:

```bash
# For each original WORKWAY config
wrangler delete --config wrangler.blondish.toml  # etc., × 11
```

Then remove the old `.toml` files from the repo (commit separately).

## Cutover strategy for downstream consumers

Who references these URLs?

1. **`config/mcp-hub/registry.json`** — currently does not include these (fleet.json does, post this migration).
2. **`config/mcp-hub/fleet.json`** — flip `url` to the `createsomething.agency` target, delete the `migration` block, mark `account: "create-something"`.
3. **Client Codex / Claude configs** — wherever clients have `https://<slug>-notion.mcp.workway.co/mcp` hard-coded.
4. **HD Notion Products DB** (page 27b0191…) — update Server URL column.
5. **.mcp.json in this repo** — none currently reference these, confirmed 2026-04-16.

Recommended: keep old workway URL returning a 301 or a 503 with a `X-Migration-Target` header for 30 days to catch stragglers. Not automated in this runbook.

## Validation

After each deploy, run the fleet probe:

```bash
# Unauthenticated — fast regression check
bash config/mcp-hub/test-fleet-urls.sh

# Authenticated — full end-to-end via Infisical
infisical run --env=prod --path=/mcp-hub -- \
  bash config/mcp-hub/test-fleet-urls.sh
```

Look for every migrated row to flip from `mcp.workway.co` → `mcp.createsomething.agency` and return `✓ MCP OK`.
