# CREATE SOMETHING Terminal

Less, but better.

## Installation

### 1. Install dependencies

```bash
brew install herdr
brew install zellij
brew install zoxide fzf eza fd
brew install --cask font-jetbrains-mono
```

### 2. Configure Zellij

```bash
mkdir -p /tmp/zellij
export ZELLIJ_SOCKET_DIR=/tmp/zellij
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
| `herd` | Launch or attach the CREATE SOMETHING Herdr session |
| `herdr-status` | Show Herdr client/server status |
| `zj` | Run Zellij |
| `zj-cs` | Attach the CREATE SOMETHING Zellij session |
| `zj-board` | Show the repo-managed Zellij agent board |
| `zj-board-watch` | Watch the Zellij agent board |
| `zj-claude` | Start the default Claude worker lane in Zellij |
| `cc` | Explicit full-permission Claude Code alias |

### Agent Session Management

Zellij is the cockpit for visible worker sessions. It owns attach/detach,
session persistence, pane output capture, JSON streaming, and bounded input.
Codex remains the operator and repo-truth surface. Use Codex browser/computer-use
for browser proof, and use Zellij for worker terminal sessions.

| Shortcut | Action |
|----------|--------|
| `Ctrl-b v` | Split pane right |
| `Ctrl-b -` | Split pane down |
| `Ctrl-b h/j/k/l` | Focus panes |
| `Ctrl-b c` | New tab |
| `Ctrl-b w` | Workspace picker |
| `Ctrl-b q` | Detach Herdr client |

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
- **Functional accents only** (white/gray structure, blue/amber/red semantics)
- **No decoration**, no gradients, no blur
- **Small config file**, fully readable

The terminal is a tool. It should disappear.

## Colors

The FZF theme matches your brand:
- Background: #000000
- Foreground: #ffffff
- Highlights: #ffffff / #aaaaaa for structure, #4477aa / #aa8844 / #cc4444 for semantics
- Info/Comments: #666666

After a day of use, `z workway` will take you directly there.
