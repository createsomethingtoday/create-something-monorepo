#!/bin/bash
# Backup monorepo from internal SSD to LaCie external drive
# Run manually or via cron: 0 */4 * * * ~/Code/create-something-monorepo/scripts/backup-to-lacie.sh
#
# Only syncs source code — skips node_modules, build artifacts, and .git
# (LaCie has its own .git from the original clone)

set -euo pipefail

SRC="$HOME/Code/create-something-monorepo/"
DEST="/Volumes/LaCie/Create Something/create-something-monorepo-backup/"

# Check LaCie is mounted
if [ ! -d "/Volumes/LaCie" ]; then
  echo "$(date): LaCie not mounted, skipping backup" >> "$HOME/.local/log/lacie-backup.log"
  exit 0
fi

mkdir -p "$HOME/.local/log"
mkdir -p "$DEST"

rsync -a \
  --exclude 'node_modules' \
  --exclude '.svelte-kit' \
  --exclude '.wrangler' \
  --exclude '.turbo' \
  --exclude 'target' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude 'build' \
  --delete \
  "$SRC" "$DEST"

echo "$(date): Backup complete" >> "$HOME/.local/log/lacie-backup.log"
