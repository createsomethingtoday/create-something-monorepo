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
