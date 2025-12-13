---
title: "WezTerm: The Creative Terminal"
slug: "wezterm-workflow"
category: "partnership"
order: 3
duration: "25 minutes"
objectives:
  - Understand WezTerm as a creative environment, not just a command executor
  - Learn the complementarity between Claude Code and WezTerm
  - Master essential keybindings and workspace patterns
  - Apply Subtractive Triad principles to terminal configuration
prerequisites:
  - "claude-code-partnership"
  - "complementarity-principle"
---

# WezTerm: The Creative Terminal

## The Principle: Terminal as Creative Environment

The terminal is not a command executor. It's a **creative environment**—a space where you observe, experiment, and verify. The difference is ontological:

- **Command executor**: You type, it responds, you type again
- **Creative environment**: You dwell, observe patterns, shape workflows

WezTerm embodies this shift. Where traditional terminals present themselves as utilities, WezTerm recedes into **ready-to-hand** (Zuhandenheit) use—the hammer that disappears when hammering.

---

## Why WezTerm?

### GPU-Accelerated Rendering
Smooth scrolling through logs, instant search highlighting, fluid animations. The interface never interrupts the thought.

### Lua Configuration (Programmable)
Your terminal adapts to your work. Keybindings, colors, and behaviors become expressions of your creative process.

```lua
-- wezterm.lua
local wezterm = require 'wezterm'
local config = {}

-- Canon color palette
config.colors = {
  foreground = '#ffffff',
  background = '#000000',
  cursor_bg = '#ffffff',
  cursor_border = '#ffffff',
  selection_bg = 'rgba(255, 255, 255, 0.1)',
  selection_fg = 'none',

  ansi = {
    '#000000',  -- black
    '#cc4444',  -- red (error)
    '#44aa44',  -- green (success)
    '#aa8844',  -- yellow (warning)
    '#4477aa',  -- blue (info)
    '#aa44aa',  -- magenta
    '#44aaaa',  -- cyan
    '#aaaaaa',  -- white
  },

  brights = {
    '#666666',  -- bright black
    '#ff6666',  -- bright red
    '#66cc66',  -- bright green
    '#ccaa66',  -- bright yellow
    '#6699cc',  -- bright blue
    '#cc66cc',  -- bright magenta
    '#66cccc',  -- bright cyan
    '#ffffff',  -- bright white
  },
}

return config
```

### Multiplexing Built-In
Tabs, panes, workspaces—all native. No tmux layer, no abstraction penalty. The tool recedes.

### Cross-Platform Consistency
macOS, Linux, Windows—identical behavior. Your muscle memory transfers.

---

## The Complementarity with Claude Code

**Canon Principle**: Tools should complement, not compete. Each recedes when the other is ready-to-hand.

| Claude Code (You) | WezTerm (User) |
|-------------------|----------------|
| Write code | Monitor logs |
| Deploy to production | Verify deployment |
| Run migrations | Check database state |
| Execute tests | Debug failing tests interactively |
| Plan architecture | Observe runtime behavior |
| Refactor | Run performance benchmarks |

### The Partnership Pattern

1. **Claude Code deploys** → WezTerm monitors logs
   ```bash
   # Claude Code executes
   wrangler pages deploy packages/space/.svelte-kit/cloudflare --project-name=create-something-space

   # User monitors in WezTerm
   wrangler pages deployment tail --project-name=create-something-space
   ```

2. **Claude Code writes tests** → WezTerm runs them interactively
   ```bash
   # Claude Code writes test file
   # User runs with watch mode in WezTerm
   pnpm --filter=space test --watch
   ```

3. **Claude Code suggests** → Human verifies in WezTerm
   ```bash
   # Claude Code: "I've updated the migration"
   # User verifies schema in WezTerm
   wrangler d1 execute DB_NAME --command "SELECT sql FROM sqlite_master WHERE type='table'"
   ```

**The Boundary**: Claude Code handles the **creation cycle**. WezTerm handles the **observation cycle**. Neither invades the other's domain.

---

## Configuration Philosophy

### 1. Keybindings That Follow Muscle Memory

Vim users expect `h/j/k/l`. Emacs users expect `C-a/C-e`. Your terminal should adapt.

```lua
config.keys = {
  -- Tab navigation (Cmd+number on macOS)
  { key = '1', mods = 'CMD', action = wezterm.action.ActivateTab(0) },
  { key = '2', mods = 'CMD', action = wezterm.action.ActivateTab(1) },
  { key = '3', mods = 'CMD', action = wezterm.action.ActivateTab(2) },

  -- Pane navigation (Vim-style)
  { key = 'h', mods = 'CMD', action = wezterm.action.ActivatePaneDirection 'Left' },
  { key = 'j', mods = 'CMD', action = wezterm.action.ActivatePaneDirection 'Down' },
  { key = 'k', mods = 'CMD', action = wezterm.action.ActivatePaneDirection 'Up' },
  { key = 'l', mods = 'CMD', action = wezterm.action.ActivatePaneDirection 'Right' },

  -- Pane splitting
  { key = '|', mods = 'CMD|SHIFT', action = wezterm.action.SplitHorizontal { domain = 'CurrentPaneDomain' } },
  { key = '_', mods = 'CMD|SHIFT', action = wezterm.action.SplitVertical { domain = 'CurrentPaneDomain' } },

  -- Search scrollback
  { key = '/', mods = 'CMD', action = wezterm.action.Search 'CurrentSelectionOrEmptyString' },
}
```

### 2. Colors Aligned with Canon Tokens

Terminal colors should match your editor, your site, your design system. Semantic consistency across contexts.

| Terminal Color | Canon Token | Use |
|----------------|-------------|-----|
| `foreground` | `--color-fg-primary` | Primary text |
| `background` | `--color-bg-pure` | Terminal background |
| `ansi[1]` (red) | `--color-error` | Error messages |
| `ansi[2]` (green) | `--color-success` | Success messages |
| `ansi[3]` (yellow) | `--color-warning` | Warnings |
| `ansi[4]` (blue) | `--color-info` | Info messages |
| `selection_bg` | `--color-active` | Selected text |

### 3. Minimal Chrome, Maximum Content

Remove title bars, decorations, distractions. Only the content remains.

```lua
-- Minimal window chrome
config.window_decorations = "RESIZE"
config.enable_tab_bar = true
config.hide_tab_bar_if_only_one_tab = true
config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = true

-- Subtle tab styling
config.window_frame = {
  font = wezterm.font { family = 'JetBrains Mono', weight = 'Bold' },
  font_size = 11.0,
  active_titlebar_bg = '#0a0a0a',
  inactive_titlebar_bg = '#000000',
}

-- Padding for breathing room
config.window_padding = {
  left = '0.5cell',
  right = '0.5cell',
  top = '0.25cell',
  bottom = '0.25cell',
}
```

---

## Workspace Patterns

### Tab Organization for Different Contexts

Each tab represents a **mode of attention**:

```
Tab 1: Primary Development
  ├─ Pane 1: Main work (git status, file ops)
  └─ Pane 2: Test runner (watch mode)

Tab 2: Monitoring
  ├─ Pane 1: Application logs
  └─ Pane 2: Database queries

Tab 3: Email (Neomutt)
  └─ Pane 1: Full-screen mail client

Tab 4: Tasks (Taskwarrior)
  └─ Pane 1: Task list and capture
```

**Principle**: Each tab is a **context**, not a command. You switch between modes of work, not between commands.

### Pane Layouts for Monitoring

Split panes for **simultaneous observation**:

```
┌─────────────────┬─────────────────┐
│                 │                 │
│   Main Work     │   Test Output   │
│   (commands)    │   (watch mode)  │
│                 │                 │
├─────────────────┴─────────────────┤
│                                   │
│   Application Logs                │
│   (wrangler tail)                 │
│                                   │
└───────────────────────────────────┘
```

**Pattern**: Top panes for **action**, bottom pane for **observation**.

### Quick Navigation Shortcuts

```lua
-- Workspace switching (like i3/Sway)
config.keys = {
  { key = '1', mods = 'ALT', action = wezterm.action.SwitchToWorkspace { name = 'dev' } },
  { key = '2', mods = 'ALT', action = wezterm.action.SwitchToWorkspace { name = 'monitor' } },
  { key = '3', mods = 'ALT', action = wezterm.action.SwitchToWorkspace { name = 'mail' } },
  { key = '4', mods = 'ALT', action = wezterm.action.SwitchToWorkspace { name = 'tasks' } },

  -- Show workspace launcher
  { key = 'w', mods = 'CMD', action = wezterm.action.ShowLauncherArgs { flags = 'WORKSPACES' } },
}
```

---

## Integration Patterns

### 1. Claude Code Deploys → WezTerm Monitors Logs

**Workflow**:
1. Claude Code: `wrangler pages deploy ...`
2. User switches to WezTerm monitoring tab
3. User runs: `wrangler pages deployment tail`
4. User observes logs in real-time
5. User reports errors back to Claude Code

**Why**: Deployment is automated. Verification is observed. The boundary is clean.

### 2. Claude Code Writes → WezTerm Runs Tests Interactively

**Workflow**:
1. Claude Code writes test file
2. User runs in WezTerm: `pnpm test --watch`
3. Tests fail → User copies error to Claude Code
4. Claude Code fixes → Tests auto-rerun in WezTerm
5. Loop until green

**Why**: Test writing is creation. Test observation is verification. Each tool in its domain.

### 3. Claude Code Suggests → Human Verifies in WezTerm

**Workflow**:
1. Claude Code: "I've added a new migration"
2. User in WezTerm: `wrangler d1 migrations list DB_NAME`
3. User verifies migration status
4. User: "Apply it"
5. Claude Code: `wrangler d1 migrations apply DB_NAME`

**Why**: Trust, but verify. Claude Code proposes, human confirms, Claude Code executes.

---

## Essential Keybindings

### Tab/Pane Management

| Keybinding | Action |
|------------|--------|
| `Cmd+T` | New tab |
| `Cmd+W` | Close tab |
| `Cmd+1-9` | Switch to tab N |
| `Cmd+Shift+[` / `Cmd+Shift+]` | Previous/Next tab |
| `Cmd+Shift+\|` | Split horizontal |
| `Cmd+Shift+_` | Split vertical |
| `Cmd+H/J/K/L` | Navigate panes (Vim) |
| `Cmd+Shift+H/J/K/L` | Resize panes |
| `Cmd+Z` | Toggle pane zoom |

### Scrollback and Search

| Keybinding | Action |
|------------|--------|
| `Cmd+K` | Clear scrollback |
| `Cmd+/` | Search scrollback |
| `Cmd+F` | Find (interactive search) |
| `Cmd+UpArrow` / `Cmd+DownArrow` | Scroll by line |
| `Cmd+PageUp` / `Cmd+PageDown` | Scroll by page |

### Quick Commands

| Keybinding | Action |
|------------|--------|
| `Cmd+Shift+P` | Command palette |
| `Cmd+W` (double-tap) | Show workspace launcher |
| `Cmd+R` | Reload configuration |
| `Cmd+Shift+C` | Copy selection |
| `Cmd+Shift+V` | Paste |

---

## The Subtractive Terminal

**Weniger, aber besser**: Less, but better.

### What to Remove

1. **Title bar decorations** → Use window manager's native chrome
2. **Fancy tab styling** → Simple text, subtle highlight
3. **Status bars** → Only show when necessary
4. **Excessive padding** → Breathing room, not emptiness
5. **Unused keybindings** → Only what you actually use

### What to Keep

1. **Semantic colors** → Errors are red, success is green
2. **Fast search** → Find anything instantly
3. **Multiplexing** → Tabs and panes for context
4. **Smooth rendering** → Never interrupt the thought
5. **Programmability** → Adapt to your workflow

### The Configuration as Canon

```lua
-- Subtractive terminal configuration
local wezterm = require 'wezterm'
local config = {}

-- Typography: JetBrains Mono (clear, functional)
config.font = wezterm.font 'JetBrains Mono'
config.font_size = 13.0
config.line_height = 1.2

-- Colors: Canon palette
config.colors = {
  foreground = '#ffffff',
  background = '#000000',
  cursor_bg = '#ffffff',
  cursor_border = '#ffffff',
  selection_bg = 'rgba(255, 255, 255, 0.1)',
  selection_fg = 'none',

  ansi = {
    '#000000', '#cc4444', '#44aa44', '#aa8844',
    '#4477aa', '#aa44aa', '#44aaaa', '#aaaaaa',
  },

  brights = {
    '#666666', '#ff6666', '#66cc66', '#ccaa66',
    '#6699cc', '#cc66cc', '#66cccc', '#ffffff',
  },
}

-- Chrome: Minimal
config.window_decorations = "RESIZE"
config.enable_tab_bar = true
config.hide_tab_bar_if_only_one_tab = true
config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = true

-- Padding: Subtle
config.window_padding = {
  left = '0.5cell',
  right = '0.5cell',
  top = '0.25cell',
  bottom = '0.25cell',
}

-- Performance: GPU-accelerated
config.front_end = "WebGpu"
config.max_fps = 120

-- Scrollback: Generous
config.scrollback_lines = 10000

return config
```

---

## Case Study: Deployment Workflow

**Scenario**: Deploy a SvelteKit app to Cloudflare Pages

### Before WezTerm Partnership

1. Claude Code: Writes code
2. Claude Code: Runs `wrangler pages deploy`
3. Claude Code: Attempts to parse logs
4. User: "Is it live?"
5. Claude Code: "The command succeeded" (but did it?)

**Problem**: Claude Code can execute but cannot observe runtime behavior.

### With WezTerm Partnership

**Tab 1: Development** (Claude Code's domain)
```bash
# Claude Code writes code, runs build
pnpm --filter=space build
```

**Tab 2: Deployment** (Claude Code's domain)
```bash
# Claude Code deploys
wrangler pages deploy packages/space/.svelte-kit/cloudflare --project-name=create-something-space
```

**Tab 3: Monitoring** (User's domain)
```bash
# User monitors logs in real-time
wrangler pages deployment tail --project-name=create-something-space

# User sees actual requests, errors, performance
[2025-12-13 10:30:45] GET / → 200 (125ms)
[2025-12-13 10:30:46] GET /experiments → 200 (89ms)
[2025-12-13 10:30:47] POST /api/newsletter → 500 (error: missing API key)
```

**User to Claude Code**: "Newsletter API is failing—missing API key"

**Claude Code**: Checks environment variables, adds to wrangler.toml, redeploys

**User**: Verifies fix in logs → "Working now, 200 responses"

**Result**: Each tool in its domain. Claude Code creates, user observes, both recede.

---

## Reflection Questions

1. **Zuhandenheit vs. Vorhandenheit**: When does your terminal become **present-at-hand** (you notice it) instead of **ready-to-hand** (transparent use)? What configuration would make it recede?

2. **Complementarity**: Where do you currently duplicate effort between Claude Code and your terminal? Which tasks should migrate to which tool?

3. **Context vs. Commands**: Are your terminal tabs organized by **context** (development, monitoring, email) or by **commands** (git, npm, wrangler)? Which reveals the structure of your work?

4. **Subtractive Configuration**: What decorations, plugins, or features have you added to your terminal? Which ones do you actually use? What would happen if you removed the rest?

5. **Observation Cycles**: When Claude Code deploys something, how do you verify it worked? Could a dedicated monitoring pane make that verification **ready-to-hand**?

---

## Next Steps

1. Install WezTerm: [wezfurlong.org/wezterm](https://wezfurlong.org/wezterm/)
2. Copy the Subtractive configuration above
3. Create 3 workspaces: `dev`, `monitor`, `mail`
4. Practice the deployment workflow case study
5. Observe when the terminal becomes **present-at-hand**
6. Remove what doesn't earn its existence

**Canon Principle**: The terminal should disappear. Only the work remains.

---

**Duration**: 25 minutes
**Next Lesson**: [Terminal Tools: Neomutt & Taskwarrior](./terminal-tools)
