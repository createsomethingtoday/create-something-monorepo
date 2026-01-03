# Dotfiles Conventions

## Philosophy

Terminal tooling follows the Subtractive Triad:
- **DRY**: Unified patterns across tools, consistent keybinding grammar
- **Rams**: Only configuration that earns its existence
- **Heidegger**: Tools recede into use—Zuhandenheit

## Structure

```
packages/dotfiles/
├── beads/
│   ├── config.yaml         # Beads configuration
│   └── README.md           # Usage patterns
├── neomutt/
│   ├── neomuttrc           # Entry point
│   ├── accounts/           # Per-account configs
│   ├── colors/             # Color schemes
│   ├── bindings/           # Keybinding modules
│   └── hooks/              # Folder/message hooks
├── scripts/
│   └── install.sh          # Symlink installer
└── package.json            # Monorepo integration
```

## Keybinding Grammar

Consistent across all tools:

| Key | Action |
|-----|--------|
| `j/k` | Navigate down/up |
| `h/l` | Back/Forward (or collapse/expand) |
| `gg/G` | First/Last |
| `Ctrl-d/u` | Half-page down/up |
| `/` | Search |
| `g{letter}` | Goto operations |

## Color Conventions

All tools use Canon palette:

| Semantic | Use | Color |
|----------|-----|-------|
| Primary | Active/selected | `color15` (white) |
| Secondary | Normal content | `color250` (80% white) |
| Tertiary | De-emphasized | `color245` (60% white) |
| Muted | Inactive/read | `color240` (40% white) |
| Border | Separators | `color236` (10% white) |
| Success | Completed/good | `color71` (#44aa44) |
| Error | Failed/urgent | `color167` (#cc4444) |
| Warning | Flagged/due | `color136` (#aa8844) |
| Info | Links/metadata | `color67` (#4477aa) |

## Neomutt Modules

### colors/canon.muttrc
Canon-compliant color scheme. Semantic color only.

### bindings/core.muttrc
Vim-native navigation. `g` prefix for goto operations.

### bindings/sidebar.muttrc
Ctrl-prefixed sidebar navigation.

### bindings/compose.muttrc
Minimal compose screen bindings.

### accounts/*.muttrc
Account-specific settings. Use `pass` for credentials.

### hooks/folder.muttrc
Context-specific settings per folder.

## Beads Conventions

Agent-native task management. The tool recedes; the work remains.

### Why Beads

Beads replaces Taskwarrior because the primary user changed: Claude Code agents need cross-session memory. Taskwarrior was designed for humans; Beads is designed for AI agents.

### Labels
- **Properties** (scope): `agency`, `io`, `space`, `ltd`
- **Types** (what): `feature`, `bug`, `research`, `refactor`
- **Priority**: Use `--priority P0-P4` (P0 = drop everything, P4 = maybe never)

### Workflow
```bash
# Session Start
bv --robot-priority    # Surface highest-impact work

# During Work
bd create "Task"       # Capture discovered work
bd dep add X blocks Y  # Record dependencies

# Session End
bd close X             # Mark completed
```

### Dependencies
```bash
bd dep add <X> blocks <Y>       # X must complete before Y
bd dep add <child> parent <P>   # Hierarchical
bd dep add <X> related <Y>      # Informational
```

### Robot Mode
Use `--robot-priority`, `--robot-insights`, `--robot-plan` for machine-readable output optimized for agent consumption.

## Installation

```bash
# From monorepo root
pnpm --filter=dotfiles install

# Or manually
cd packages/dotfiles
./scripts/install.sh
```

## Git Multi-Account SSH Configuration

Multiple GitHub accounts are configured via SSH host aliases:

| Host Alias | Account | SSH Key | Email |
|------------|---------|---------|-------|
| `github.com` | createsomethingtoday | `~/.ssh/id_ed25519_createsomething` | micah@createsomething.io |
| `github-halfdozen` | halfdozenco | `~/.ssh/id_ed25519` | mj@halfdozen.co |

### Switching Accounts

**Preferred method**: Use SSH host aliases in remote URLs.

```bash
# For createsomethingtoday repos
git remote set-url origin git@github.com:createsomethingtoday/repo-name.git

# For halfdozen repos
git remote set-url origin git@github-halfdozen:halfdozenco/repo-name.git
```

**Alternative**: Use `gh auth switch` for HTTPS remotes.

```bash
gh auth switch --user createsomethingtoday
gh auth switch --user halfdozenco
```

### Loading SSH Keys

If keys aren't loaded (after restart):

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_createsomething
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

### Verifying Configuration

```bash
ssh-add -l                    # List loaded keys
ssh -T git@github.com         # Test createsomethingtoday
ssh -T git@github-halfdozen   # Test halfdozenco
```

## Claude Code Integration

When modifying dotfiles:
1. Follow module structure—don't monolith
2. Comments explain *why*, not *what*
3. Test in isolation before installing
4. Update this document if conventions change

## tmux Patterns

tmux provides session persistence inside WezTerm for Gastown multi-agent orchestration.

### Philosophy

WezTerm handles rendering (Canon colors, GPU acceleration); tmux handles session management (detach, reattach, background processes). Together they enable persistent agent sessions.

### Configuration

Location: `packages/dotfiles/tmux/tmux.conf`

```bash
# Install
ln -sf /path/to/create-something-monorepo/packages/dotfiles/tmux/tmux.conf ~/.tmux.conf
```

### Keybinding Grammar

Matches WezTerm where possible:

| tmux Keys | WezTerm Equivalent | Action |
|-----------|-------------------|--------|
| `Ctrl-a d` | `Cmd+d` | Split horizontal |
| `Ctrl-a D` | `Cmd+Shift+d` | Split vertical |
| `Ctrl-a h/j/k/l` | `Cmd+Shift+h/j/k/l` | Navigate panes |
| `Alt+h/j/k/l` | — | Navigate panes (no prefix) |
| `Ctrl-a w` | `Cmd+w` | Close pane |
| `Ctrl-a t` | `Cmd+t` | New window |
| `Ctrl-a e` | `Cmd+Shift+e` | Rename window |
| `Ctrl-a K` | `Cmd+k` | Clear screen |

### Gastown Shortcuts

Quick attach to Gastown roles:

| Keys | Action |
|------|--------|
| `Ctrl-a g c` | Attach to Coordinator |
| `Ctrl-a g w` | Attach to Witness |
| `Ctrl-a g r` | Attach to Refinery |
| `Ctrl-a g s` | Session picker |

### Colors

Canon palette (pure black, pure white, muted accents):

| Element | Color |
|---------|-------|
| Background | `#000000` |
| Foreground | `#ffffff` |
| Inactive | `#666666` |
| Border | `#333333` |
| Active border | `#ffffff` |

### Clipboard Integration

tmux 3.2+ uses native clipboard support with pbcopy/pbpaste on macOS:

| Keys | Action |
|------|--------|
| `Ctrl-a [` | Enter copy mode |
| `v` (in copy mode) | Begin selection |
| `y` (in copy mode) | Copy to system clipboard |
| `Ctrl-a ]` | Paste from system clipboard |
| Mouse drag | Copy selection to clipboard |

**Paste app compatibility**: The clipboard integration uses `pbcopy` which writes to the system clipboard. The Paste app monitors this clipboard, so all tmux copies appear in Paste history.

**Troubleshooting**: If copy/paste stops working:
```bash
# Reload tmux config
tmux source-file ~/.tmux.conf

# Verify pbcopy works
echo "test" | pbcopy && pbpaste
```

### Session Management

```bash
# Start Gastown (creates tmux sessions)
gt start

# Attach to session
tmux attach -t gt-coordinator

# Detach (Ctrl-a z)
# Reattach later with same command

# List sessions
tmux list-sessions

# Kill session
tmux kill-session -t session-name
```

See [Gastown Patterns](./gastown-patterns.md) for full multi-agent documentation.

## Stripe CLI Patterns

Local webhook development and testing. The tool recedes; Stripe operations happen.

### Installation

```bash
brew install stripe/stripe-cli/stripe
stripe login  # Opens browser for auth
```

### Webhook Development

```bash
# Forward Stripe webhooks to local server
stripe listen --forward-to localhost:5173/api/stripe/webhook

# With event filtering (faster startup)
stripe listen --events checkout.session.completed,customer.subscription.updated \
  --forward-to localhost:5173/api/stripe/webhook
```

### Event Replay

```bash
# Replay a specific event (debugging)
stripe events resend evt_xxx

# List recent events
stripe events list --limit 10
```

### Testing Checkout

```bash
# Trigger test checkout.session.completed event
stripe trigger checkout.session.completed

# Trigger subscription events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### Useful Commands

| Command | Purpose |
|---------|---------|
| `stripe listen` | Forward webhooks locally |
| `stripe logs tail` | Real-time API logs |
| `stripe events list` | Recent webhook events |
| `stripe customers list` | List customers |
| `stripe subscriptions list` | List subscriptions |

## Stripe MCP Patterns

AI-assisted Stripe operations via Claude Code. Query production data without leaving the session.

### Configuration

Project-level `.mcp.json` (at monorepo root):
```json
{
  "mcpServers": {
    "stripe": {
      "type": "http",
      "url": "https://mcp.stripe.com"
    }
  }
}
```

### Usage Examples

Within Claude Code sessions:
- "List active subscriptions for vertical templates"
- "Show the last 5 failed webhook deliveries"
- "What's the status of customer cus_xxx?"
- "Find invoices for email@example.com"

### Security Notes

- Stripe MCP uses OAuth—authenticates via browser on first use
- Operations are logged in Stripe Dashboard
- Use test mode for experiments: prefix queries with "in test mode"

### CLI vs MCP

| Tool | Use Case |
|------|----------|
| CLI | Local webhook dev, event replay, testing checkout |
| MCP | Production queries, AI-assisted debugging, cross-property visibility |
