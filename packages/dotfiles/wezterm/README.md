# WezTerm Configuration

CREATE SOMETHING Canon configuration for WezTerm terminal emulator.

## Philosophy

The terminal recedes into use. Pure black background, white foreground with opacity hierarchy, vim-native keybindings. No decoration.

**Zuhandenheit**: When working, you shouldn't notice the terminal—only the work.

## Installation

### macOS

```bash
# Install WezTerm
brew install --cask wezterm

# Symlink config (from monorepo)
ln -sf ~/path/to/create-something-monorepo/packages/dotfiles/wezterm ~/.config/wezterm
```

### Linux

```bash
# Install WezTerm (Ubuntu/Debian)
curl -fsSL https://apt.fury.io/wez/gpg.key | sudo gpg --yes --dearmor -o /usr/share/keyrings/wezterm-fury.gpg
echo 'deb [signed-by=/usr/share/keyrings/wezterm-fury.gpg] https://apt.fury.io/wez/ * *' | sudo tee /etc/apt/sources.list.d/wezterm.list
sudo apt update && sudo apt install wezterm

# Symlink config
ln -sf ~/path/to/create-something-monorepo/packages/dotfiles/wezterm ~/.config/wezterm
```

### Using install.sh

```bash
cd packages/dotfiles
./scripts/install.sh
```

## Keybindings

### Pane Navigation (vim grammar)

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
| `Cmd/Ctrl + w` | Close pane |
| `Cmd/Ctrl + z` | Toggle pane zoom |

### Pane Resizing

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + Shift + H` | Resize left |
| `Cmd/Ctrl + Shift + J` | Resize down |
| `Cmd/Ctrl + Shift + K` | Resize up |
| `Cmd/Ctrl + Shift + L` | Resize right |

### Tab Management

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + t` | New tab |
| `Cmd/Ctrl + [` | Previous tab |
| `Cmd/Ctrl + ]` | Next tab |
| `Cmd/Ctrl + 1-9` | Go to tab N |

### Scrolling

| Key | Action |
|-----|--------|
| `Ctrl + d` | Scroll half-page down |
| `Ctrl + u` | Scroll half-page up |

### Copy Mode

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + v` | Enter copy mode |
| `v` | Start selection (in copy mode) |
| `V` | Line selection (in copy mode) |
| `y` | Yank and exit (in copy mode) |
| `q` or `Esc` | Exit copy mode |

### Other

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + /` | Search |
| `Cmd/Ctrl + p` | Command palette |
| `Cmd/Ctrl + f` | Toggle fullscreen |
| `Cmd/Ctrl + Shift + r` | Reload configuration |

## Color Palette

Canon-compliant colors from `colors/canon.lua`:

| Purpose | Color | Value |
|---------|-------|-------|
| Background | Pure black | `#000000` |
| Foreground | White | `#ffffff` |
| Secondary text | 80% white | `#cccccc` |
| Muted text | 40% white | `#666666` |
| Error | Red | `#cc4444` |
| Success | Green | `#44aa44` |
| Warning | Yellow | `#aa8844` |
| Info | Blue | `#4477aa` |

## Font

Default font stack (uses first available):
1. JetBrains Mono
2. SF Mono
3. Menlo

Install JetBrains Mono for best experience:
```bash
brew tap homebrew/cask-fonts
brew install --cask font-jetbrains-mono
```

## Files

```
wezterm/
├── wezterm.lua      # Main configuration (entry point)
├── colors/
│   └── canon.lua    # Canon color palette
├── keys.lua         # Keybinding definitions
└── README.md        # This file
```

## Customization

### Adding Keybindings

Edit `keys.lua` and add to the `keys` table:

```lua
{ key = 'x', mods = 'CMD', action = act.SomeAction },
```

### Changing Colors

Edit `colors/canon.lua`. Follow Canon token conventions.

### Per-machine Overrides

Create `~/.config/wezterm/local.lua` (gitignored):

```lua
-- local.lua
return {
	font_size = 16.0,  -- Larger on high-DPI display
}
```

Then in `wezterm.lua`, add:
```lua
local ok, local_config = pcall(require, 'local')
if ok then
	for k, v in pairs(local_config) do
		config[k] = v
	end
end
```

## Troubleshooting

### Configuration not loading

Check WezTerm is finding the config:
```bash
wezterm --config-dir ~/.config/wezterm
```

### Font not rendering

Ensure JetBrains Mono is installed:
```bash
fc-list | grep -i jetbrains
```

### Keybindings conflict with system

On macOS, some `Cmd` combinations are reserved. WezTerm respects these by default. Use `Ctrl` on Linux/Windows.
