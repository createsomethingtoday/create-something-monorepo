#!/usr/bin/env bash
# Publish CREATE SOMETHING Pi packages to npm
#
# This local command is intentionally dry-run only. Public releases are made by
# .github/workflows/pi-public-release.yml through npm trusted publishing.
#
# Usage:
#   bash scripts/pi-publish.sh --dry-run
#
set -euo pipefail

if [[ "${1:-}" != "--dry-run" || -n "${2:-}" ]]; then
  echo "Local publication is disabled." >&2
  echo "Run this command with --dry-run, then dispatch the Pi Public Packages workflow from protected main." >&2
  exit 1
fi

echo "Dry run only: no registry publication will occur."

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PACKAGES=(
  "pi-three-tier-framework"
  "pi-policy-os"
)

echo "=== Verifying CREATE SOMETHING Pi package publication ==="
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

  echo "Checking $NAME@$VERSION"
  cd "$PKG_DIR"
  npm publish --access public --dry-run 2>&1
  echo "Verified $NAME@$VERSION; it was not published."
  echo ""
done

echo "=== Dry run complete; no packages were published ==="
echo ""
echo "After trusted publication, users will install:"
for pkg in "${PACKAGES[@]}"; do
  NAME=$(node -e "console.log(require('$ROOT/packages/$pkg/package.json').name)")
  PRIVATE=$(node -e "console.log(require('$ROOT/packages/$pkg/package.json').private || false)")
  [[ "$PRIVATE" == "true" ]] && continue
  echo "  pi install npm:$NAME"
done
