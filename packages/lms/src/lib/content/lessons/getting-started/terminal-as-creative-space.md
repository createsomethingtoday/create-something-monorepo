---
title: Your Terminal as Creative Space
description: Why terminal-first development creates conditions for focused creation.
duration: 15 min
praxis: terminal-canon-setup
---

# Your Terminal as Creative Space

Before installing anything, understand what we're building toward: a creative environment where tools disappear into use.

## The Philosophy: Zuhandenheit

Martin Heidegger distinguished between two ways of engaging with tools:

**Vorhandenheit** (present-at-hand): You notice the tool. You think about the tool. The hammer becomes an object of study rather than something you hammer with.

**Zuhandenheit** (ready-to-hand): The tool disappears. You don't think "I am using a hammer"—you think about the nail. The tool recedes into transparent use.

When your terminal is *ready-to-hand*, you don't see WezTerm—you see your code, your work, your creation.

## Why Terminal-First?

Most developers live in IDEs. IDEs are powerful, but they're also *present-at-hand*—they demand attention with panels, buttons, notifications.

Terminal-first development inverts this:

| IDE Pattern | Terminal Pattern |
|-------------|------------------|
| Mouse-driven | Keyboard-driven |
| Visual discovery | Command memory |
| Constant chrome | Minimal surface |
| Tools visible | Tools invisible |

The terminal is a **blank canvas**. It shows exactly what you need and nothing more. With practice, it becomes an extension of thought rather than a mediator.

## What We're Installing

**WezTerm** is a GPU-accelerated terminal emulator configured with Lua scripts. We chose it because:

1. **Speed**: GPU rendering means instant response—no lag between thought and action
2. **Configurability**: Lua scripts give full control, not opaque preference panes
3. **Cross-platform**: macOS, Linux, Windows
4. **Built-in multiplexing**: Splits and tabs without tmux complexity

Most importantly: WezTerm *can* disappear. It has no design opinions that fight against minimalism.

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

Open WezTerm. You should see:

- A terminal window with default colors
- Clean, readable text
- A blinking cursor waiting for input

If it opens, you've completed the first step.

## Basic Configuration

WezTerm reads configuration from `~/.wezterm.lua`. Let's create a minimal Canon-aligned configuration.

Create the file:

```bash
touch ~/.wezterm.lua
```

Add this starter configuration:

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()

-- Canon colors: pure black background, white foreground
config.colors = {
  background = '#000000',
  foreground = '#ffffff',
  cursor_bg = '#ffffff',
  cursor_fg = '#000000',
  selection_bg = '#ffffff',
  selection_fg = '#000000',
}

-- Minimal chrome
config.enable_tab_bar = false
config.window_decorations = 'RESIZE'
config.window_padding = {
  left = 12,
  right = 12,
  top = 12,
  bottom = 12,
}

-- Performance
config.animation_fps = 120
config.max_fps = 120

-- Font (use your preferred mono font)
config.font = wezterm.font('JetBrains Mono', { weight = 'Regular' })
config.font_size = 14.0

return config
```

Save the file and restart WezTerm. The terminal should now have:

- Pure black background
- White text
- No tab bar
- Clean window borders

## Default Keybindings

WezTerm's defaults work well for now:

| Key | Action |
|-----|--------|
| `Cmd+T` / `Ctrl+Shift+T` | New tab |
| `Cmd+D` / `Ctrl+Shift+D` | Split pane |
| `Cmd+W` / `Ctrl+Shift+W` | Close pane/tab |
| `Cmd+[` / `Alt+[` | Previous pane |
| `Cmd+]` / `Alt+]` | Next pane |

We'll add vim-native keybindings later when Claude Code helps with full configuration.

## The Blank Canvas

Look at your terminal now. Black background. White text. Nothing else.

This is intentional. Every pixel of chrome is a pixel of distraction. Every button is a decision point. Every panel competes for attention.

The blank canvas creates *space for thought*. You'll fill it with code, with commands, with creation. But the canvas itself remains invisible.

This is Zuhandenheit in practice.

## What's Next

With WezTerm installed and basically configured, you're ready for the next step: installing Claude Code.

Claude Code runs *in* this terminal. Together, they form your development environment. But notice: the terminal isn't the point. The terminal is the medium through which you work. When it's right, you forget it exists.

---

## Reflection

Before moving on, sit with your new terminal for a moment:

1. What do you notice about the blank black screen?
2. How does it feel compared to your previous development environment?
3. What's missing that you expected to see?

The absence is the design. *Weniger, aber besser.*

---

*Complete the praxis exercise to fully configure WezTerm with Canon colors and vim keybindings.*
