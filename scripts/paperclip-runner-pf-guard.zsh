#!/bin/zsh
set -euo pipefail

anchor='com.apple/papercliprunner-browser-boundary'
root_dir='/Library/Application Support/CREATE SOMETHING/Paperclip Runner'
rule_file="$root_dir/pf.rules"
token_file="$root_dir/pf-enable-token"
expected_tcp='block drop out quick on lo0 proto tcp all user = 504'
expected_udp='block drop out quick on lo0 proto udp all user = 504'

[[ "$(id -u)" == '0' ]] || { print -u2 'PF guard requires root.'; exit 1; }
[[ "$(dscl . -read /Users/papercliprunner UniqueID | awk '{print $2}')" == '504' ]] || {
  print -u2 'Runner UID changed; refusing to change PF.'
  exit 1
}
[[ "$(stat -f '%u:%Lp' "$root_dir")" == '0:700' ]] || { print -u2 'PF guard directory ownership/mode changed.'; exit 1; }
[[ "$(stat -f '%u:%Lp' "$rule_file")" == '0:600' ]] || { print -u2 'PF rule ownership/mode changed.'; exit 1; }
/sbin/pfctl -nf "$rule_file" >/dev/null

verify_rules() {
  local current
  current="$(/sbin/pfctl -a "$anchor" -sr)"
  [[ "$current" == "$expected_tcp"$'\n'"$expected_udp" ]]
}

pf_state="$(/sbin/pfctl -s info)"
changed=false
if [[ "$pf_state" != *'Status: Enabled'* ]]; then
  enable_output="$(/sbin/pfctl -E 2>&1)"
  token="$(print -r -- "$enable_output" | sed -nE 's/.*Token[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' | head -1)"
  [[ -n "$token" ]] || { print -u2 'PF enable token missing; inspect PF state.'; exit 1; }
  umask 077
  token_tmp="$token_file.$$"
  print -r -- "$token" > "$token_tmp"
  /bin/mv -f "$token_tmp" "$token_file"
  changed=true
fi

if ! verify_rules; then
  /sbin/pfctl -a "$anchor" -f "$rule_file"
  changed=true
fi
verify_rules || { print -u2 'PF guard rule readback failed.'; exit 1; }
if [[ "$changed" == true ]]; then
  print 'Paperclip runner PF rule active: UID 504 TCP/UDP loopback denied.'
fi
