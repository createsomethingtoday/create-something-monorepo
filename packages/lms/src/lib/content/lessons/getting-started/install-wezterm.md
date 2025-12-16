---
title: Install WezTerm
description: Your terminal foundation—install it first.
duration: 10 min
---

# Install WezTerm

The terminal is where creation happens. Before Claude Code, before Beads, before anything else—you need a terminal that recedes into use.

## Why WezTerm?

WezTerm is a GPU-accelerated terminal emulator with Lua configuration. It matters because:

1. **Fast**: GPU rendering means instant response
2. **Configurable**: Lua scripts, not opaque preferences
3. **Cross-platform**: macOS, Linux, Windows
4. **Multiplexing**: Built-in tabs and splits (no tmux required)

Most importantly: it gets out of the way. The terminal disappears; your work remains.

## Installation

### macOS (Homebrew)

```bash
brew install --cask wezterm
```

### macOS (Direct Download)

Download from [wezfurlong.org/wezterm](https://wezfurlong.org/wezterm/install/macos.html)

### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://apt.fury.io/wez/gpg.key | sudo gpg --yes --dearmor -o /usr/share/keyrings/wezterm-fury.gpg
echo 'deb [signed-by=/usr/share/keyrings/wezterm-fury.gpg] https://apt.fury.io/wez/ * *' | sudo tee /etc/apt/sources.list.d/wezterm.list
sudo apt update && sudo apt install wezterm
```

### Linux (Flatpak)

```bash
flatpak install flathub org.wezfurlong.wezterm
```

### Windows

Download installer from [wezfurlong.org/wezterm](https://wezfurlong.org/wezterm/install/windows.html)

Or via winget:
```powershell
winget install wez.wezterm
```

## Verify Installation

Open WezTerm. You should see a terminal with:
- Black background
- Clean, readable text
- Minimal chrome

If it opens, you're ready for the next step.

## First Look

Take a moment to orient yourself:

| Key | Action |
|-----|--------|
| `Cmd+T` / `Ctrl+T` | New tab |
| `Cmd+D` / `Ctrl+Shift+-` | Split pane |
| `Cmd+W` / `Ctrl+Shift+W` | Close pane/tab |

These defaults will change when we apply Canon configuration. For now, just verify the terminal works.

## Philosophy Note

WezTerm is the foundation because everything else runs inside it. Claude Code will be installed here. Configuration will happen here. Your entire development environment lives in this terminal.

When the terminal is right, you don't think about it. You think about the code, the design, the problem. That's Zuhandenheit—ready-to-hand.

## Next Step

With WezTerm installed, you're ready to install Claude Code CLI. The terminal is your canvas; Claude Code is your partner.

---

*No praxis exercise for this lesson—installation is the praxis. Verify WezTerm opens, then continue.*
