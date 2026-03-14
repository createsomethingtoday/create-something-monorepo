#!/bin/bash

set -euo pipefail

DRY_RUN=1
MOVE_RUST=0
CLEAR_NPM=0
ARCHIVE_REPOS=0
UPDATE_ZSHRC=0
CLEAR_APP_CACHES=0
REPORT_ONLY=0

LACIE_ROOT="/Volumes/LaCie"
ARCHIVE_ROOT="$LACIE_ROOT/Archives/Github/Create Something"
RUST_CARGO_TARGET="$LACIE_ROOT/.cargo"
RUST_RUSTUP_TARGET="$LACIE_ROOT/.rustup"

REPOS=(
  "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo-openai-ui-salvage"
  "/Users/micahjohnson/Documents/Github/Create Something/Create Something"
  "/Users/micahjohnson/Documents/Github/Create Something/Python"
  "/Users/micahjohnson/Documents/Github/Create Something/Ownly Music"
  "/Users/micahjohnson/Documents/Github/Create Something/inception"
)

usage() {
  cat <<'EOF'
Usage:
  bash scripts/storage-relief.sh [options]

Options:
  --apply         Execute changes. Default is dry-run.
  --report        Only print the current pressure points.
  --clear-npm     Remove and recreate ~/.npm.
  --move-rust     Copy ~/.cargo and ~/.rustup to LaCie and print shell config.
  --update-zshrc  Append Rust-on-LaCie exports to ~/.zshrc if missing.
  --archive-repos Move a predefined set of large repo folders to LaCie archives.
  --clear-app-caches Remove a few large, low-risk app caches.
  --all           Run --clear-npm, --move-rust, --update-zshrc, --clear-app-caches, and --archive-repos together.
  -h, --help      Show this help.

Examples:
  bash scripts/storage-relief.sh --report
  bash scripts/storage-relief.sh --clear-npm
  bash scripts/storage-relief.sh --apply --clear-npm --move-rust
EOF
}

log() {
  printf '%s\n' "$*"
}

run_cmd() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '[dry-run] %s\n' "$*"
  else
    eval "$@"
  fi
}

require_path() {
  if [ ! -e "$1" ]; then
    log "skip: $1 does not exist"
    return 1
  fi
  return 0
}

report_sizes() {
  log "Disk pressure summary"
  df -h / "$LACIE_ROOT" 2>/dev/null || true
  log
  du -sh \
    "$HOME/.npm" \
    "$HOME/.cargo" \
    "$HOME/.rustup" \
    "$HOME/Documents/Github" \
    "$HOME/Library/Application Support/Notion" \
    "$HOME/Library/Application Support/Zed" \
    "$HOME/Library/Application Support/BraveSoftware" \
    "$HOME/Library/Developer/Xcode" \
    "$HOME/Library/Containers" \
    2>/dev/null | sort -h || true
}

append_if_missing() {
  local file="$1"
  local line="$2"
  if grep -Fqx "$line" "$file" 2>/dev/null; then
    log "present: $line"
  elif [ "$DRY_RUN" -eq 1 ]; then
    printf '[dry-run] append %s to %s\n' "$line" "$file"
  else
    printf '\n%s\n' "$line" >> "$file"
  fi
}

clear_npm() {
  if ! require_path "$HOME/.npm"; then
    return 0
  fi
  log
  log "Clearing ~/.npm"
  run_cmd "rm -rf \"$HOME/.npm\""
  run_cmd "mkdir -p \"$HOME/.npm\""
}

move_rust() {
  log
  log "Moving Rust toolchain/cache to $LACIE_ROOT"
  run_cmd "mkdir -p \"$RUST_CARGO_TARGET\" \"$RUST_RUSTUP_TARGET\""

  if [ -d "$HOME/.cargo" ]; then
    run_cmd "rsync -a \"$HOME/.cargo/\" \"$RUST_CARGO_TARGET/\""
  else
    log "skip: $HOME/.cargo does not exist"
  fi

  if [ -d "$HOME/.rustup" ]; then
    run_cmd "rsync -a \"$HOME/.rustup/\" \"$RUST_RUSTUP_TARGET/\""
  else
    log "skip: $HOME/.rustup does not exist"
  fi

  cat <<EOF

Add these lines to ~/.zshrc after the move:
export CARGO_HOME="$RUST_CARGO_TARGET"
export RUSTUP_HOME="$RUST_RUSTUP_TARGET"

Optional:
export CARGO_TARGET_DIR="$LACIE_ROOT/cargo-targets/create-something-monorepo"
EOF
}

update_zshrc() {
  local zshrc="$HOME/.zshrc"
  log
  log "Updating $zshrc with Rust-on-LaCie environment"
  append_if_missing "$zshrc" "export CARGO_HOME=\"$RUST_CARGO_TARGET\""
  append_if_missing "$zshrc" "export RUSTUP_HOME=\"$RUST_RUSTUP_TARGET\""
  append_if_missing "$zshrc" "export CARGO_TARGET_DIR=\"$LACIE_ROOT/cargo-targets/create-something-monorepo\""
}

archive_repos() {
  log
  log "Archiving large repos to $ARCHIVE_ROOT"
  run_cmd "mkdir -p \"$ARCHIVE_ROOT\""
  for repo in "${REPOS[@]}"; do
    if [ -e "$repo" ]; then
      run_cmd "mv \"$repo\" \"$ARCHIVE_ROOT/\""
    else
      log "skip: $repo does not exist"
    fi
  done
}

clear_app_caches() {
  local caches=(
    "$HOME/Library/Caches/com.postmanlabs.mac.ShipIt"
    "$HOME/Library/Caches/zen"
    "$HOME/Library/Caches/SiriTTS"
  )
  log
  log "Clearing selected app caches"
  for cache_dir in "${caches[@]}"; do
    if [ -e "$cache_dir" ]; then
      run_cmd "rm -rf \"$cache_dir\""
    else
      log "skip: $cache_dir does not exist"
    fi
  done
}

if [ "$#" -eq 0 ]; then
  usage
  exit 0
fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply)
      DRY_RUN=0
      ;;
    --report)
      REPORT_ONLY=1
      ;;
    --clear-npm)
      CLEAR_NPM=1
      ;;
    --move-rust)
      MOVE_RUST=1
      ;;
    --update-zshrc)
      UPDATE_ZSHRC=1
      ;;
    --archive-repos)
      ARCHIVE_REPOS=1
      ;;
    --clear-app-caches)
      CLEAR_APP_CACHES=1
      ;;
    --all)
      CLEAR_NPM=1
      MOVE_RUST=1
      UPDATE_ZSHRC=1
      CLEAR_APP_CACHES=1
      ARCHIVE_REPOS=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

report_sizes

if [ "$REPORT_ONLY" -eq 1 ]; then
  exit 0
fi

if [ "$CLEAR_NPM" -eq 0 ] && [ "$MOVE_RUST" -eq 0 ] && [ "$UPDATE_ZSHRC" -eq 0 ] && [ "$CLEAR_APP_CACHES" -eq 0 ] && [ "$ARCHIVE_REPOS" -eq 0 ]; then
  log
  log "Nothing selected. Use --report, --clear-npm, --move-rust, --update-zshrc, --clear-app-caches, --archive-repos, or --all."
  exit 0
fi

if [ "$CLEAR_NPM" -eq 1 ]; then
  clear_npm
fi

if [ "$MOVE_RUST" -eq 1 ]; then
  move_rust
fi

if [ "$UPDATE_ZSHRC" -eq 1 ]; then
  update_zshrc
fi

if [ "$CLEAR_APP_CACHES" -eq 1 ]; then
  clear_app_caches
fi

if [ "$ARCHIVE_REPOS" -eq 1 ]; then
  archive_repos
fi
