#!/bin/bash
# Operator Mac: hourly off-host recovery copy and service health receipt.
set -euo pipefail
umask 077
BASE="$HOME/Library/Application Support/CREATE SOMETHING/RustDesk Operations"
mkdir -p "$BASE/backups"
export PATH=/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin
status="$BASE/status.txt"
tmp="$BASE/status.tmp"
# The health block redirects stderr into $tmp. Reading it here would copy the
# file into itself until the disk fills. Keep diagnostics in place on failure.
trap 'printf "FAILED %s: inspect status.tmp\n" "$(date -u +%FT%TZ)" > "$status"' ERR
{
  date -u +%FT%TZ
  for port in 21115 21116 21117; do
    nc -z -G 10 support.createsomething.io "$port"
  done
  ssh -o BatchMode=yes -o UseKeychain=yes -o ConnectTimeout=15 \
    -i "$HOME/.ssh/id_ed25519_createsomething" root@198.199.76.7 \
    'set -eu; test "$(docker inspect -f "{{.State.Running}}" rustdesk-hbbs-1)" = true; test "$(docker inspect -f "{{.State.Running}}" rustdesk-hbbr-1)" = true; systemctl is-active rustdesk-backup.timer; test -n "$(find /var/backups/rustdesk -name "*.tar.age" -mmin -450 -print -quit)"; df -h /opt/rustdesk'
  rsync -az --include='*.tar.age' --exclude='*' \
    -e "ssh -o BatchMode=yes -o UseKeychain=yes -o ConnectTimeout=15 -i $HOME/.ssh/id_ed25519_createsomething" \
    root@198.199.76.7:/var/backups/rustdesk/ "$BASE/backups/"
  # Keep at least the most recent 120 off-host snapshots (30 days at six-hour cadence).
  python3 - "$BASE/backups" <<'PY'
from pathlib import Path
import sys
for old in sorted(Path(sys.argv[1]).glob('rustdesk-*.tar.age'))[:-120]:
    old.unlink()
PY
  printf 'PASS: ports, containers, backup freshness, off-host copy\n'
} > "$tmp" 2>&1
mv "$tmp" "$status"
cat "$status"
