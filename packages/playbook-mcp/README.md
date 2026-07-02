# Playbook MCP

Host workflow playbooks for MCP onboarding. Teaches users how to work effectively in Codex, Cursor, Claude Desktop, Claude Code, Windsurf, and VS Code (Copilot).

Lightweight by design — ships alongside client MCPs for onboarding. No philosophy, no papers, no design system. Just workflow guidance.

## Framework Tier

| Tier           | MCP Primitive | Role in This Server                                                                          |
| -------------- | ------------- | -------------------------------------------------------------------------------------------- |
| **Database**   | Resources     | Host playbooks (one resource per host) + list + comparison matrix + graduation path          |
| **Automation** | Tools         | 14 tools: host playbooks + outcome playbooks + Atlas exports (9) + installation guidance (5) |
| **Judgment**   | Prompts       | 3 prompts: workflow setup, host comparison, project structure guidance                       |

## Resources (Database Tier)

Application-controlled playbook content.

| URI                                       | Description                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `playbooks://list`                        | All host playbooks with slugs, names, and best-for summaries                 |
| `playbooks://hosts/codex`                 | Codex workflow playbook: mental model, patterns, folder structure            |
| `playbooks://hosts/cursor`                | Cursor workflow playbook: mental model, patterns, folder structure           |
| `playbooks://hosts/claude-desktop`        | Claude Desktop workflow playbook: mental model, patterns                     |
| `playbooks://hosts/claude-code`           | Claude Code workflow playbook: mental model, patterns                        |
| `playbooks://hosts/windsurf`              | Windsurf workflow playbook: mental model, patterns                           |
| `playbooks://hosts/vscode`                | VS Code (Copilot) workflow playbook: mental model, patterns                  |
| `playbooks://workflows/list`              | Structured workflows (machine-readable) derived from host playbooks          |
| `playbooks://workflows/{id}`              | A single structured workflow (JSON)                                          |
| `playbooks://workflows/{id}/atlas-studio` | Atlas Studio import JSON (BuilderState) for a single workflow                |
| `playbooks://outcomes/list`               | Outcome playbooks (AI-native workflows) across construction, agency, and ops |
| `playbooks://outcomes/{id}`               | A single outcome playbook (JSON)                                             |
| `playbooks://outcomes/{id}/atlas-studio`  | Atlas Studio import JSON (BuilderState) for a single outcome playbook        |
| `playbooks://comparison`                  | Host comparison matrix by task type + MCP usage patterns                     |
| `playbooks://graduation-path`             | The Graduation Path: Claude Desktop -> Cursor -> Codex                       |

## Tools (Automation Tier)

### Playbook Tools

Model-controlled functions. These mirror Resources for hosts that only support tools (Codex, ChatGPT).

| Tool                                   | Purpose                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `get_playbook`                         | Get the workflow playbook for a specific host. Supports domain filtering (construction, legal, agency, general).                     |
| `compare_hosts`                        | Compare Codex, Cursor, and Claude Desktop for a task type (project-management, research, document-drafting, data-analysis, general). |
| `get_folder_structure`                 | Get the recommended folder structure for AI-assisted work in Codex or Cursor.                                                        |
| `list_workflows`                       | List structured workflows with stable ids (machine-readable).                                                                        |
| `get_workflow`                         | Get a structured workflow by id (steps include Atlas reference ids).                                                                 |
| `export_workflow_atlas_studio`         | Export a workflow in Atlas Studio import format (BuilderState JSON).                                                                 |
| `list_outcome_playbooks`               | List AI-native outcome playbooks with stable ids (machine-readable).                                                                 |
| `get_outcome_playbook`                 | Get an outcome playbook by id (includes steps, integrations, judgment notes, test scenarios).                                        |
| `export_outcome_playbook_atlas_studio` | Export an outcome playbook in Atlas Studio import format (BuilderState JSON).                                                        |

### Installation Tools

Generation-only tools that return config content, file manifests, and instructions. The agent's native file capabilities handle actual writes. Works from both the deployed Worker and local stdio.

| Tool                    | Purpose                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `detect_host`           | Detect which MCP host the user is in. Returns config path, format, and capabilities. First step for guided installation. |
| `list_available_mcps`   | List MCP servers available for installation from CREATE SOMETHING, WORKWAY, and third-party catalogs.                    |
| `generate_mcp_config`   | Generate the exact config entry (JSON or TOML) to install an MCP server into a specific host.                            |
| `scaffold_project`      | Generate a complete folder/file manifest for a new AI-assisted project. Domain and team-size aware.                      |
| `verify_mcp_connection` | Ping an MCP server URL to check if it's reachable and responding.                                                        |

## Prompts (Judgment Tier)

User-controlled workflow guidance templates.

| Prompt              | Purpose                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `workflow_setup`    | Personalized workflow guide — the entry point for non-technical users. Detects host, recommends patterns, sets up structure. |
| `host_comparison`   | Direct, opinionated host recommendation for a task type.                                                                     |
| `project_structure` | Generate a recommended folder structure for AI-assisted work. Supports host, domain, and team size parameters.               |

## The Graduation Path

The opinionated progression encoded in this server:

1. **Claude Desktop** — Start here. Lowest barrier to entry. Graduate when you find yourself re-explaining context or doing the same task repeatedly.
2. **Cursor** — See and control file changes in real-time. Graduate when you have repeatable workflows you want automated.
3. **Codex** — Autonomous execution and compounding institutional knowledge. The destination.

## Remote Server (Production)

Deployed as a Cloudflare Worker with Streamable HTTP transport:

**URL**: `https://playbook.mcp.createsomething.ltd`

The core MCP transport is open for onboarding (`/mcp`, `/sse`). Client-specific agent trigger routes are protected with bearer token auth.

### Claude Code

```bash
claude mcp add playbook --transport http https://playbook.mcp.createsomething.ltd/mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "playbook": {
      "url": "https://playbook.mcp.createsomething.ltd/mcp"
    }
  }
}
```

### OpenAI Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers."playbook"]
url = "https://playbook.mcp.createsomething.ltd/mcp"
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "playbook": {
      "url": "https://playbook.mcp.createsomething.ltd/mcp"
    }
  }
}
```

### Protected Half Dozen agent routes

- `POST /clients/halfdozen/agents/fleet-watchdog/run`
- `POST /clients/halfdozen/agents/inbox-triage/run`
- `POST /clients/halfdozen/agents/dedup/run`
- `POST /create-something/agents/mcp-registry-sweep/run`

Auth required:

- `Authorization: Bearer <HALFDOZEN_AGENT_ROUTE_TOKEN>` or
- `X-API-Key: <HALFDOZEN_AGENT_ROUTE_TOKEN>`

Request body (optional JSON):

```json
{
  "query": "Custom watchdog prompt",
  "model": "gpt-4.1-mini",
  "max_turns": 10,
  "timeout_ms": 20000
}
```

Example:

```bash
curl -X POST "https://playbook.mcp.createsomething.ltd/clients/halfdozen/agents/inbox-triage/run" \
  -H "Authorization: Bearer $HALFDOZEN_AGENT_ROUTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

All responses include contract bundle metadata, blocked/required tools, required tool coverage (when applicable), called tools, and final output.
If one or more MCP servers are unavailable, the route returns a degraded payload (`degraded: true`) with `failed_servers` and `degraded_reason` instead of a hard failure.

The CREATE SOMETHING MCP registry sweep is deterministic rather than LLM-driven.
It inventories the full static MCP registry, fleet registry, and registered
Playbook agent health surfaces, then separately checks the live Hub
health/status surface for currently enabled server connectivity. This is
deliberate: the registry can include hundreds of available Composio/toolkit
entries, but only enabled Hub servers should be live-connected on each sweep.
The route posts one compact health snapshot to Calm Operator Ink. It is intended
as the deeper source behind Ink's "Review MCPs" summary; the device displays the
summary, while the route response keeps the full inventory and live server list.

```bash
curl -X POST "https://playbook.mcp.createsomething.ltd/create-something/agents/mcp-registry-sweep/run" \
  -H "Authorization: Bearer $HALFDOZEN_AGENT_ROUTE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Ink notifications (optional):

- Set `INK_SOURCE_TOKEN` or `INK_BRIDGE_TOKEN` so completed runs can post a health snapshot to Calm Operator Ink.
- Set `INK_BRIDGE_ORIGIN` when the Ink bridge is not `https://ink.createsomething.agency`.
- The fleet watchdog is scheduled by Cloudflare Cron at `04:00`, `13:00`, `18:00`, and `23:00` UTC by default. Override with `HALFDOZEN_FLEET_WATCHDOG_CRON_UTC_HOURS` or disable with `HALFDOZEN_FLEET_WATCHDOG_CRON_ENABLED=false`.
- Scheduled fleet-watchdog runs use `HALFDOZEN_FLEET_WATCHDOG_TIMEOUT_MS` for MCP connection and request timeouts. The default is `60000`; accepted values are `10000` through `120000`.
- The MCP registry sweep runs on the same default schedule. Override with `MCP_REGISTRY_SWEEP_CRON_UTC_HOURS` or disable with `MCP_REGISTRY_SWEEP_CRON_ENABLED=false`.
- Healthy runs clear the agent health state; degraded runs surface as Ink health attention.

Email notifications (optional):

- Set `RESEND_API_KEY` to enable Resend delivery.
- Set `HALFDOZEN_AGENT_NOTIFY_EMAIL_TO` to a comma-separated recipient list.
- Set `HALFDOZEN_AGENT_NOTIFY_EMAIL_MODE` to `alerts` or `all`; `alerts` sends only degraded or failed runs.
- Scheduled fleet-watchdog runs also write durable evidence to `TELEMETRY_DB` in `mcp_tool_invocations`.
- Verify Resend delivery without forcing a failed agent run:
  `POST /clients/halfdozen/agents/notifications/test` with `Authorization: Bearer $HALFDOZEN_AGENT_ROUTE_TOKEN`.
  The verification route writes durable evidence as `tool_name = resend_notification_test`.

Slack command controls (optional):

- Route: `POST /clients/halfdozen/slack/commands`
- Set `HALFDOZEN_SLACK_SIGNING_SECRET` (required) so Slack requests are signature-verified.
- Set `HALFDOZEN_SLACK_TEAM_ID` (optional) to restrict command execution to a single Slack workspace.
- Configure a slash command (for example `/halfdozen`) in your Slack app pointing to:
  - `https://playbook.mcp.createsomething.ltd/clients/halfdozen/slack/commands`
- Command usage:
  - `/halfdozen watchdog`
  - `/halfdozen inbox`
  - `/halfdozen dedup`
  - `/halfdozen watchdog investigate no-data servers only`
- Responses are acknowledged immediately, then the agent posts the completed result back into Slack via `response_url`.

## Local Development (stdio)

For local development, the stdio transport server is also available:

```bash
# Build
pnpm --filter=@create-something/playbook-mcp build

# Run locally
node packages/playbook-mcp/dist/index.js

# Add to Claude Code (local)
claude mcp add playbook-local -- node "$(pwd)/packages/playbook-mcp/dist/index.js"
```

## Worker Development

```bash
cd packages/playbook-mcp/worker

# Install worker dependencies
npm install

# Local dev server
npm run dev

# Deploy to production
npm run deploy

# Tail production logs
npm run tail
```

## Architecture

Two transports, one codebase:

| Transport                 | URL                                                                      | Use Case                                              |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| **Streamable HTTP**       | `.../mcp`                                                                | Claude Code, Codex, remote clients                    |
| **SSE**                   | `.../sse`                                                                | Legacy clients (deprecated in MCP spec 2025-03-26)    |
| **Protected HTTP Routes** | `.../clients/halfdozen/agents/{fleet-watchdog\|inbox-triage\|dedup}/run` | Half Dozen scenario execution (server-side trigger)   |
| **Slack Command Route**   | `.../clients/halfdozen/slack/commands`                                   | Slack slash command and interactive scenario triggers |
| **stdio**                 | `dist/index.js`                                                          | Local development                                     |

Zero external data dependencies. Playbook content and MCP catalog are embedded in source. The Worker runs on Cloudflare's edge network. Pure workflow knowledge served through protocol.

## MCP Catalog

The server includes a built-in catalog of 15 MCP servers across three categories:

- **CREATE SOMETHING** (6): Playbook, Three-Tier Framework, Content, Schedule, Substrate, Outerfields
- **WORKWAY** (4): QuickBooks, YouTube Sync, Gmail Sync, Zoom Sync
- **Third-Party** (5): Cloudflare Docs, Cloudflare Bindings, Cloudflare Agents, Webflow, Stripe

Use `list_available_mcps` to browse and `generate_mcp_config` to install.

## Verification

After configuring, verify the server is working:

- "Read the playbooks://list resource" (tests Resources / Database tier)
- "Use the get_playbook tool for cursor" (tests Tools / Automation tier)
- "Use the workflow_setup prompt" (tests Prompts / Judgment tier)

### Installation flow test

1. "Use detect_host to figure out what I'm running" (host detection)
2. "List available MCP servers" (catalog)
3. "Generate the config to install the three-tier-framework MCP in Cursor" (config generation)
4. "Verify the playbook MCP is reachable" (connection check)
