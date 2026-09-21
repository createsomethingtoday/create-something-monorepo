#!/bin/bash
# Install only the Zellij config, preserving any existing user configuration.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$(dirname "$SCRIPT_DIR")/zellij/config.kdl"
CONFIG_DIR="${1:-$HOME/.config/zellij}"
TARGET="$CONFIG_DIR/config.kdl"

if [[ ! -f "$SOURCE" ]]; then
    echo "Zellij source config is missing: $SOURCE" >&2
    exit 1
fi
mkdir -p "$CONFIG_DIR"
if [[ -L "$TARGET" && "$(readlink "$TARGET")" == "$SOURCE" ]]; then
    echo "  Zellij config already linked: $TARGET"
    exit 0
fi
if [[ -d "$TARGET" && ! -L "$TARGET" ]]; then
    echo "Refusing to replace a directory: $TARGET" >&2
    exit 1
fi
if [[ -e "$TARGET" || -L "$TARGET" ]]; then
    BACKUP_DIR=$(mktemp -d "$CONFIG_DIR/config.kdl.backup.XXXXXX")
    mv "$TARGET" "$BACKUP_DIR/config.kdl"
    echo "  Preserved existing Zellij config: $BACKUP_DIR/config.kdl"
fi
ln -s "$SOURCE" "$TARGET"
echo "  Symlinked Zellij config -> $TARGET"
