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

require_runner_quiescent() {
  /usr/bin/python3 - <<'PY'
import json, sys, urllib.request
base = 'http://127.0.0.1:3101/api/companies/1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
try:
    with opener.open(base + '/agents', timeout=3) as response:
        agents = json.load(response)
    with opener.open(base + '/live-runs', timeout=3) as response:
        runs = json.load(response)
    with opener.open('http://127.0.0.1:3101/api/environments/8da4aa7c-eecc-4f39-a6fc-67368e209834', timeout=3) as response:
        environment = json.load(response)
except Exception as error:
    sys.exit('Paperclip quiescence readback failed: ' + type(error).__name__)
if not isinstance(agents, list) or not isinstance(runs, list) or not isinstance(environment, dict):
    sys.exit('Paperclip quiescence readback had an unexpected shape')
runner_environment = '8da4aa7c-eecc-4f39-a6fc-67368e209834'
if environment.get('id') != runner_environment or environment.get('status') != 'archived':
    sys.exit('Runner environment must be archived before removing the PF guard')
if any(not isinstance(agent, dict) or agent.get('defaultEnvironmentId') == runner_environment for agent in agents):
    sys.exit('Runner environment is assigned or agent inventory is invalid')
if any(not isinstance(run, dict) or run.get('environmentId') == runner_environment for run in runs):
    sys.exit('Runner environment has an active run or run inventory is invalid')
PY
  local command processes
  processes="$(/bin/ps -U papercliprunner -o comm=)" || return 1
  while IFS= read -r command; do
    case "$command" in
      ''|/usr/sbin/distnoted|/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/Metadata.framework/Versions/A/Support/mdbulkimport|/usr/libexec/lsd|/usr/sbin/cfprefsd) ;;
      *) print -u2 "Runner process is active: $command"; return 1 ;;
    esac
  done <<< "$processes"
}

reference_state() {
  /usr/bin/python3 - "$1" <<'PY'
import re, subprocess, sys
token = sys.argv[1]
result = subprocess.run(['/sbin/pfctl', '-s', 'References'], capture_output=True, text=True)
if result.returncode != 0:
    sys.exit('PF reference inventory failed')
lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
if lines == ['No pf_enabled references']:
    print('absent')
    sys.exit(0)
if len(lines) < 3 or lines[0] != 'TOKENS:' or not re.fullmatch(r'PID\s+Process Name\s+TOKEN\s+TIMESTAMP', lines[1]):
    sys.exit('Malformed PF reference inventory')
tokens = []
for line in lines[2:]:
    match = re.fullmatch(r'\d+\s+\S+\s+(\d+)\s+.+', line)
    if match is None:
        sys.exit('Malformed PF reference row')
    tokens.append(match.group(1))
print('present' if token in tokens else 'absent')
PY
}

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
anchor_clear_attempted=false
removal_complete=false
guard_was_loaded=false
recover_after_failed_removal() {
  [[ "$anchor_clear_attempted" == true && "$removal_complete" != true ]] || return
  set +e
  if [[ -f "$root_dir/pf.rules" && ! -L "$root_dir/pf.rules" ]]; then
    /sbin/pfctl -a "$anchor" -f "$root_dir/pf.rules"
    restore_status=$?
    restored_rules="$(/sbin/pfctl -a "$anchor" -sr)"
    if [[ "$restore_status" != 0 || "$restored_rules" != "$expected_tcp"$'\n'"$expected_udp" ]]; then
      print -u2 'PF removal recovery could not restore the blocking rule. Keep the environment archived.'
      return
    fi
    if [[ -f "$root_dir/pf-guard.zsh" ]]; then
      /bin/zsh "$root_dir/pf-guard.zsh" --locked || print -u2 'PF guard recovery failed; blocking rule is present, but token state needs inspection.'
    fi
    if [[ "$guard_was_loaded" == true ]]; then
      /bin/launchctl bootstrap system "$plist" || print -u2 'PF LaunchDaemon recovery failed; inspect before reactivating the environment.'
    fi
    print -u2 'Blocking PF rule restored after incomplete removal; environment remains archived.'
  else
    print -u2 'PF rule file unavailable during recovery. Keep the environment archived.'
  fi
}
trap recover_after_failed_removal EXIT
current_rules="$(/sbin/pfctl -a "$anchor" -sr)"
[[ -z "$current_rules" || "$current_rules" == "$expected_tcp"$'\n'"$expected_udp" ]] || {
  print -u2 'PF anchor contains unexpected rules; stopping.'
  exit 1
}

require_runner_quiescent || { print -u2 'Runner is not quiescent; anchor retained.'; exit 1; }
if /bin/launchctl print system/agency.createsomething.papercliprunner.pf >/dev/null 2>&1; then
  guard_was_loaded=true
  /bin/launchctl bootout system/agency.createsomething.papercliprunner.pf
fi
require_runner_quiescent || { print -u2 'Runner changed during removal; anchor retained.'; exit 1; }

if [[ -e "$token_file" ]]; then
  [[ ! -L "$token_file" && "$(stat -f '%u:%Lp' "$token_file")" == '0:600' ]] || {
    print -u2 'PF token file changed; anchor left in place for reconciliation.'
    exit 1
  }
  saved_boot=''; saved_token=''
  read -r saved_boot saved_token < "$token_file" || true
  current_boot="$(/usr/sbin/sysctl -n kern.bootsessionuuid)"
  [[ "$saved_boot" =~ '^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$' && "$current_boot" =~ '^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$' ]] || {
    print -u2 'Malformed PF boot identity; anchor left in place.'; exit 1
  }
  [[ "$saved_token" == <-> || ( "$saved_boot" == "$current_boot" && "$saved_token" == 'released' ) ]] || {
    print -u2 'Malformed PF token; anchor left in place.'; exit 1
  }
fi
anchor_clear_attempted=true
/sbin/pfctl -a "$anchor" -F rules
[[ -z "$(/sbin/pfctl -a "$anchor" -sr)" ]] || { print -u2 'PF anchor did not clear; files retained.'; exit 1; }
if [[ -e "$token_file" && "$saved_boot" == "$current_boot" && "$saved_token" != 'released' ]]; then
  token_state="$(reference_state "$saved_token")" || {
    print -u2 'PF reference readback failed; recovery will restore the blocking rule.'
    exit 1
  }
  if [[ "$token_state" == 'present' ]]; then
    /sbin/pfctl -X "$saved_token" || true
    token_state="$(reference_state "$saved_token")" || {
      print -u2 'PF reference readback failed after release; recovery will restore the blocking rule.'
      exit 1
    }
    if [[ "$token_state" != 'absent' ]]; then
      print -u2 'PF token release failed with a live reference; recovery will restore the blocking rule.'
      exit 1
    fi
  fi
  token_tmp="$token_file.$$"
  print -r -- "$current_boot released" > "$token_tmp"
  /bin/chmod 600 "$token_tmp"
  /bin/mv -f "$token_tmp" "$token_file"
fi
/bin/rm -f "$root_dir/pf-enable-token" "$root_dir/pf.rules" "$root_dir/pf-guard.zsh" "$root_dir/pf-remove.zsh" "$plist"
/bin/rmdir "$root_dir"
/bin/rmdir "$parent_dir" >/dev/null 2>&1 || true
removal_complete=true
print 'Persistent Paperclip runner PF guard removed; anchor empty. Keep the runner environment archived.'
