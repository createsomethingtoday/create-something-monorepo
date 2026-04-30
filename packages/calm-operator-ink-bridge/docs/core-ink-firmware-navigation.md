# Core Ink Firmware Navigation Handoff

The bridge owns the production navigation contract. Firmware should prefer
`GET /ink/navigation` and fall back to this static map only when offline.

## Source Of Truth

Fetch with the device token:

```bash
curl -sS https://ink.createsomething.agency/ink/navigation \
  -H "x-ink-token: $INK_DEVICE_TOKEN"
```

`GET /ink/brief` includes the same `navigation` object, so firmware can refresh
brief content and menu shape with one request.

## Top-Level Buckets

Use these labels exactly on Core Ink:

| Bucket | Actions | Purpose |
| --- | --- | --- |
| `Operator` | `sync`, `mcp_review` | Work states that may need judgment |
| `Rhythm` | `clock` | Time awareness without constant refresh |
| `Calm` | `calm_reset`, `stone_garden` | Local calming tools; replaces `Games` |
| `Settings` | `alert_settings` | Local alert/beep/vibration preferences |

Do not show a top-level `Games` bucket. Stone Garden and Calm Reset are both
calm tools, not games in the product language.

## Recommended Button Model

Core Ink should keep navigation shallow because e-ink refresh is slow.

From the normal operator brief:

- main short press: acknowledge/clear the current active alert locally
- main long press: open top-level menu
- side/rotary next: cycle bucket or action selection
- side/rotary previous: cycle backward when available
- side/rotary press: select highlighted item or return/back, depending screen

Inside a bucket:

- main short press: run/select highlighted action
- main long press: return to operator brief
- side/rotary next: move highlight
- side/rotary previous: move highlight backward when available

Urgent alerts should preempt local calm tools. If an urgent alert is active,
require one short press to acknowledge before allowing entry to `Calm`.

## Action Behavior

| Action | Kind | Firmware behavior |
| --- | --- | --- |
| `sync` | remote `GET /ink/brief` | Fetch brief and redraw the operator screen |
| `mcp_review` | remote `POST /ink/health-review/request` | Show returned health summary |
| `clock` | remote `GET /ink/clock` | Draw on-demand time screen; avoid minute polling |
| `calm_reset` | local | Show short breathing/reset sequence; no network |
| `stone_garden` | local | Show a slow e-ink-native arrangement surface |
| `alert_settings` | local | Toggle alert output preferences |

Remote actions should show a brief loading state, but avoid repeated full-screen
flashing. If an HTTP request fails, show the prior screen plus a compact status:

```text
SYNC FAILED
Check hotspot/Wi-Fi
```

## E-Ink Constraints

Design interaction around deliberate changes:

- no animations
- no minute-by-minute clock refresh unless explicitly open
- no cursor blinking
- prefer high-contrast selected rows
- redraw only after selection changes or remote response
- use short labels on small screens: `Ops`, `Time`, `Calm`, `Set`

## Firmware Completion Criteria

- Top-level menu says `Calm`, not `Games`.
- `Calm` contains `Calm Reset` and `Stone Garden`.
- `Operator` contains `Sync` and `MCP Review`.
- `Rhythm` contains `Clock`.
- Urgent alerts block entry into `Calm` until acknowledged.
- `MCP Review` renders the production summary:
  `1013 MCPs, 22 fleet, 4 agents; Live 13/13; failed 0; tools 915`.
