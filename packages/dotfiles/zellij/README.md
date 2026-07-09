# Zellij Configuration

CREATE SOMETHING uses Zellij as the default terminal/session substrate for
Codex-supervised visible workers.

Use it when a Claude, Ornith, local server, or log pane needs to stay visible and
Codex needs command-line read/send control. Codex remains the coordinator and
done authority.

## Install

```bash
brew install zellij
zellij --version
mkdir -p /tmp/zellij ~/.config/zellij
export ZELLIJ_SOCKET_DIR=/tmp/zellij
ln -sf ~/Code/create-something-monorepo/packages/dotfiles/zellij/config.kdl ~/.config/zellij/config.kdl
```

## Repo Launcher

```bash
pnpm zellij:agent -- --name claude-webflow --pane-name claude --command 'claude'
pnpm zellij:claude -- --name claude-webflow
pnpm zellij:workflow -- --issue CRE-123 --title "Debug visible worker lane"
pnpm zellij:board
pnpm zellij:board -- --watch
pnpm zellij:agent -- --dry-run
```

The launcher writes `.codex/zellij-agent-lanes.json` and prints the attach,
inspect, stream, send, board, and cleanup commands for the created session.

Use `pnpm zellij:workflow` when a Linear issue or explicit operator task should
become a prompt packet plus auditable lane commands. Dry-run is the default.
Each workflow packet carries autonomy level, authority, receipt contract,
rollback, and escalation fields because CREATE SOMETHING is agent-run with
receipts. Launching a pane, sending a prompt, and commenting back to Linear stay
explicit.

## Operator Checks

```bash
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij list-sessions --short --no-formatting
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij attach <session>
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij --session <session> action dump-screen --pane-id <pane-id> --full
ZELLIJ_SOCKET_DIR=/tmp/zellij zellij --session <session> subscribe --pane-id <pane-id> --format json --scrollback 200
```

Use [docs/guides/ZELLIJ_AGENT_COCKPIT.md](../../../docs/guides/ZELLIJ_AGENT_COCKPIT.md)
as the authority for the Zellij lane.
