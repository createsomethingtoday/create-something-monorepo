#!/usr/bin/env bash
set -euo pipefail

RETOOL_MCP_SERVER_NAME="${RETOOL_MCP_SERVER_NAME:-retool}"
RETOOL_MCP_URL="${RETOOL_MCP_URL:-https://createsomething.retool.com/mcp}"
RETOOL_MCP_LOGIN="${RETOOL_MCP_LOGIN:-true}"
RETOOL_MCP_SCOPES="${RETOOL_MCP_SCOPES:-mcp:read}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

main() {
  require_cmd codex

  if codex mcp get "$RETOOL_MCP_SERVER_NAME" >/dev/null 2>&1; then
    echo "Codex MCP server already exists: ${RETOOL_MCP_SERVER_NAME}"
  else
    codex mcp add "$RETOOL_MCP_SERVER_NAME" --url "$RETOOL_MCP_URL"
    echo "Added Codex MCP server: ${RETOOL_MCP_SERVER_NAME} -> ${RETOOL_MCP_URL}"
  fi

  if [[ "$RETOOL_MCP_LOGIN" == "true" ]]; then
    local -a login_cmd=(codex mcp login "$RETOOL_MCP_SERVER_NAME")
    if [[ -n "$RETOOL_MCP_SCOPES" ]]; then
      login_cmd+=(--scopes "$RETOOL_MCP_SCOPES")
    fi
    "${login_cmd[@]}"
  else
    echo "Skipping OAuth login because RETOOL_MCP_LOGIN=false"
  fi
}

main "$@"
