---
name: draw-agent
description: Connect an agent to an open Draw Canvas or Motion project, inspect and edit through its supported tools, show real activity, and recover after reload. Use when the user asks to draw, edit, animate, or work together in Draw, including browsers without WebMCP.
---

# Draw agent connection

Use the installed `draw-agent` MCP tools. Resolve this plugin's root two directories above this skill. If the host has not loaded newly installed tools yet, the identical supported adapter is available through `python3 <plugin-root>/scripts/draw-agent.py --call <tool-name>`, with a JSON argument object on stdin. Default production origin is https://draw.createsomething.agency. Do not inject browser globals, fabricate modelContext, use debugging connections to simulate WebMCP, or silently fall back to JSON import for a request to collaborate live.

## Connect to the intended project

1. Use `draw_agent_connections` and `draw_agent_status` to discover remembered pairings. A remembered pairing is not proof the browser is online. Match the exact project ID to the user's intended open project, including its Canvas/Motion navigation links. Never select a different project just because it is online.
2. If no matching live connection exists, use the user's selected browser to open Draw's **Connect agent → Create connection** controls. Read the visible pairing code privately and pass it to `draw_agent_connect` with an honest agent name. If browser access is unavailable, ask the user for the code from that control. Pairing authorizes this one project for up to 24 hours in the tab; codes expire after 10 minutes and work once. Never post codes or credentials in chat, artifacts, screenshots, shell arguments, or logs. Pass CLI arguments on stdin; keep any temporary argument file private and remove it after pairing.
3. Verify returned project ID, current mode and online status. The connection badge should display the agent. Tool calls pass through Draw's service; command receipts expire after 10 minutes. Pairing credentials remain outside the plugin in a private local file. Do not read browser storage to obtain credentials.
4. Call `draw_agent_tools` for the exact current catalog and schemas. Canvas and Motion expose different tools. Rediscover after switching modes. Existing browser-native WebMCP remains valid when the browser genuinely exposes it; use one connection path for a task, not both at once.

## Inspect, act, and verify

- Use `draw_agent_call` with the exact project ID, discovered tool name and schema-valid arguments. Inspect before editing. Use the returned revision and object IDs for revision-guarded edits. Keep human selection and camera separate from agent attention; use Follow agent only when the user wants camera following.
- Canvas tools automatically produce real operation activity. For a multi-step Canvas task, call `draw_agent_activity` with `state: begin`, a truthful label and `ids` (an empty array is valid). Retain its returned task ID for working/waiting/completed/failed updates. Never invent progress or leave a finished task labeled working. Task state is ephemeral and clears on reload; begin a fresh task after reconnecting rather than replaying an old task ID.
- Successful transport alone is not successful editing: require a completed receipt, inspect the tool result (including any application error), read the changed objects/revision back, and verify the rendered browser when the outcome is visual. End with editable artwork and an honest completion report.
- Inspect user data before reset/delete/replace or public sharing. Pairing is technical access, not blanket authorization for unrelated destructive actions or publication. Preserve unrelated objects and plugin workflows.

## Recovery

A reload or Canvas/Motion navigation restores this tab's pairing automatically. Wait for the correct project to be online, rediscover tools and inspect state before continuing. Closing the tab or expiry requires a new pairing. Do not represent a closed browser as an executing agent.

A `failed` receipt means inspect its error. `unknown` or `unconfirmed` means the outcome is uncertain: retain the command ID, call `draw_agent_receipt`, then inspect the actual project. Never automatically resend a mutation because a response timed out. Explicit command IDs must identify the same exact operation, never different arguments. The adapter remembers `lastCommandId` for interrupted calls; discover it via `draw_agent_connections`.

Use the visible **Disconnect agent** control or `draw_agent_disconnect` to revoke access when requested. Verify status is denied afterward. Do not claim new MCP tools are available in an already-running host until tool discovery proves it; use the supported CLI adapter in the current task and explain that a new task picks up installed tools automatically.

For narrated animations, continue with the sibling Draw & Motion + Descript skill. This connection does not replace its narration, asset, timing or export verification steps.
