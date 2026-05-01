# Calm Operator Ink Firmware

Production-oriented firmware for M5Stack Core Ink as the pocket surface for
CREATE SOMETHING operations.

The firmware is intentionally simple:

- Wi-Fi only. BLE/iPhone notification capture is not part of this build.
- Polls `https://ink.createsomething.agency` for the current operator brief.
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

- `INK_DEVICE_TOKEN` or `INK_SOURCE_TOKEN`

Recommended values:

- `CALM_OPERATOR_WIFI_SSID`
- `CALM_OPERATOR_WIFI_PASSWORD`

If Wi-Fi values are not present, the firmware tries saved ESP32 Wi-Fi
credentials from a previous firmware before showing a setup screen.

`INK_SOURCE_TOKEN` currently works as a compatibility token for device reads, but
a dedicated `INK_DEVICE_TOKEN` should be used for a shipped device.

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
- From the brief screen, select opens the menu.
- `PWR`: manual sync.

The menu shows the current bucket and position, for example `Operator 1/10`.
Each selected item includes a one-line purpose. The footer keeps action hints on
the left and battery/sound state on the right.

Menu buckets:

- `Operator`: Sync, MCP Review, Check In
- `Rhythm`: Clock, Rhythm
- `Calm`: Calm Reset, Stone Garden
- `Settings`: Alerts, Quiet Mode, Status

Local settings are stored on the device:

- `Alerts` toggles sound alerts on or off.
- `Quiet Mode` suppresses all beeps without changing the alert preference.
- The footer shows `BEEP`, `MUTE`, or `QUIET` so the current sound behavior is visible.

`MCP Review` runs the live remote health-review path and may take 20-45 seconds
because it collects remote MCP and agent health before rendering the summary.
Fresh live review results show `LIVE OK` in the footer when no operator action
is needed.

`Check In` records a lightweight operator heartbeat with the bridge. It confirms
that Ink can write back to the operator system without creating an alert.

## Notes

Core Ink is an e-ink surface. Keep refreshes deliberate. Operator alerts and
health summaries should feel like a physical briefing, not a small phone.

The firmware renders each screen to an offscreen canvas and pushes one completed
frame to e-ink. It also skips duplicate frames, so automatic syncs that return
the same operator state do not visibly refresh the screen.
