#!/bin/zsh
set -u
staged_home="${CODEX_HOME:-}"
if [[ -n "$staged_home" ]]; then
  case "$staged_home" in
    /Users/papercliprunner/Code/create-something-monorepo/.paperclip-runtime/runs/*/workspace/.paperclip-runtime/codex/home) ;;
    *) print -u2 'Codex runner rejected an unexpected CODEX_HOME path'; exit 78 ;;
  esac
fi
cleanup_codex_home() {
  result=$?
  trap - EXIT
  if [[ -n "$staged_home" ]]; then
    /bin/rm -rf -- "$staged_home" || { print -u2 'Codex runner could not remove staged home'; exit 74; }
  fi
  exit "$result"
}
trap cleanup_codex_home EXIT
/Users/papercliprunner/.local/bin/node /Users/papercliprunner/.local/lib/node_modules/@openai/codex/bin/codex.js "$@"
