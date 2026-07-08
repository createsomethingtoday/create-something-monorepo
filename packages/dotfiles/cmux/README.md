# cmux Configuration

CREATE SOMETHING cmux configuration for exception cases where Codex drives a
Claude/Webflow-internal connector bridge session.

The primary CREATE SOMETHING operating model is operators driving Codex
directly. cmux is the cockpit for the other use cases, not the driver and not
the default agent surface. Codex drives a visible Claude worker inside cmux only
when the user's Webflow Claude agent has access to internal tools or browser
surfaces that Codex does not. Those may include Slack, Fivetran, Figma, Google,
Statsig, Datadog, Snowflake, Webflow product/admin surfaces, and similar
Webflow-owned systems.

cmux is not the repo source of truth, not a Linear replacement, and not the
default agent-completion authority. Codex or the operator makes the done
decision after repo, browser, connector, and Linear evidence are complete.

## Install

```bash
brew tap manaflow-ai/cmux
brew install --cask cmux
sudo ln -sf "/Applications/cmux.app/Contents/Resources/bin/cmux" /usr/local/bin/cmux
mkdir -p ~/.config/cmux
ln -sf ~/Code/create-something-monorepo/packages/dotfiles/cmux/cmux.json ~/.config/cmux/cmux.json
cmux hooks setup codex
```

Claude Code hooks are injected by the cmux Claude wrapper; launch Claude bridge
sessions from cmux with `cmux claude-teams ...` rather than installing a
separate `claude` hook target.

## Operator Checks

```bash
cmux ping
cmux capabilities --json
cmux list-workspaces --json
cmux identify --json
cmux sidebar-state --json
```

The repo config uses `automation.socketControlMode = "automation"` so local
tools running as this macOS user can inspect cmux over the socket. Do not switch
to `allowAll` / full open access for normal operator work.

## Ornith Codebase Loop

Use cmux for Codex-supervised local Ornith sessions when the goal is visible,
no-write codebase improvement discovery:

```bash
pnpm cmux:ornith
pnpm cmux:ornith -- --dry-run
```

This lane keeps Ornith behind `operator-agent` readiness, model-probe, and
bounded batch-eval receipts. It does not grant patch/revise authority. Use
[docs/guides/CMUX_ORNITH_CODEBASE_LOOP.md](../../../docs/guides/CMUX_ORNITH_CODEBASE_LOOP.md)
for the operating model and stop conditions.

## Style

The cmux chrome follows the CREATE SOMETHING terminal canon: pure black
surfaces, white foreground, gray dividers, and functional accents only.
Workspace colors map to the Database / Automation / Judgment operating model:
blue for Database, green for Automation, amber for Judgment, red for blocked,
and white for the CREATE SOMETHING repo group.

Use [docs/guides/CMUX_CLAUDE_WEBFLOW_BRIDGE.md](../../../docs/guides/CMUX_CLAUDE_WEBFLOW_BRIDGE.md)
as the authority for graduation and stop conditions.
