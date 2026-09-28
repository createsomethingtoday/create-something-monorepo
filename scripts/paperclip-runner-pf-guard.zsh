#!/bin/zsh
set -euo pipefail
umask 077

anchor='com.apple/papercliprunner-browser-boundary'
root_dir='/Library/Application Support/CREATE SOMETHING/Paperclip Runner'
rule_file="$root_dir/pf.rules"
token_file="$root_dir/pf-enable-token"
lock_file='/var/run/agency.createsomething.papercliprunner.pf.lock'
expected_tcp='block drop out quick on lo0 proto tcp all user = 504'
expected_udp='block drop out quick on lo0 proto udp all user = 504'
new_token=''
success=false

cleanup_failed_activation() {
  if [[ "$success" != true && -n "$new_token" ]]; then
    /sbin/pfctl -X "$new_token" >/dev/null 2>&1 || print -u2 'PF token release failed after guard error.'
    if [[ -f "$token_file" && ! -L "$token_file" ]]; then
      record="$(/bin/cat "$token_file")"
      [[ "$record" == "$boot_id $new_token" ]] && /bin/rm -f "$token_file"
    fi
  fi
}
trap cleanup_failed_activation EXIT

[[ "$(id -u)" == '0' ]] || { print -u2 'PF guard requires root.'; exit 1; }
if [[ "${1:-}" != '--locked' ]]; then
  exec /usr/bin/lockf -k -t 20 "$lock_file" /bin/zsh "$0" --locked
fi
[[ "$(dscl . -read /Users/papercliprunner UniqueID | awk '{print $2}')" == '504' ]] || {
  print -u2 'Runner UID changed; refusing to change PF.'
  exit 1
}
[[ ! -L "$root_dir" && "$(stat -f '%u:%Lp' "$root_dir")" == '0:700' ]] || {
  print -u2 'PF guard directory ownership/mode changed.'
  exit 1
}
[[ ! -L "$rule_file" && "$(stat -f '%u:%Lp' "$rule_file")" == '0:600' ]] || {
  print -u2 'PF rule ownership/mode changed.'
  exit 1
}
/sbin/pfctl -nf "$rule_file" >/dev/null
boot_id="$(/usr/sbin/sysctl -n kern.bootsessionuuid)"
[[ "$boot_id" =~ '^[A-Fa-f0-9-]{36}$' ]] || { print -u2 'Could not read boot identity.'; exit 1; }

verify_rules() {
  local current
  current="$(/sbin/pfctl -a "$anchor" -sr)"
  [[ "$current" == "$expected_tcp"$'\n'"$expected_udp" ]]
}

owned_token=''
if [[ -e "$token_file" ]]; then
  [[ ! -L "$token_file" && "$(stat -f '%u:%Lp' "$token_file")" == '0:600' ]] || {
    print -u2 'PF token file ownership/mode changed.'
    exit 1
  }
  local_boot=''; local_token=''
  read -r local_boot local_token < "$token_file" || true
  if [[ "$local_boot" == "$boot_id" && "$local_token" == <-> ]]; then
    owned_token="$local_token"
  fi
fi

pf_state="$(/sbin/pfctl -s info)"
changed=false
if [[ -z "$owned_token" || "$pf_state" != *'Status: Enabled'* ]]; then
  # Acquire a reference even if another service already enabled PF.
  enable_output="$(/sbin/pfctl -E 2>&1)"
  new_token="$(print -r -- "$enable_output" | sed -nE 's/.*Token[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' | head -1)"
  [[ "$new_token" == <-> ]] || { print -u2 'PF enable token missing; inspect PF state.'; exit 1; }
  token_tmp="$token_file.$$"
  print -r -- "$boot_id $new_token" > "$token_tmp"
  /bin/chmod 600 "$token_tmp"
  /bin/mv -f "$token_tmp" "$token_file"
  owned_token="$new_token"
  changed=true
fi

if ! verify_rules; then
  /sbin/pfctl -a "$anchor" -f "$rule_file"
  changed=true
fi
verify_rules || { print -u2 'PF guard rule readback failed.'; exit 1; }
success=true
if [[ "$changed" == true ]]; then
  print 'Paperclip runner PF guard active: UID 504 TCP/UDP loopback denied.'
fi
