# @create-something/dotfiles

Canon-compliant terminal tooling configuration.

## Philosophy

Terminal tooling follows the Subtractive Triad:
- **DRY**: Unified patterns across tools, consistent keybinding grammar
- **Rams**: Only configuration that earns its existence
- **Heidegger**: Tools recede into use (Zuhandenheit)

## Contents

### .pi/ (repo root)

Canonical Pi workflow resources live at the repository root:
- `.pi/settings.json` - project Pi defaults
- `.pi/skills/` - canonical repo-owned workflow skills
- `.pi/prompts/` - lane prompts and startup context
- `scripts/pi/` - lane runners and diagnostics

### claude-code/ (compatibility only)

Claude Code settings and templates for legacy compatibility:
- `settings.json` - MCP servers, permissions, custom instructions
- `mcp-templates/` - Pre-configured MCP server configs (Slack, Linear, Stripe, etc.)
- `harness-templates/` - Legacy Claude plus Beads work templates

### codex/

Compatibility-only Codex assets:
- `skills/` - CREATE SOMETHING Codex skills and guardrails
- `README.md` - installation and usage notes for Codex compatibility skills

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

### zen/

Zen Browser (Firefox-based) configuration:
- Glass Design System applied to browser chrome
- Performance, privacy, and memory tuning (based on Better Zen)
- Dark treatment for internal browser pages

### nvim/

Neovim configuration (Canon-aligned).

## Installation

```bash
pnpm --filter=dotfiles install-dotfiles
```

This installs the shared terminal tooling, but it no longer auto-installs the Codex compatibility layer.

For repo agent work, verify the Pi path separately from the repo root:

```bash
pnpm pi:doctor
```

To install only the compatibility Codex skills:

```bash
pnpm --filter @create-something/dotfiles install-codex-skills
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

- `docs/guides/PI_WORKFLOW.md` - Pi-first repo workflow
- `.claude/rules/dotfiles-conventions.md` - Compatibility and historical conventions reference
- `.claude/rules/neomutt-patterns.md` - Compatibility and historical email configuration reference
