# CREATE SOMETHING Terminal - Shell Config
# Weniger, aber besser.

# ─────────────────────────────────────────────────────────────
# Core Tools
# ─────────────────────────────────────────────────────────────

# Zoxide: Smart directory jumping
if command -v zoxide >/dev/null 2>&1; then
  eval "$(zoxide init zsh)"
fi

# FZF: Fuzzy finder with muted functional accents
export FZF_DEFAULT_OPTS="
  --color=bg+:#000000,bg:#000000,spinner:#aaaaaa,hl:#ffffff
  --color=fg:#ffffff,header:#666666,info:#666666,pointer:#ffffff
  --color=marker:#aaaaaa,fg+:#ffffff,prompt:#ffffff,hl+:#ffffff
  --layout=reverse
  --border=none
  --height=40%
"

# Use fd for file finding (respects .gitignore)
export FZF_DEFAULT_COMMAND='fd --type f --hidden --exclude .git'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"

# ─────────────────────────────────────────────────────────────
# Navigation
# ─────────────────────────────────────────────────────────────

# Project directory
PROJECTS_DIR="$HOME/Code"

# Quick project jump with fzf
p() {
  local dir
  dir=$(fd --type d --max-depth 2 . "$PROJECTS_DIR" | fzf --preview 'eza --tree --level=1 --icons {}')
  if [[ -n "$dir" ]]; then
    cd "$dir"
  fi
}

# Project + open in editor
proj() {
  local dir
  dir=$(fd --type d --max-depth 2 . "$PROJECTS_DIR" | fzf --preview 'eza --tree --level=1 --icons {}')
  if [[ -n "$dir" ]]; then
    cd "$dir"
    cursor .
  fi
}

# Recent directories
recent() {
  local dir
  dir=$(zoxide query -l | fzf --preview 'eza --tree --level=1 --icons {}')
  if [[ -n "$dir" ]]; then
    cd "$dir"
  fi
}

# Open current dir in editor
e() {
  cursor .
}

# ─────────────────────────────────────────────────────────────
# Better ls with eza
# ─────────────────────────────────────────────────────────────

alias ls='eza --icons'
alias ll='eza -la --icons --git'
alias lt='eza --tree --level=2 --icons'

# ─────────────────────────────────────────────────────────────
# Bookmarks (update these paths)
# ─────────────────────────────────────────────────────────────

# CREATE SOMETHING monorepo
alias cs='cd "$HOME/Code/create-something-monorepo"'

# WORKWAY
alias ww='cd "$HOME/Code/WORKWAY"'

# To Do (Taskwarrior threshold)
alias td='cd "$HOME/Desktop/To Do"'

# ─────────────────────────────────────────────────────────────
# Claude Code
# ─────────────────────────────────────────────────────────────

alias cc='cd "$HOME/Code/create-something-monorepo" && claude --dangerously-skip-permissions'
alias ccp='claude --permission-mode plan'

# ─────────────────────────────────────────────────────────────
# Herdr
# ─────────────────────────────────────────────────────────────

alias herd='cd "$HOME/Code/create-something-monorepo" && herdr --session create-something'
alias herdr-cs='cd "$HOME/Code/create-something-monorepo" && herdr --session create-something'
alias herdr-status='herdr status'

# ─────────────────────────────────────────────────────────────
# Zellij
# ─────────────────────────────────────────────────────────────

export ZELLIJ_SOCKET_DIR="${ZELLIJ_SOCKET_DIR:-/tmp/zellij}"
mkdir -p "$ZELLIJ_SOCKET_DIR" >/dev/null 2>&1

alias zj='zellij'
alias zj-cs='cd "$HOME/Code/create-something-monorepo" && zellij attach create-something'
alias zj-board='cd "$HOME/Code/create-something-monorepo" && pnpm zellij:board'
alias zj-board-watch='cd "$HOME/Code/create-something-monorepo" && pnpm zellij:board -- --watch'
alias zj-claude='cd "$HOME/Code/create-something-monorepo" && pnpm zellij:claude -- --name claude'

# ─────────────────────────────────────────────────────────────
# Minimal Prompt
# ─────────────────────────────────────────────────────────────

# Directory only, white arrow
PROMPT='%F{white}%1~%f %F{white}→%f '

# Git info (optional - uncomment if you want branch in prompt)
# autoload -Uz vcs_info
# precmd() { vcs_info }
# zstyle ':vcs_info:git:*' formats '%F{666666}(%b)%f '
# PROMPT='%F{white}%1~%f ${vcs_info_msg_0_}%F{white}→%f '

# Infisical-backed shell secrets cache
INFISICAL_SHELL_SECRETS="$HOME/.config/create-something/infisical-shell-secrets.zsh"
if [[ -f "$INFISICAL_SHELL_SECRETS" ]]; then
  source "$INFISICAL_SHELL_SECRETS"
fi
