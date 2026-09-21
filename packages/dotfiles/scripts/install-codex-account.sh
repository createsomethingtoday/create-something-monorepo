#!/usr/bin/env bash
# Explicit opt-in: install the manual helper, never a watcher or policy.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install_dir="${1:-$HOME/.local/bin}"
python3 -c 'import tomllib' || { echo 'Python 3.11+ is required.' >&2; exit 1; }
mkdir -p "$install_dir"
target="$install_dir/codex-account"
if [[ -e "$target" || -L "$target" ]]; then
    if [[ -L "$target" && "$(readlink "$target")" == "$script_dir/codex-account.py" ]]; then
        echo 'codex-account is already installed.'
        exit 0
    fi
    echo "Refusing to replace existing $target; review it first." >&2
    exit 1
fi
ln -s "$script_dir/codex-account.py" "$target"
echo "Installed $target. Run codex-account status or codex-account sync (preview)."
