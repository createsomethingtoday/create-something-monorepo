#!/bin/sh
# Trusted launcher for owned fixtures. No user-controlled command or path.
set -eu
case "${1:-isolation}" in
  isolation) fixture=/opt/private-qualify.mjs ;;
  memory) fixture=/opt/private-memory.mjs ;;
  *) exit 64 ;;
esac
exec unshare --mount --net --pid --fork --mount-proc /bin/sh -eu -c '
mount --make-rprivate /
mkdir -p /run/private-cgroup
mount -t cgroup2 none /run/private-cgroup
echo "+memory +pids" > /run/private-cgroup/cgroup.subtree_control
mkdir /run/private-cgroup/job
echo 134217728 > /run/private-cgroup/job/memory.max
echo 0 > /run/private-cgroup/job/memory.swap.max
echo 32 > /run/private-cgroup/job/pids.max
echo 1 > /run/private-cgroup/job/memory.oom.group
mount --bind / /
mount -o remount,bind,ro /
if [ -d /dev/shm ]; then mount --bind /dev/shm /dev/shm; mount -o remount,bind,ro /dev/shm; fi
mount -t tmpfs -o size=16m,nosuid,nodev,noexec tmpfs /tmp
set +e
sh -c '\''echo $$ > /run/private-cgroup/job/cgroup.procs; exec setpriv --reuid=65534 --regid=65534 --clear-groups --no-new-privs --bounding-set=-all --inh-caps=-all --ambient-caps=-all prlimit --nproc=32:32 --fsize=16777216:16777216 --nofile=64:64 --cpu=5:5 node "$1"'\'' private-job "$1"
status=$?
printf "CGROUP_MEMORY_EVENTS\n" >&2
cat /run/private-cgroup/job/memory.events >&2
exit "$status"
' private-isolate "$fixture"
