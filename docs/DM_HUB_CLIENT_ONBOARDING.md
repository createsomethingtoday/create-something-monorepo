# DM Client Onboarding (Zoom Operator-Controlled, No Key Handoff)

## Goal

Onboard the client without sharing keys in chat, docs, or email. Operator enters credentials directly during Zoom remote control.

## Policy

- Client never receives raw `MCP_API_KEY` or `HUB_API_TOKEN` as a handoff artifact.
- Keys are operator-held only (password manager / secrets vault).
- No key exchange through Zoom chat, email, Slack, or ticket systems.

## Operator Prep (Before Zoom)

```bash
# Operator-only variables (set locally before call)
export DM_ENDPOINT="https://dm.mcp.workway.co/mcp"
export HUB_ENDPOINT="https://cs-mcp-hub-remote.createsomething.workers.dev/mcp"

# Pull secrets from your vault at call time (do not store in docs)
# HALFDOZEN_DM_MCP_API_KEY=<from vault>
# HUB_API_TOKEN=<from vault>
```

## Zoom Session Controls

- Disable recording.
- Disable AI notetakers/transcription bots.
- Use waiting room and admit only the client.
- Use Zoom remote control so operator performs all config edits.

## Live Onboarding Flow (No Terminal Required for Client)

### 1) Configure DM MCP in client app

Operator opens the client MCP config file via GUI and inserts values directly.

DM server settings:

- URL: `https://dm.mcp.workway.co/mcp`
- Header: `Authorization: Bearer <operator-pastes-dm-key>`

### 2) Configure Hub MCP in client app (if used)

Hub server settings:

- URL: `https://cs-mcp-hub-remote.createsomething.workers.dev/mcp?token=<operator-pastes-hub-token>`
- Optional session header (if required by your policy):
  - `X-MCP-Session-Token: <operator-pastes-session-token>`

### 3) Restart client app

Operator restarts the MCP host app so config is reloaded.

### 4) Verify tool visibility

Operator confirms DM/Hub tools are listed and callable from the client host UI.

## Operator Verification (Optional CLI, Operator Machine)

```bash
# Expected: DM no-auth returns 401
curl -i "$DM_ENDPOINT"

# Expected: DM with key is authenticated (status may be non-401 depending on request shape)
curl -i "$DM_ENDPOINT" -H "Authorization: Bearer $HALFDOZEN_DM_MCP_API_KEY"

# Expected: Hub no token returns 401
curl -i "$HUB_ENDPOINT"

# Expected: Hub tokened endpoint is authenticated path (non-401 on valid MCP request)
curl -i "$HUB_ENDPOINT?token=$HUB_API_TOKEN"
```

## Post-Session Hygiene

- Clear clipboard on both operator and client machines.
- Ensure no plaintext keys are left in notes or chat.
- Close all editor tabs that displayed secrets.
- If any secret was displayed visibly to participants, rotate immediately.

## Rotation Trigger

Rotate keys immediately if:

- meeting was recorded,
- keys were pasted into chat,
- unknown participants joined,
- or screen share exposed secrets to unintended viewers.
