# CREATE SOMETHING Terminal - Shell Config
# Weniger, aber besser.

# ─────────────────────────────────────────────────────────────
# Core Tools
# ─────────────────────────────────────────────────────────────

# Zoxide: Smart directory jumping
eval "$(zoxide init zsh)"

# FZF: Fuzzy finder with muted functional accents
export FZF_DEFAULT_OPTS="
  --color=bg+:#000000,bg:#000000,spinner:#44aa44,hl:#44aa44
  --color=fg:#ffffff,header:#666666,info:#666666,pointer:#44aa44
  --color=marker:#44aa44,fg+:#ffffff,prompt:#ffffff,hl+:#66cc66
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

# Project directory (update this path)
PROJECTS_DIR="$HOME/Documents/Github"

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
alias cs='cd "$HOME/Documents/Github/Create Something/create-something-monorepo"'

# WORKWAY
alias ww='cd "$HOME/Documents/Github/WORKWAY"'

# To Do (Taskwarrior threshold)
alias td='cd "$HOME/Desktop/To Do"'

# ─────────────────────────────────────────────────────────────
# Claude Code
# ─────────────────────────────────────────────────────────────

alias cc='claude --dangerously-skip-permissions'

# ─────────────────────────────────────────────────────────────
# Minimal Prompt
# ─────────────────────────────────────────────────────────────

# Directory only, green arrow
PROMPT='%F{white}%1~%f %F{green}→%f '

# Git info (optional - uncomment if you want branch in prompt)
# autoload -Uz vcs_info
# precmd() { vcs_info }
# zstyle ':vcs_info:git:*' formats '%F{666666}(%b)%f '
# PROMPT='%F{white}%1~%f ${vcs_info_msg_0_}%F{green}→%f '
