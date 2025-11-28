# CREATE SOMETHING Terminal

Less, but better.

## Installation

### 1. Install dependencies

```bash
brew install --cask wezterm
brew install zoxide fzf eza fd
brew install --cask font-jetbrains-mono
```

### 2. Configure WezTerm

```bash
mkdir -p ~/.config/wezterm
cp wezterm.lua ~/.config/wezterm/wezterm.lua
```

### 3. Configure shell

```bash
cat shell-config.zsh >> ~/.zshrc
source ~/.zshrc
```

### 4. Update paths

Edit `~/.zshrc` and update:
- `PROJECTS_DIR` to your projects folder
- Bookmark aliases to your actual project paths

## Usage

| Command | Action |
|---------|--------|
| `z half` | Jump to Half Dozen Solutions |
| `p` | Fuzzy find any project |
| `proj` | Find project + open in Cursor |
| `e` | Open current dir in Cursor |
| `recent` | Browse recent directories |
| `cs` | Jump to CREATE SOMETHING monorepo |

### Pane Management

| Shortcut | Action |
|----------|--------|
| `Cmd+D` | Split pane horizontal |
| `Cmd+Shift+D` | Split pane vertical |
| `Cmd+Shift+H/J/K/L` | Navigate panes (vim-style) |
| `Cmd+Shift+Arrow` | Resize panes |
| `Cmd+W` | Close pane |
| `Cmd+K` | Clear screen |

### File Listing (eza)

| Command | Action |
|---------|--------|
| `ls` | List with icons |
| `ll` | Long list with git status |
| `lt` | Tree view (2 levels) |

## Philosophy

Every element justifies its existence:

- **Pure black background** (#000000)
- **Pure white text** (#ffffff)
- **Functional accents only** (green=success, red=error)
- **No decoration**, no gradients, no blur
- **Single config file**, fully readable

The terminal is a tool. It should disappear.

## Colors

The FZF theme matches your brand:
- Background: #000000
- Foreground: #ffffff
- Highlights: #34c759 (success green)
- Info/Comments: #666666

After a day of use, `z workway` will take you directly there.
