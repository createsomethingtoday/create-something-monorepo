# Calm Operator Ink Firmware

Production-oriented firmware for M5Stack Core Ink as the pocket surface for
CREATE SOMETHING operations.

The firmware is intentionally simple:

- Wi-Fi only. BLE/iPhone notification capture is not part of this build.
- Polls `https://ink.createsomething.agency` for the current operator brief.
- Shows up to four active Codex/Claude agent cards and their safe steering
  actions.
- Requests a live MCP/agent health review from Ink.
- Provides local rhythm, clock, settings, and calm tools.
- Uses slow, explicit e-ink refreshes instead of animated UI.
- Keeps the current screen visible during network work and redraws only when the
  final screen changes.

## Configure

Secrets stay out of git. Generate `include/operator_config.local.h` from
Infisical:

```bash
infisical run --env=prod --path=/ --command "pnpm --dir packages/calm-operator-ink-firmware config:write"
```

Required values:

- `INK_DEVICE_TOKEN`

Recommended values:

- `CALM_OPERATOR_WIFI_SSID`
- `CALM_OPERATOR_WIFI_PASSWORD`

If Wi-Fi values are not present, the firmware tries saved ESP32 Wi-Fi
credentials from a previous firmware before showing a setup screen.

HTTPS requests validate the Ink bridge certificate against the Google Trust
Services `GTS Root R4` trust anchor in `include/trust_roots.h`. The firmware
syncs device time over SNTP before the first HTTPS request so certificate
validity dates can be checked. If the production route moves to a certificate
chain outside that root, update `include/trust_roots.h` before flashing.

## Build

```bash
pnpm --dir packages/calm-operator-ink-firmware build
```

## Upload

The current Core Ink USB port is expected to be:

```text
/dev/cu.usbserial-5A6D0107571
```

Upload:

```bash
pnpm --dir packages/calm-operator-ink-firmware upload
```

Monitor:

```bash
pnpm --dir packages/calm-operator-ink-firmware monitor
```

## Controls

- `A`: previous menu item
- `C`: next menu item
- `B` or `EXT/main`: select
- From the brief screen, select opens the source/detail screen.
- From the source/detail screen, select opens the menu.
- In `Agents`, `A/C` move between agents or actions and `B` opens/selects.
- Consequential agent actions require a second `B` press on a confirmation
  screen. `A/C` cancels that confirmation.
- `PWR`: refresh the current agent console, or sync the brief elsewhere.

The agent surface polls every 30 seconds while it is open. It shows milestone
snapshots rather than token-level streaming so duplicate e-ink frames are
skipped. After a decision, the receipt screen distinguishes queueing from relay
acknowledgement, completion, or failure.

Actions that require free-form text are not submitted blank. The firmware
shows `TEXT REQUIRED`; those actions need the future push-to-talk microphone or
a phone handoff. Button-only decisions work with the Core Ink as shipped.

The home brief is intentionally one-glance:

- stable state label such as `OPERATOR PRIORITY`, `QUALITY DRIFT`, or
  `HEALTH ATTENTION`
- one strong focus line
- one smaller risk line
- boxed next-action area
- footer freshness plus signal, for example `Synced 2m BT` or
  `ATTENTION Linear`

The source/detail screen shows the signal family, generated age, source/alert
counts, and the strongest source label or link label that fits on the e-ink
surface. Langfuse appears here as quality/eval evidence, not as the policy or
work source of truth.

The menu shows the current bucket and position, for example `Operator 1/11`.
Each selected item includes a one-line purpose. The footer keeps action hints on
the left and battery/sound state on the right.

Menu buckets:

- `Operator`: Agents, Sync, MCP Review, Check In
- `Rhythm`: Clock, Rhythm
- `Calm`: Calm Reset, Stone Garden
- `Settings`: Alerts, Quiet Mode, Status

Local settings are stored on the device:

- `Alerts` toggles sound alerts on or off.
- `Quiet Mode` suppresses all beeps without changing the alert preference.
- The footer shows `BEEP`, `MUTE`, or `QUIET` so the current sound behavior is visible.

## Notes

Core Ink is an e-ink surface. Keep refreshes deliberate. Operator alerts and
health summaries should feel like a physical briefing, not a small phone.

The firmware renders each screen to an offscreen canvas and pushes one completed
frame to e-ink. It also skips duplicate frames, so automatic syncs that return
the same operator state do not visibly refresh the screen.
