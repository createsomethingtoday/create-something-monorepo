# OpenAI Agent SDK Half Dozen Smoke Test

This repo includes a runnable OpenAI Agents SDK smoke test for Half Dozen MCP servers:

- Script: `scripts/openai-agent-sdk-halfdozen-smoke.ts`
- npm script: `pnpm agent:halfdozen:smoke`

## Prerequisites

- `OPENAI_API_KEY` is set in your shell
- Network access to the Half Dozen MCP endpoints

## Scenario-Wired Runs

The smoke runner is now wired to the three contract bundles via `--scenario`:

- `dedup` (Notion + Gmail)
- `inbox-triage` (Gmail)
- `fleet-watchdog` (Telemetry)

The coded agent path defaults to `gpt-5.5`. Use `--model` to override it for a
specific run.

List scenario defaults and linked contract files:

```bash
pnpm agent:halfdozen:smoke --list-scenarios
```

Run a scenario with default query/servers/model/max-turns:

```bash
pnpm agent:halfdozen:smoke --scenario dedup
pnpm agent:halfdozen:smoke --scenario inbox-triage
pnpm agent:halfdozen:smoke --scenario fleet-watchdog
```

`fleet-watchdog` defaults are hardened to require multi-tool evidence collection (`query_health`, `query_errors`, `query_activity`, `query_trends`) before final output.

Connectivity-only scenario validation (no OpenAI API call):

```bash
pnpm agent:halfdozen:smoke --scenario dedup --connect-only
pnpm agent:halfdozen:smoke --scenario inbox-triage --connect-only
pnpm agent:halfdozen:smoke --scenario fleet-watchdog --connect-only
```

## Governance Eval

Until Notion exposes programmatic Custom Agent testing through the private beta,
the repo-owned governance eval is the programmable review gate. It validates the
coded agent scenario setup without calling OpenAI or Notion:

```bash
pnpm agent:halfdozen:governance-eval
```

It checks default model selection, contract bundle file presence, destructive
tool blocklists, generic MCP tool collision blocklists, approval/escalation
language, and fleet-watchdog evidence-tool requirements.

To generate a JSON payload that can be mirrored into `Test Reports [OS]`:

```bash
pnpm agent:halfdozen:governance-eval -- --output .cache/halfdozen-agent-governance-eval.json
```

The output includes a `notion_test_report` object so the execution target can be
swapped from the coded runner to Notion's beta API without changing the report
shape.

You can still override any scenario default:

```bash
pnpm agent:halfdozen:smoke \
  --scenario dedup \
  --model gpt-5.5 \
  --query "Only generate candidate clusters and escalation artifacts." \
  --max-turns 6
```

## Quick Non-Scenario Run

```bash
pnpm agent:halfdozen:smoke --servers telemetry --query "Review fleet health for the last 24h"
```

## Available Server Keys

```bash
pnpm agent:halfdozen:smoke --list-servers
```

## Output

The script returns JSON with:

- selected scenario (if any)
- linked contract bundle paths (if scenario is used)
- blocked tools enforced from scenario policy
- required tools expected by scenario policy
- required tool coverage (called vs successful completion)
- failed required tool call summaries (status + output excerpt)
- connected MCP servers
- failed MCP connections (if any)
- tool calls made by the agent
- final model output

Scenario presets also apply contract-aligned blocked tool filters (for example, `cleanup` is blocked in `fleet-watchdog`).

## Notes on Multi-Server Tool Names

When multiple MCP servers are selected, the script blocks generic tool names that commonly collide across servers:

- `search`
- `fetch`
- `submit_feedback`

This avoids duplicate-name failures in Agents SDK tool registration. Server-specific tools remain available.

## References

- OpenAI Agents SDK TypeScript: [openai.github.io/openai-agents-js](https://openai.github.io/openai-agents-js/)
- MCP guide: [openai.github.io/openai-agents-js/guides/mcp](https://openai.github.io/openai-agents-js/guides/mcp/)

## Troubleshooting

- `401 Your authentication token is not from a valid issuer.`  
  Your `OPENAI_API_KEY` is not valid for OpenAI APIs. Replace it with a current key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and retry.
