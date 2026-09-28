#!/bin/zsh
set -euo pipefail

root_dir='/Library/Application Support/CREATE SOMETHING/Paperclip Runner'
parent_dir='/Library/Application Support/CREATE SOMETHING'
plist='/Library/LaunchDaemons/agency.createsomething.papercliprunner.pf.plist'
anchor='com.apple/papercliprunner-browser-boundary'
lock_file='/var/run/agency.createsomething.papercliprunner.pf.lock'
token_file="$root_dir/pf-enable-token"
expected_tcp='block drop out quick on lo0 proto tcp all user = 504'
expected_udp='block drop out quick on lo0 proto udp all user = 504'

if [[ "$(id -u)" != '0' ]]; then
  [[ "$(id -un)" == 'micahjohnson' ]] || { print -u2 'Run as micahjohnson in Terminal.'; exit 1; }
  print 'Removing the Paperclip runner PF guard. macOS may ask for your administrator password.'
  sudo -v
  exec sudo /usr/bin/lockf -k -t 20 "$lock_file" /bin/zsh "$0" --locked
fi
[[ "${1:-}" == '--locked' ]] || { print -u2 'Root removal requires the PF lock.'; exit 1; }

if [[ ! -e "$root_dir" && ! -e "$plist" ]]; then
  print 'Persistent PF guard was already absent; existing temporary anchor state was left unchanged.'
  exit 0
fi
if [[ ! -e "$root_dir" ]]; then
  if /bin/launchctl print system/agency.createsomething.papercliprunner.pf >/dev/null 2>&1; then
    /bin/launchctl bootout system/agency.createsomething.papercliprunner.pf
  fi
  /bin/rm -f "$plist"
  print 'Partial PF installation without a guard directory removed; existing anchor state was left unchanged.'
  exit 0
fi
[[ ! -L "$root_dir" && "$(stat -f '%u:%Lp' "$root_dir")" == '0:700' ]] || {
  print -u2 'PF guard directory changed; stopping.'
  exit 1
}
current_rules="$(/sbin/pfctl -a "$anchor" -sr)"
[[ -z "$current_rules" || "$current_rules" == "$expected_tcp"$'\n'"$expected_udp" ]] || {
  print -u2 'PF anchor contains unexpected rules; stopping.'
  exit 1
}

if /bin/launchctl print system/agency.createsomething.papercliprunner.pf >/dev/null 2>&1; then
  /bin/launchctl bootout system/agency.createsomething.papercliprunner.pf
fi

if [[ -e "$token_file" ]]; then
  [[ ! -L "$token_file" && "$(stat -f '%u:%Lp' "$token_file")" == '0:600' ]] || {
    print -u2 'PF token file changed; anchor left in place for reconciliation.'
    exit 1
  }
  saved_boot=''; saved_token=''
  read -r saved_boot saved_token < "$token_file" || true
  current_boot="$(/usr/sbin/sysctl -n kern.bootsessionuuid)"
  [[ "$saved_token" == <-> ]] || { print -u2 'Malformed PF token; anchor left in place.'; exit 1; }
  if [[ "$saved_boot" == "$current_boot" ]]; then
    /sbin/pfctl -X "$saved_token" || { print -u2 'PF token release failed; anchor left in place.'; exit 1; }
  fi
fi
/sbin/pfctl -a "$anchor" -F rules
[[ -z "$(/sbin/pfctl -a "$anchor" -sr)" ]] || { print -u2 'PF anchor did not clear; files retained.'; exit 1; }
/bin/rm -f "$root_dir/pf-enable-token" "$root_dir/pf.rules" "$root_dir/pf-guard.zsh" "$plist"
/bin/rmdir "$root_dir"
/bin/rmdir "$parent_dir" >/dev/null 2>&1 || true
print 'Persistent Paperclip runner PF guard removed; anchor empty. Keep the agent environment unassigned.'
