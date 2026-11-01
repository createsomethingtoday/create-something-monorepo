#!/bin/bash
# Regression fixture: a clean pushed feature branch must survive targeted apply.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/worktree-prune.sh"
ROOT=$(mktemp -d /private/tmp/cre-2123-prune-test.XXXXXX)
CHECKOUT="${ROOT}-agent-worktree"
REPO="$ROOT/code/repo"
trap 'git -C "$REPO" worktree remove --force "$CHECKOUT" >/dev/null 2>&1 || true; rm -rf "$ROOT" "$CHECKOUT"' EXIT
mkdir -p "$REPO" "$ROOT/home"
git -C "$REPO" init -q -b main
git -C "$REPO" config user.name 'Prune Test'
git -C "$REPO" config user.email 'prune-test@example.invalid'
printf 'base\n' > "$REPO/file"
git -C "$REPO" add file
git -C "$REPO" commit -qm base
git -C "$REPO" remote add origin "$REPO"
git -C "$REPO" remote set-head origin main 2>/dev/null || true
git -C "$REPO" update-ref refs/remotes/origin/main HEAD
git -C "$REPO" worktree add -qb feature "$CHECKOUT"
printf 'feature\n' >> "$CHECKOUT/file"
git -C "$CHECKOUT" commit -qam feature
git -C "$REPO" update-ref refs/remotes/origin/feature "$(git -C "$CHECKOUT" rev-parse HEAD)"

# Simulate the reported five-hour-old clean pushed checkout under disk pressure.
touch -t "$(date -v-5H '+%Y%m%d%H%M.%S')" "$CHECKOUT"
export HOME="$ROOT/home" WORKTREE_PRUNE_CODE_ROOT="$ROOT/code"
export WORKTREE_PRUNE_FREE_GB=1 WORKTREE_PRUNE_LOW_DISK_GB=30
export WORKTREE_PRUNE_MIN_AGE_HOURS=168 WORKTREE_PRUNE_LOW_DISK_MIN_AGE_HOURS=2

if "$SCRIPT" --apply --target / > "$ROOT/root-target.log" 2>&1; then
  echo 'root target unexpectedly accepted' >&2; exit 1
else
  test "$?" -eq 2
fi
test -d "$CHECKOUT"
"$SCRIPT" --dry-run --target "$CHECKOUT" > "$ROOT/dry.log"
test -d "$CHECKOUT"
grep -q 'age gate lowered to 2h' "$ROOT/dry.log"
grep -q 'removed=0' "$ROOT/dry.log"
"$SCRIPT" --apply --target "$CHECKOUT" > "$ROOT/unmerged.log"
test -d "$CHECKOUT"
grep -q 'not merged' "$ROOT/unmerged.log"

git -C "$REPO" worktree lock "$CHECKOUT" --reason 'active test owner'
git -C "$REPO" merge --ff-only feature >/dev/null
git -C "$REPO" update-ref refs/remotes/origin/main "$(git -C "$REPO" rev-parse HEAD)"
"$SCRIPT" --apply --target "$CHECKOUT" > "$ROOT/locked.log"
test -d "$CHECKOUT"
grep -q 'locked' "$ROOT/locked.log"

git -C "$REPO" worktree unlock "$CHECKOUT"
"$SCRIPT" --apply --target "$CHECKOUT" > "$ROOT/removed.log"
test ! -e "$CHECKOUT"
grep -q 'removed=1' "$ROOT/removed.log"
echo 'worktree-prune fixture passed'
