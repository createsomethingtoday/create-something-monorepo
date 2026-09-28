#!/bin/zsh
set -euo pipefail

lock_file='/var/run/agency.createsomething.papercliprunner.pf.lock'
if [[ "$(id -u)" != '0' ]]; then
  [[ "$(id -un)" == 'micahjohnson' ]] || { print -u2 'Run as micahjohnson in Terminal.'; exit 1; }
  print 'Installing the reviewed UID-504 loopback guard. macOS may ask for your administrator password.'
  sudo -v
  exec sudo /usr/bin/lockf -k -t 20 "$lock_file" /bin/zsh "$0" --locked
fi
[[ "${1:-}" == '--locked' ]] || { print -u2 'Root installation requires the PF lock.'; exit 1; }
[[ "$(dscl . -read /Users/papercliprunner UniqueID | awk '{print $2}')" == '504' ]] || {
  print -u2 'papercliprunner UID changed; stopping.'
  exit 1
}
source_dir="$(cd "$(dirname "$0")" && pwd -P)"
root_dir='/Library/Application Support/CREATE SOMETHING/Paperclip Runner'
parent_dir='/Library/Application Support/CREATE SOMETHING'
plist='/Library/LaunchDaemons/agency.createsomething.papercliprunner.pf.plist'
anchor='com.apple/papercliprunner-browser-boundary'
expected_tcp='block drop out quick on lo0 proto tcp all user = 504'
expected_udp='block drop out quick on lo0 proto udp all user = 504'
expected_guard_hash='67efc4e30ea49caf9b4ab6b1384983f811b9eee6dca7f8e6a49cea3bfe9d044a'
expected_rule_hash='9919aef0cca3bd274cae3db30159af8df46d1fbbf9354db373ad18ed1700b705'
expected_plist_hash='27142a209b377f036e7a1171dc6a3e2ad534f8fdc8671678a618c5f8d2d15e45'
expected_remove_hash='e078c3cc06cff2c19028f81c64a1e2e4dbc0567b9f348c6f147babb450a6c87d'

hash_file() { /usr/bin/shasum -a 256 "$1" | /usr/bin/awk '{print $1}'; }
[[ "$(hash_file "$source_dir/paperclip-runner-pf-guard.zsh")" == "$expected_guard_hash" ]] || { print -u2 'Reviewed PF guard hash mismatch.'; exit 1; }
[[ "$(hash_file "$source_dir/paperclip-runner-pf.rules")" == "$expected_rule_hash" ]] || { print -u2 'Reviewed PF rule hash mismatch.'; exit 1; }
[[ "$(hash_file "$source_dir/agency.createsomething.papercliprunner.pf.plist")" == "$expected_plist_hash" ]] || { print -u2 'Reviewed PF plist hash mismatch.'; exit 1; }
[[ "$(hash_file "$source_dir/remove-paperclip-runner-pf.command")" == "$expected_remove_hash" ]] || { print -u2 'Reviewed PF remover hash mismatch.'; exit 1; }
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
runner_environment_status="$(/usr/bin/curl --noproxy '*' -fsS --max-time 3 http://127.0.0.1:3101/api/environments/8da4aa7c-eecc-4f39-a6fc-67368e209834 | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("status") if d.get("id")=="8da4aa7c-eecc-4f39-a6fc-67368e209834" else "invalid")')"
[[ "$runner_environment_status" == 'archived' ]] || {
  print -u2 'Archive the restricted Paperclip environment before installing PF; this fences new runs during rollback.'
  exit 1
}
[[ "$(/usr/bin/curl --noproxy '*' -fsS --max-time 3 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:3101/api/companies)" == '200' ]] || {
  print -u2 'Host Paperclip positive control failed; stopping before PF install.'
  exit 1
}

prior_rules="$(/sbin/pfctl -a "$anchor" -sr)"
[[ -z "$prior_rules" || "$prior_rules" == "$expected_tcp"$'\n'"$expected_udp" ]] || {
  print -u2 'PF anchor contains unexpected rules; stopping before install.'
  exit 1
}
installed=false
success=false
rollback_failed_install() {
  [[ "$success" == true || "$installed" == false ]] && return
  print -u2 'PF installation did not finish; reconciling only the files and reference created by this installer.'
  set +e
  if [[ "$installed" == preparing ]]; then
    /bin/rm -f "$root_dir/pf-remove.zsh.next" "$root_dir/pf-remove.zsh"
    /bin/rmdir "$root_dir" >/dev/null 2>&1 || print -u2 'Partial PF directory remains; inspect before retrying.'
    return
  fi
  /bin/zsh "$root_dir/pf-remove.zsh" --locked
  removal_status=$?
  if [[ "$removal_status" == 0 && -n "$prior_rules" ]]; then
    print 'block drop out quick on lo0 proto { tcp, udp } all user papercliprunner' | /sbin/pfctl -a "$anchor" -f -
    restore_status=$?
    restored_rules="$(/sbin/pfctl -a "$anchor" -sr)"
    if [[ "$restore_status" == 0 && "$restored_rules" == "$prior_rules" ]]; then
      print -u2 'The pre-existing temporary UID-504 rule was restored.'
    else
      print -u2 'Automatic rollback could not restore the pre-existing PF rule. Keep the runner unassigned.'
    fi
  elif [[ "$removal_status" != 0 ]]; then
    print -u2 'Automatic rollback was incomplete. Leave the runner unassigned and inspect launchd/PF before retrying.'
  fi
}
trap rollback_failed_install EXIT

installed=preparing
/usr/bin/install -d -o root -g wheel -m 700 "$root_dir"
/usr/bin/install -o root -g wheel -m 700 "$source_dir/remove-paperclip-runner-pf.command" "$root_dir/pf-remove.zsh.next"
[[ "$(hash_file "$root_dir/pf-remove.zsh.next")" == "$expected_remove_hash" && "$(stat -f '%u:%Lp' "$root_dir/pf-remove.zsh.next")" == '0:700' ]] || {
  print -u2 'Staged PF remover identity or mode mismatch.'; exit 1
}
/bin/mv "$root_dir/pf-remove.zsh.next" "$root_dir/pf-remove.zsh"
installed=true
/usr/bin/install -o root -g wheel -m 600 "$source_dir/paperclip-runner-pf.rules" "$root_dir/pf.rules"
/usr/bin/install -o root -g wheel -m 700 "$source_dir/paperclip-runner-pf-guard.zsh" "$root_dir/pf-guard.zsh"
/usr/bin/install -o root -g wheel -m 644 "$source_dir/agency.createsomething.papercliprunner.pf.plist" "$plist"
[[ "$(sudo /usr/bin/shasum -a 256 "$root_dir/pf-guard.zsh" | /usr/bin/awk '{print $1}')" == "$expected_guard_hash" ]] || { print -u2 'Installed PF guard hash mismatch.'; exit 1; }
[[ "$(sudo /usr/bin/shasum -a 256 "$root_dir/pf.rules" | /usr/bin/awk '{print $1}')" == "$expected_rule_hash" ]] || { print -u2 'Installed PF rule hash mismatch.'; exit 1; }
[[ "$(sudo /usr/bin/shasum -a 256 "$plist" | /usr/bin/awk '{print $1}')" == "$expected_plist_hash" ]] || { print -u2 'Installed PF plist hash mismatch.'; exit 1; }
[[ "$(sudo stat -f '%u:%Lp' "$root_dir")" == '0:700' && "$(sudo stat -f '%u:%Lp' "$root_dir/pf.rules")" == '0:600' && "$(sudo stat -f '%u:%Lp' "$root_dir/pf-guard.zsh")" == '0:700' && "$(sudo stat -f '%u:%Lp' "$root_dir/pf-remove.zsh")" == '0:700' && "$(sudo stat -f '%u:%Lp' "$plist")" == '0:644' ]] || {
  print -u2 'Installed PF ownership/mode readback failed.'
  exit 1
}

# Activate under the install lock before launchd's RunAtLoad job can acquire it.
# The launchd activation observes the same owned token after this transaction.
/bin/zsh "$root_dir/pf-guard.zsh" --locked
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
key_file='/Users/micahjohnson/Library/Application Support/CREATE SOMETHING/Paperclip Browser Runner/ssh/id_ed25519'
known_hosts_file='/Users/micahjohnson/.ssh/paperclip_runner_known_hosts'
runner_result="$(/usr/bin/ssh -F /dev/null -i "$key_file" -o IdentitiesOnly=yes -o ConnectionAttempts=1 -o ConnectTimeout=5 -o UserKnownHostsFile="$known_hosts_file" -o StrictHostKeyChecking=yes -o BatchMode=yes papercliprunner@127.0.0.1 'python3 -c '\''import socket,subprocess,sys; s=socket.socket(); s.settimeout(2); local=s.connect_ex(("127.0.0.1",3101)); public=subprocess.run(["/usr/bin/curl","--noproxy","*","-fsS","--max-time","8","--output","/dev/null","--write-out","%{http_code}","https://example.com/"],capture_output=True,text=True); print("local_denied="+str(local!=0)); print("public_200="+str(public.returncode==0 and public.stdout=="200")); sys.exit(0 if local!=0 and public.returncode==0 and public.stdout=="200" else 1)'\''')"
print -r -- "$runner_result"
[[ "$runner_result" == *'local_denied=True'* && "$runner_result" == *'public_200=True'* ]] || {
  print -u2 'Paired runner network proof failed.'
  exit 1
}
success=true
print 'Persistent PF guard installed for UID 504; host-positive, runner-local denial, and runner-public controls passed.'
print "Rollback command: zsh '$source_dir/remove-paperclip-runner-pf.command'"
