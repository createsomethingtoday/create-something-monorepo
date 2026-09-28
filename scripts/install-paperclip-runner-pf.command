#!/bin/zsh
set -euo pipefail

[[ "$(id -un)" == 'micahjohnson' ]] || { print -u2 'Run this as micahjohnson in Terminal.'; exit 1; }
[[ "$(dscl . -read /Users/papercliprunner UniqueID | awk '{print $2}')" == '504' ]] || {
  print -u2 'papercliprunner UID changed; stopping.'
  exit 1
}
source_dir="$(cd "$(dirname "$0")" && pwd -P)"
root_dir='/Library/Application Support/CREATE SOMETHING/Paperclip Runner'
plist='/Library/LaunchDaemons/agency.createsomething.papercliprunner.pf.plist'
anchor='com.apple/papercliprunner-browser-boundary'

zsh -n "$source_dir/paperclip-runner-pf-guard.zsh"
/sbin/pfctl -nf "$source_dir/paperclip-runner-pf.rules" >/dev/null
/usr/bin/plutil -lint "$source_dir/agency.createsomething.papercliprunner.pf.plist" >/dev/null
[[ ! -e "$plist" ]] || { print -u2 'The PF LaunchDaemon already exists; reconcile it before installing.'; exit 1; }

print 'Installing the reviewed UID-504 loopback guard. macOS may ask for your administrator password.'
sudo -v
sudo /usr/bin/install -d -o root -g wheel -m 700 "$root_dir"
sudo /usr/bin/install -o root -g wheel -m 600 "$source_dir/paperclip-runner-pf.rules" "$root_dir/pf.rules"
sudo /usr/bin/install -o root -g wheel -m 700 "$source_dir/paperclip-runner-pf-guard.zsh" "$root_dir/pf-guard.zsh"
sudo /usr/bin/install -o root -g wheel -m 644 "$source_dir/agency.createsomething.papercliprunner.pf.plist" "$plist"
sudo /bin/launchctl bootstrap system "$plist"
sudo /bin/launchctl kickstart -k system/agency.createsomething.papercliprunner.pf
sudo "$root_dir/pf-guard.zsh"

key_file="$HOME/Library/Application Support/CREATE SOMETHING/Paperclip Browser Runner/ssh/id_ed25519"
known_hosts_file="$HOME/.ssh/paperclip_runner_known_hosts"
/usr/bin/ssh -i "$key_file" -o UserKnownHostsFile="$known_hosts_file" -o StrictHostKeyChecking=yes -o BatchMode=yes papercliprunner@127.0.0.1 'python3 -c '\''import socket,sys; s=socket.socket(); s.settimeout(2); denied=s.connect_ex(("127.0.0.1",3101))!=0; print("runner_to_paperclip_denied="+str(denied)); sys.exit(0 if denied else 1)'\'''
print 'Persistent PF guard installed and UID-504 Paperclip denial verified. Recheck after reboot before assigning ongoing work.'
print 'Rollback command: zsh scripts/remove-paperclip-runner-pf.command from this checkout.'
