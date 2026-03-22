#!/bin/bash
# Install Codex compatibility skills only when a Codex session explicitly needs
# the repo-owned compatibility layer. Use symlinks so repo updates stay live
# and we avoid duplicating files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$DOTFILES_DIR/codex/skills"
TARGET_ROOT="${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="$TARGET_ROOT/skills"

echo "Installing Codex compatibility skills into $TARGET_DIR..."
echo "Pi remains the default repo-owned agent workflow."

mkdir -p "$TARGET_DIR"

shopt -s nullglob
skill_paths=("$SOURCE_DIR"/*)

if [ "${#skill_paths[@]}" -eq 0 ]; then
    echo "  No Codex compatibility skills found in $SOURCE_DIR"
    exit 0
fi

installed_count=0

for skill_path in "${skill_paths[@]}"; do
    [ -d "$skill_path" ] || continue

    skill_name="$(basename "$skill_path")"
    target_path="$TARGET_DIR/$skill_name"

    rm -rf "$target_path"
    ln -s "$skill_path" "$target_path"

    echo "  Linked $skill_name → $target_path"
    installed_count=$((installed_count + 1))
done

echo "  Linked $installed_count Codex compatibility skill(s)"
echo "  Use this only for explicit Codex compatibility sessions."
