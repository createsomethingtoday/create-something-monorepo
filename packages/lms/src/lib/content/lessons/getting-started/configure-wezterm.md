---
title: Configure WezTerm
description: Use Claude Code to apply Canon config.
duration: 20 min
praxis: wezterm-setup
---

# Configure WezTerm

Now for the interesting part: using Claude Code to configure the tool you're using. This is meta-learning—the bootstrap sequence where tools configure tools.

## What We're Configuring

The CREATE SOMETHING Canon defines how tools should look and feel:

1. **Colors**: Pure black background, white foreground with opacity hierarchy
2. **Keybindings**: Vim-native grammar (h/j/k/l navigation)
3. **Chrome**: Minimal—tabs at bottom, no unnecessary decoration
4. **Performance**: GPU-accelerated, 120 FPS

When configured correctly, the terminal disappears. You stop seeing WezTerm; you see your work.

## The Configuration Files

WezTerm uses Lua configuration. The Canon config includes:

```
~/.config/wezterm/
├── wezterm.lua      # Main config (entry point)
├── colors/
│   └── canon.lua    # Color palette
└── keys.lua         # Keybinding definitions
```

## Using Claude Code to Configure

This is the first real use of your Claude Code partnership. Open WezTerm, navigate to a project (any project), and start Claude Code:

```bash
claude
```

Then use the praxis prompt to have Claude Code walk you through configuration.

## Key Keybindings

After configuration, you'll have vim-native navigation:

### Pane Navigation
| Key | Action |
|-----|--------|
| `Cmd/Ctrl + h` | Move to left pane |
| `Cmd/Ctrl + j` | Move to down pane |
| `Cmd/Ctrl + k` | Move to up pane |
| `Cmd/Ctrl + l` | Move to right pane |

### Pane Splitting
| Key | Action |
|-----|--------|
| `Cmd/Ctrl + \|` | Split vertical |
| `Cmd/Ctrl + -` | Split horizontal |
| `Cmd/Ctrl + z` | Toggle zoom |

### Copy Mode (vim-style)
| Key | Action |
|-----|--------|
| `Cmd/Ctrl + v` | Enter copy mode |
| `v` | Start selection |
| `y` | Yank (copy) |

## The Canon Color Palette

Colors map to semantic meaning:

| Purpose | Color | Hex |
|---------|-------|-----|
| Background | Pure black | `#000000` |
| Primary text | White | `#ffffff` |
| Secondary text | 80% white | `#cccccc` |
| Muted text | 40% white | `#666666` |
| Error | Red | `#cc4444` |
| Success | Green | `#44aa44` |
| Warning | Yellow | `#aa8844` |
| Info | Blue | `#4477aa` |

## Verifying Configuration

After applying config:

1. **Restart WezTerm** (or `Cmd/Ctrl + Shift + R` to reload)
2. **Check colors**: Background should be pure black
3. **Test keybindings**: Try `Cmd + -` to split, `Cmd + j/k` to navigate
4. **Enter copy mode**: `Cmd + v`, then vim navigation

If something doesn't work, Claude Code can help debug.

## Philosophy Note

Notice what just happened: you used Claude Code (running in WezTerm) to configure WezTerm. The tool helped configure itself.

This recursive pattern is intentional. Learning happens through use. Understanding emerges through practice.

## Next Step

With WezTerm configured, you're working in a Canon-compliant environment. Next: Beads for agent-native task tracking.

---

## See Also

- [Dotfiles Conventions](/.claude/rules/dotfiles-conventions.md) — Terminal tooling philosophy, keybinding grammar, and color conventions

---

*Complete the praxis exercise to apply the Canon configuration.*
