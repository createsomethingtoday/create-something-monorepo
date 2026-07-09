# Herdr Configuration

CREATE SOMETHING agent multiplexer configuration for Herdr.

Zellij owns the visible agent cockpit. Herdr owns AI-agent sessions, panes, tabs,
workspaces, detach/reattach, and the agent control surface.

Use Herdr for Claude, Codex, Pi, logs, local servers, and smoke commands that
belong to the same operator loop. Do not auto-enter tmux inside Herdr panes for
agent work; Herdr detects the foreground process and should see `claude`,
`codex`, or the relevant agent command directly.

## Install

```bash
brew install herdr
mkdir -p ~/.config/herdr
ln -sf ~/Code/create-something-monorepo/packages/dotfiles/herdr/config.toml ~/.config/herdr/config.toml
herdr integration install claude
herdr integration install codex
```

## Daily Use

```bash
cd ~/Code/create-something-monorepo
herdr --session create-something
```

The shell config also provides:

```bash
herd
herdr-cs
herdr-status
```

## Agent Control Surface

Agents may inspect and manage Herdr through the CLI/socket API instead of
parsing terminal history by hand:

```bash
herdr status
herdr agent list
herdr pane read <target> --source recent-unwrapped
herdr wait agent-status <target> --status done
```

Herdr is a visibility and session-management layer. Linear remains the durable
source of truth for tracked work, ownership, and evidence.
