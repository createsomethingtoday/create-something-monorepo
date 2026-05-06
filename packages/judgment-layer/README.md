# Judgment Layer (Prototype)

Thin "cockpit" on top of `codex app-server`:

- **Judgment**: selectable policy pack (prompts + sandbox + approval/gating defaults)
- **Automation**: Codex executes tools/commands/file changes
- **Database**: policy packs + checks + Andon logs persisted as local artifacts

This is intentionally lightweight: a small CLI plus a simple policy format.

## What This Is (Three-Tier Framework)

- **Database tier**: `.judgment/policies/*.toml` (tracked) + `.judgment/andon.jsonl` (local JSONL audit trail)
- **Database tier**: `.judgment/checks.toml` (tracked monitoring rules)
- **Automation tier**: `codex app-server` runs turns, tools, commands, and applies diffs
- **Judgment tier**: the operator selects a policy pack (sandbox posture + approval posture + “when to stop”)

## Install / Run (local)

From the monorepo root:

```bash
pnpm --filter @create-something/judgment-layer build
node packages/judgment-layer/dist/cli.js --help
```

Or via bin:

```bash
pnpm --filter @create-something/judgment-layer build
pnpm exec cs-judge --help
```

## Quick start

```bash
cs-judge init
cs-judge policies
cs-judge run --policy standard --prompt "Summarize this repo."
cs-judge route --task "Coordinate 6 teams to migrate 3000 contracts" --requires-tools --stakeholders 8 --duration 720 --risk high --criticality medium --code-task
cs-judge check --policy standard
cs-judge watch --interval 300 --policy standard
```

## Dogfood Mode (OpenAI + CREATE SOMETHING)

Use a two-lane loop:

1. Run an OpenAI-backed scenario for evidence generation.
2. Run `cs-judge` for policy/approval/Andon decisions.

```bash
# Lane 1: OpenAI scenario (reasoning + MCP evidence)
pnpm agent:halfdozen:fleet-watchdog

# Lane 2: CREATE SOMETHING Judgment Layer (policy control)
cs-judge run --policy standard --prompt "Evaluate the scenario output against policy and emit one Andon object if uncertain."
cs-judge andon --tail 20
```

Full playbook:
`../../docs/guides/JUDGMENT_LAYER_DOGFOOD_PLAYBOOK.md`

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `packages/judgment-layer/src/cli.ts`, `packages/judgment-layer/src/policy/load.ts`, `packages/judgment-layer/src/checks/eval.ts` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | TypeScript check output, node test output, generated policy packs, Andon JSONL entries |
| UI validation path | none |
| Escalation rule | stop if a policy decision, approval posture, or Andon record cannot be traced to a policy artifact or explicit operator choice |

## Operator Flags (Lightweight Defaults)

- `--mcp minimal|inherit`: defaults to `minimal` to avoid optional MCP OAuth/auth breaking runs.
- For `check` and `watch`, default is `inherit` unless explicitly overridden.
- `--stream`: stream the agent message as it arrives (less “wait then dump”).
- `--verbose`: prints commands/file-change lifecycle events (for debugging).
- `--non-interactive`: never prompt; falls back to `policy.non_interactive_decision`.
- `route`: calls Hub MCP `hub_route_problem` and prints bottleneck-axis classification + staged routing plan.

## Andon

Andon records are written to `.judgment/andon.jsonl` when approvals are requested (and when unexpected failures occur).

View recent Andon entries:

```bash
cs-judge andon --tail 20
```

## Tuneability

Policies are plain TOML. Edit `.judgment/policies/*.toml` to adjust:

- sandbox posture (readOnly / workspaceWrite / dangerFullAccess)
- approval posture (untrusted / on-failure / on-request / never)
- auto-approve rules (command action types, regex, file path prefixes)

For some command approvals, Codex can propose an `execpolicy` amendment. In interactive mode, `cs-judge` will offer `p=accept+amend` when available.

## Monitoring checks (`.judgment/checks.toml`)

Minimal abstraction:
1. Fetch from one MCP tool
2. Extract one value from a dot-path
3. Compare against one deterministic target
4. Emit alert + optional suggestions

Example:

```toml
[[checks]]
id = "example_signal_low"
description = "Trigger when signal falls below target"
enabled = true
server = "notion"
tool = "query_database"
args_json = "{\"database_id\":\"abc123\"}"
value_path = "results.0.properties.Score.number"
operator = "lt" # lt | lte | gt | gte | eq | neq
target = 50
severity = "high" # low | medium | high | critical
cooldown_minutes = 60
notify_channel = "console"
suggestion_prompt = "Suggest three actions for this week."
allow_auto_write = false
```

Commands:

```bash
cs-judge check [--check <id>] [--policy <id>] [--mcp inherit]
cs-judge watch [--check <id>] [--interval <seconds>] [--policy <id>] [--mcp inherit]
```
