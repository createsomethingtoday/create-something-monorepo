#!/bin/zsh
set -euo pipefail

[[ "$(id -un)" == 'micahjohnson' ]] || { print -u2 'Run this as micahjohnson in Terminal.'; exit 1; }
root_dir='/Library/Application Support/CREATE SOMETHING/Paperclip Runner'
plist='/Library/LaunchDaemons/agency.createsomething.papercliprunner.pf.plist'
anchor='com.apple/papercliprunner-browser-boundary'

print 'Removing only the Paperclip runner PF guard. macOS may ask for your administrator password.'
sudo -v
if sudo /bin/launchctl print system/agency.createsomething.papercliprunner.pf >/dev/null 2>&1; then
  sudo /bin/launchctl bootout system/agency.createsomething.papercliprunner.pf
fi
sudo /sbin/pfctl -a "$anchor" -F rules
if sudo /usr/bin/test -f "$root_dir/pf-enable-token"; then
  token="$(sudo /bin/cat "$root_dir/pf-enable-token")"
  [[ "$token" == <-> ]] || { print -u2 'PF enable token is malformed; stopping before file removal.'; exit 1; }
  sudo /sbin/pfctl -X "$token" || print -u2 'PF token release failed; inspect PF state.'
fi
sudo /bin/rm -f "$root_dir/pf-enable-token" "$root_dir/pf.rules" "$root_dir/pf-guard.zsh" "$plist"
sudo /bin/rmdir "$root_dir"
print 'Paperclip runner PF guard removed. Keep the agent environment unassigned until another enforced boundary passes.'
