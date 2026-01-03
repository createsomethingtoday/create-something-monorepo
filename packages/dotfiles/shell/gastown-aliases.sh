#!/bin/bash
# CREATE SOMETHING Gastown Nomenclature Aliases
# Maps canonical terms to Gastown upstream commands
# The tool recedes; the work remains.
#
# Philosophy: Gastown uses animal metaphors (Polecat, Deacon) that demand
# attention rather than receding into use. CREATE SOMETHING prefers
# functional terminology that describes what the role DOES.
#
# Mapping:
#   Mayor   → Coordinator  (describes function, not arbitrary title)
#   Polecat → Worker       (tool recedes; "polecat" demands attention)
#   Deacon  → Steward      (aligns with "serves the practice")

# ─────────────────────────────────────────────────────────────────────────────
# Core Role Aliases
# ─────────────────────────────────────────────────────────────────────────────

# Mayor → Coordinator (global orchestrator, assigns work)
coordinator() {
  gt mayor "$@"
}

# Polecat → Worker (executes discrete tasks)
worker() {
  gt polecat "$@"
}

# Deacon → Steward (background daemon, manages lifecycle)
steward() {
  gt deacon "$@"
}

# ─────────────────────────────────────────────────────────────────────────────
# Quick Session Attach (from outside tmux)
# ─────────────────────────────────────────────────────────────────────────────

# gtm - attach to Mayor/Coordinator session
alias gtm='tmux attach -t gt-mayor 2>/dev/null || echo "gt-mayor not running. Start with: gt start"'

# gtw - attach to Witness session
alias gtw='tmux attach -t gt-csm-witness 2>/dev/null || echo "gt-csm-witness not running. Start with: gt start"'

# gtr - attach to Refinery session
alias gtr='tmux attach -t gt-csm-refinery 2>/dev/null || echo "gt-csm-refinery not running. Start with: gt start"'

# gts - list all Gastown sessions
alias gts='tmux list-sessions 2>/dev/null | grep "^gt-" || echo "No Gastown sessions running"'

# ─────────────────────────────────────────────────────────────────────────────
# Export for subshells
# ─────────────────────────────────────────────────────────────────────────────

export -f coordinator worker steward

# ─────────────────────────────────────────────────────────────────────────────
# Verification (silent unless GT_DEBUG is set)
# ─────────────────────────────────────────────────────────────────────────────

if [[ -n "$GT_DEBUG" ]]; then
  echo "CREATE SOMETHING Gastown aliases loaded:"
  echo "  coordinator → gt mayor"
  echo "  worker      → gt polecat"
  echo "  steward     → gt deacon"
  echo "  gtm         → attach to gt-mayor"
  echo "  gtw         → attach to gt-csm-witness"
  echo "  gtr         → attach to gt-csm-refinery"
  echo "  gts         → list Gastown sessions"
fi
