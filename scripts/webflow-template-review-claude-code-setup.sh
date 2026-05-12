#!/usr/bin/env bash
set -euo pipefail

reviewer="${1:-}"
scope="${2:-user}"
dry_run="${DRY_RUN:-0}"

if [[ "${3:-}" == "--dry-run" || "$scope" == "--dry-run" ]]; then
  dry_run="1"
  [[ "$scope" == "--dry-run" ]] && scope="user"
fi

usage() {
  cat >&2 <<'EOF'
Usage: scripts/webflow-template-review-claude-code-setup.sh <reviewer|all> [scope]

Reviewers: eric, natalia, mariana, vicki, micah, sudiksha, all
Scopes:    user, local, project
Options:   --dry-run as the third argument, or DRY_RUN=1

The installed Claude Code MCP config uses a headersHelper so bearer tokens are
resolved from Infisical at connection time instead of being written into config.
EOF
}

if [[ -z "$reviewer" ]]; then
  usage
  exit 64
fi

case "$scope" in
  user|local|project) ;;
  *)
    echo "Invalid scope: $scope" >&2
    usage
    exit 64
    ;;
esac

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code CLI is required: missing 'claude' on PATH." >&2
  exit 69
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
headers_helper="$script_dir/webflow-template-review-mcp-headers.sh"

url_for_reviewer() {
  case "$1" in
    eric) echo "https://wf-template-review-eric.mcp.createsomething.agency/mcp" ;;
    natalia) echo "https://wf-template-review-natalia.mcp.createsomething.agency/mcp" ;;
    mariana) echo "https://wf-template-review-mariana.mcp.createsomething.agency/mcp" ;;
    vicki) echo "https://wf-template-review-vicki.mcp.createsomething.agency/mcp" ;;
    micah) echo "https://wf-template-review-micah.mcp.createsomething.agency/mcp" ;;
    sudiksha) echo "https://wf-template-review-sudiksha.mcp.createsomething.agency/mcp" ;;
    *)
      echo "Unknown reviewer: $1" >&2
      exit 64
      ;;
  esac
}

add_reviewer() {
  local reviewer_name="$1"
  local url
  local server_name
  local json

  url="$(url_for_reviewer "$reviewer_name")"
  server_name="webflow-template-review-${reviewer_name}"
  json="$(
    node -e '
      const [url, helper, reviewer] = process.argv.slice(1);
      console.log(JSON.stringify({
        type: "http",
        url,
        headersHelper: `${helper} ${reviewer}`
      }));
    ' "$url" "$headers_helper" "$reviewer_name"
  )"

  if [[ "$dry_run" == "1" ]]; then
    echo "Dry run $server_name ($scope): $json"
  else
    claude mcp add-json "$server_name" "$json" --scope "$scope"
    echo "Installed $server_name ($scope): $url"
  fi
}

if [[ "$reviewer" == "all" ]]; then
  for reviewer_name in eric natalia mariana vicki; do
    add_reviewer "$reviewer_name"
  done
else
  add_reviewer "$reviewer"
fi

cat <<'EOF'

Next checks:
  claude mcp list
  claude mcp get webflow-template-review-<reviewer>

Then open Claude Code and run /mcp to confirm the server is connected.
EOF
