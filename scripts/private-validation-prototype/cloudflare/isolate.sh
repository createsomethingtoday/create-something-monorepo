#!/bin/sh
# Trusted launcher for owned fixtures. No user-controlled command or path.
set -eu
case "${1:-isolation}" in
  isolation) fixture=/opt/private-qualify.mjs ;;
  memory) fixture=/opt/private-memory.mjs ;;
  output) fixture=/opt/private-output.mjs ;;
  *) exit 64 ;;
esac
exec unshare --mount --net --pid --fork --mount-proc /bin/sh -eu -c '
mount --make-rprivate /
mount --bind / /
mount -o remount,bind,ro /
if [ -d /dev/shm ]; then mount --bind /dev/shm /dev/shm; mount -o remount,bind,ro /dev/shm; fi
mount -t tmpfs -o size=16m,nosuid,nodev,noexec tmpfs /tmp
exec setpriv --reuid=65534 --regid=65534 --clear-groups --no-new-privs --bounding-set=-all --inh-caps=-all --ambient-caps=-all prlimit --nproc=32:32 --fsize=16777216:16777216 --nofile=64:64 --cpu=5:5 node "$1"
' private-isolate "$fixture"
