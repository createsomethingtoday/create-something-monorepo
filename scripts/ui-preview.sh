#!/bin/bash
# UI Preview wrapper script
# Ensures bun is in PATH and runs the CLI

# Add bun to PATH if not already there
if ! command -v bun &> /dev/null; then
  export PATH="$HOME/.bun/bin:$PATH"
fi

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Run the CLI
exec bun run "$MONOREPO_ROOT/packages/ui-viewer/cli/index.ts" "$@"
