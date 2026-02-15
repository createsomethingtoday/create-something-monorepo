# Judgment Layer (Prototype)

Thin "cockpit" on top of `codex app-server`:

- **Judgment**: selectable policy pack (prompts + sandbox + approval/gating defaults)
- **Automation**: Codex executes tools/commands/file changes
- **Database**: policy packs + Andon logs persisted as local artifacts

This is intentionally lightweight: a small CLI plus a simple policy format.

## What This Is (Three-Tier Framework)

- **Database tier**: `.judgment/policies/*.toml` (tracked) + `.judgment/andon.jsonl` (local JSONL audit trail)
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
```

## Operator Flags (Lightweight Defaults)

- `--mcp minimal|inherit`: defaults to `minimal` to avoid optional MCP OAuth/auth breaking runs.
- `--stream`: stream the agent message as it arrives (less “wait then dump”).
- `--verbose`: prints commands/file-change lifecycle events (for debugging).
- `--non-interactive`: never prompt; falls back to `policy.non_interactive_decision`.

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
