# @create-something/dotfiles

Canon-compliant terminal tooling configuration.

## Philosophy

Terminal tooling follows the Subtractive Triad:
- **DRY**: Unified patterns across tools, consistent keybinding grammar
- **Rams**: Only configuration that earns its existence
- **Heidegger**: Tools recede into use (Zuhandenheit)

## Contents

### claude-code/

Claude Code settings and templates:
- `settings.json` - MCP servers, permissions, custom instructions
- `mcp-templates/` - Pre-configured MCP server configs (Slack, Linear, Stripe, etc.)
- `harness-templates/` - Multi-session work templates (feature, migration, refactor)

### wezterm/

Terminal emulator configuration:
- Canon color scheme
- Custom key bindings
- Tab and pane management

### beads/

Agent-native task management configuration. Beads replaces Taskwarrior for AI-agent workflows.

### neomutt/

Email client configuration with:
- Canon color scheme
- Vim keybinding grammar
- Multi-account support (Google Workspace)
- Folder hooks and signatures

### nvim/

Neovim configuration (Canon-aligned).

## Installation

```bash
pnpm --filter=dotfiles install-dotfiles
```

Or manually:

```bash
./scripts/install.sh
```

## Keybinding Grammar

Consistent across all tools:

| Key | Action |
|-----|--------|
| `j/k` | Navigate down/up |
| `h/l` | Back/Forward |
| `gg/G` | First/Last |
| `/` | Search |
| `g{letter}` | Goto operations |

## Related

- `.claude/rules/dotfiles-conventions.md` - Full conventions
- `.claude/rules/neomutt-patterns.md` - Email configuration details
