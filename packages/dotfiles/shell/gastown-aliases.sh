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
fi
