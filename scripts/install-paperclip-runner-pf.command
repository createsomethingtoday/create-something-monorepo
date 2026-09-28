#!/bin/zsh
set -euo pipefail

[[ "$(id -un)" == 'micahjohnson' ]] || { print -u2 'Run as micahjohnson in Terminal.'; exit 1; }
[[ "$(dscl . -read /Users/papercliprunner UniqueID | awk '{print $2}')" == '504' ]] || {
  print -u2 'papercliprunner UID changed; stopping.'
  exit 1
}
source_dir="$(cd "$(dirname "$0")" && pwd -P)"
root_dir='/Library/Application Support/CREATE SOMETHING/Paperclip Runner'
parent_dir='/Library/Application Support/CREATE SOMETHING'
plist='/Library/LaunchDaemons/agency.createsomething.papercliprunner.pf.plist'
anchor='com.apple/papercliprunner-browser-boundary'
lock_file='/var/run/agency.createsomething.papercliprunner.pf.lock'
expected_tcp='block drop out quick on lo0 proto tcp all user = 504'
expected_udp='block drop out quick on lo0 proto udp all user = 504'
expected_guard_hash='f1ae9ccc0e5938ae03488cc9d6b48468ac8391df4773b613a39f4f89048225ad'
expected_rule_hash='9919aef0cca3bd274cae3db30159af8df46d1fbbf9354db373ad18ed1700b705'
expected_plist_hash='27142a209b377f036e7a1171dc6a3e2ad534f8fdc8671678a618c5f8d2d15e45'

hash_file() { /usr/bin/shasum -a 256 "$1" | /usr/bin/awk '{print $1}'; }
[[ "$(hash_file "$source_dir/paperclip-runner-pf-guard.zsh")" == "$expected_guard_hash" ]] || { print -u2 'Reviewed PF guard hash mismatch.'; exit 1; }
[[ "$(hash_file "$source_dir/paperclip-runner-pf.rules")" == "$expected_rule_hash" ]] || { print -u2 'Reviewed PF rule hash mismatch.'; exit 1; }
[[ "$(hash_file "$source_dir/agency.createsomething.papercliprunner.pf.plist")" == "$expected_plist_hash" ]] || { print -u2 'Reviewed PF plist hash mismatch.'; exit 1; }
[[ ! -L "$parent_dir" && ! -e "$root_dir" && ! -L "$root_dir" && ! -e "$plist" && ! -L "$plist" ]] || {
  print -u2 'An existing or symlinked PF installation path needs reconciliation before install.'
  exit 1
}
if [[ -e "$parent_dir" ]]; then
  parent_stat="$(stat -f '%u:%Lp' "$parent_dir")"
  [[ "$parent_stat" == '0:755' || "$parent_stat" == '0:700' ]] || {
    print -u2 'The existing PF parent directory is not root-owned and private to root writes.'
    exit 1
  }
fi
zsh -n "$source_dir/paperclip-runner-pf-guard.zsh"
/sbin/pfctl -nf "$source_dir/paperclip-runner-pf.rules" >/dev/null
/usr/bin/plutil -lint "$source_dir/agency.createsomething.papercliprunner.pf.plist" >/dev/null
[[ "$(/usr/bin/curl --noproxy '*' -fsS --max-time 3 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:3101/api/companies)" == '200' ]] || {
  print -u2 'Host Paperclip positive control failed; stopping before PF install.'
  exit 1
}

print 'Installing the reviewed UID-504 loopback guard. macOS may ask for your administrator password.'
sudo -v
prior_rules="$(sudo /sbin/pfctl -a "$anchor" -sr)"
[[ -z "$prior_rules" || "$prior_rules" == "$expected_tcp"$'\n'"$expected_udp" ]] || {
  print -u2 'PF anchor contains unexpected rules; stopping before install.'
  exit 1
}
installed=false
success=false
rollback_failed_install() {
  [[ "$success" == true || "$installed" != true ]] && return
  print -u2 'PF installation did not finish; reconciling only the files and reference created by this installer.'
  set +e
  sudo /usr/bin/lockf -k -t 20 "$lock_file" /bin/zsh "$source_dir/remove-paperclip-runner-pf.command" --locked
  removal_status=$?
  if [[ "$removal_status" == 0 && -n "$prior_rules" ]]; then
    print 'block drop out quick on lo0 proto { tcp, udp } all user papercliprunner' | sudo /sbin/pfctl -a "$anchor" -f -
    print -u2 'The pre-existing temporary UID-504 rule was restored.'
  elif [[ "$removal_status" != 0 ]]; then
    print -u2 'Automatic rollback was incomplete. Leave the runner unassigned and inspect launchd/PF before retrying.'
  fi
}
trap rollback_failed_install EXIT

sudo /usr/bin/install -d -o root -g wheel -m 700 "$root_dir"
installed=true
sudo /usr/bin/install -o root -g wheel -m 600 "$source_dir/paperclip-runner-pf.rules" "$root_dir/pf.rules"
sudo /usr/bin/install -o root -g wheel -m 700 "$source_dir/paperclip-runner-pf-guard.zsh" "$root_dir/pf-guard.zsh"
sudo /usr/bin/install -o root -g wheel -m 644 "$source_dir/agency.createsomething.papercliprunner.pf.plist" "$plist"
[[ "$(sudo /usr/bin/shasum -a 256 "$root_dir/pf-guard.zsh" | /usr/bin/awk '{print $1}')" == "$expected_guard_hash" ]] || { print -u2 'Installed PF guard hash mismatch.'; exit 1; }
[[ "$(sudo /usr/bin/shasum -a 256 "$root_dir/pf.rules" | /usr/bin/awk '{print $1}')" == "$expected_rule_hash" ]] || { print -u2 'Installed PF rule hash mismatch.'; exit 1; }
[[ "$(sudo /usr/bin/shasum -a 256 "$plist" | /usr/bin/awk '{print $1}')" == "$expected_plist_hash" ]] || { print -u2 'Installed PF plist hash mismatch.'; exit 1; }
[[ "$(sudo stat -f '%u:%Lp' "$root_dir")" == '0:700' && "$(sudo stat -f '%u:%Lp' "$root_dir/pf.rules")" == '0:600' && "$(sudo stat -f '%u:%Lp' "$root_dir/pf-guard.zsh")" == '0:700' && "$(sudo stat -f '%u:%Lp' "$plist")" == '0:644' ]] || {
  print -u2 'Installed PF ownership/mode readback failed.'
  exit 1
}

# RunAtLoad is the only activation. The guard itself serializes with lockf.
sudo /bin/launchctl bootstrap system "$plist"
ready=false
for attempt in {1..20}; do
  current_rules="$(sudo /sbin/pfctl -a "$anchor" -sr)"
  if [[ "$current_rules" == "$expected_tcp"$'\n'"$expected_udp" ]] && sudo /usr/bin/test -f "$root_dir/pf-enable-token"; then
    ready=true
    break
  fi
  /bin/sleep 0.5
done
[[ "$ready" == true ]] || { print -u2 'PF guard did not report its rule and owned token.'; exit 1; }
sudo /bin/launchctl print system/agency.createsomething.papercliprunner.pf >/dev/null
current_boot="$(/usr/sbin/sysctl -n kern.bootsessionuuid)"
token_record="$(sudo /bin/cat "$root_dir/pf-enable-token")"
[[ "$token_record" == "$current_boot "<-> ]] || { print -u2 'PF token is not bound to the current boot.'; exit 1; }

# Pair local denial with a live host-positive control and public runner egress.
[[ "$(/usr/bin/curl --noproxy '*' -fsS --max-time 3 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:3101/api/companies)" == '200' ]] || {
  print -u2 'Host Paperclip positive control failed after PF install.'
  exit 1
}
key_file="$HOME/Library/Application Support/CREATE SOMETHING/Paperclip Browser Runner/ssh/id_ed25519"
known_hosts_file="$HOME/.ssh/paperclip_runner_known_hosts"
runner_result="$(/usr/bin/ssh -i "$key_file" -o UserKnownHostsFile="$known_hosts_file" -o StrictHostKeyChecking=yes -o BatchMode=yes papercliprunner@127.0.0.1 'python3 -c '\''import socket,subprocess,sys; s=socket.socket(); s.settimeout(2); local=s.connect_ex(("127.0.0.1",3101)); public=subprocess.run(["/usr/bin/curl","--noproxy","*","-fsS","--max-time","8","--output","/dev/null","--write-out","%{http_code}","https://example.com/"],capture_output=True,text=True); print("local_denied="+str(local!=0)); print("public_200="+str(public.returncode==0 and public.stdout=="200")); sys.exit(0 if local!=0 and public.returncode==0 and public.stdout=="200" else 1)'\''')"
print -r -- "$runner_result"
[[ "$runner_result" == *'local_denied=True'* && "$runner_result" == *'public_200=True'* ]] || {
  print -u2 'Paired runner network proof failed.'
  exit 1
}
success=true
print 'Persistent PF guard installed for UID 504; host-positive, runner-local denial, and runner-public controls passed.'
print "Rollback command: zsh '$source_dir/remove-paperclip-runner-pf.command'"
