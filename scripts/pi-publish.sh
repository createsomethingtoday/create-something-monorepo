#!/usr/bin/env bash
# Publish CREATE SOMETHING Pi packages to npm
#
# Prerequisites:
#   npm login --scope=@create-something
#
# Usage:
#   bash scripts/pi-publish.sh [--dry-run]
#
set -euo pipefail

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "🔍 Dry run mode"
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PACKAGES=(
  "pi-three-tier-framework"
  "pi-policy-os"
)

echo "=== Publishing CREATE SOMETHING Pi packages ==="
echo ""

for pkg in "${PACKAGES[@]}"; do
  PKG_DIR="$ROOT/packages/$pkg"
  NAME=$(node -e "console.log(require('$PKG_DIR/package.json').name)")
  VERSION=$(node -e "console.log(require('$PKG_DIR/package.json').version)")
  PRIVATE=$(node -e "console.log(require('$PKG_DIR/package.json').private || false)")

  if [[ "$PRIVATE" == "true" ]]; then
    echo "⏭️  Skipping $NAME (private)"
    continue
  fi

  echo "📦 Publishing $NAME@$VERSION"
  cd "$PKG_DIR"
  npm publish --access public $DRY_RUN 2>&1
  echo "✅ $NAME@$VERSION published"
  echo ""
done

echo "=== Done ==="
echo ""
echo "Users can now install:"
for pkg in "${PACKAGES[@]}"; do
  NAME=$(node -e "console.log(require('$ROOT/packages/$pkg/package.json').name)")
  PRIVATE=$(node -e "console.log(require('$ROOT/packages/$pkg/package.json').private || false)")
  [[ "$PRIVATE" == "true" ]] && continue
  echo "  pi install npm:$NAME"
done
