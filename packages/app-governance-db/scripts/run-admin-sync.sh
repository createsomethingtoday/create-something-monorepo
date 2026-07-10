#!/bin/zsh
# App Governance admin-apps sync wrapper.
# The launchd job used to run the sync script straight out of the monorepo
# working tree, which breaks whenever the checked-out branch predates
# packages/app-governance-db. This wrapper materializes the scripts from
# origin/main into a self-contained runtime dir on every run, so the job is
# independent of whatever branch the working tree happens to be on.
set -euo pipefail

REPO=/Users/micahjohnson/Code/create-something-monorepo
BASE=$HOME/.config/webflow-admin-sync
RUNTIME=$BASE/runtime
LOG=$BASE/sync.log
# Keep in sync with packages/app-governance-db devDependencies.playwright
PLAYWRIGHT_VERSION=1.61.1

notify() {
  /usr/bin/osascript -e "display notification \"$1\" with title \"App Governance admin sync\"" >/dev/null 2>&1 || true
}

run() {
  echo "=== run $(date -u +%FT%TZ) ==="
  git -C "$REPO" fetch --quiet origin main || echo "warn: git fetch failed; using cached origin/main"
  mkdir -p "$RUNTIME"
  git -C "$REPO" archive origin/main packages/app-governance-db/scripts | tar -x -C "$RUNTIME"

  if [ ! -d "$RUNTIME/node_modules/playwright" ]; then
    echo "installing playwright@$PLAYWRIGHT_VERSION into runtime"
    (cd "$RUNTIME" && npm init -y >/dev/null 2>&1 || true)
    (cd "$RUNTIME" && npm install --no-fund --no-audit "playwright@$PLAYWRIGHT_VERSION" >/dev/null)
  fi
  # Browser binaries live in the shared ~/Library/Caches/ms-playwright cache;
  # this is a no-op when the right build is already present.
  (cd "$RUNTIME" && npx playwright install chromium >/dev/null 2>&1)

  node "$RUNTIME/packages/app-governance-db/scripts/sync-admin-apps.playwright.mjs" "$@"
}

if run "$@" >>"$LOG" 2>&1; then
  echo "OK $(date -u +%FT%TZ)" >>"$LOG"
else
  rc=$?
  echo "FAILED (exit $rc) $(date -u +%FT%TZ)" >>"$LOG"
  notify "Admin apps sync FAILED (exit $rc) — see sync.log"
  exit $rc
fi
