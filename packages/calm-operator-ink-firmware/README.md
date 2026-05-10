# Calm Operator Ink Firmware

Production-oriented firmware for M5Stack Core Ink as the pocket surface for
CREATE SOMETHING operations.

Core Ink should work untethered after the initial firmware upload and secret
configuration. It should not depend on a nearby laptop for normal use. The
device keeps its local rhythm, sound settings, and Decision Garden state on the
device, then syncs compact operator signals to the bridge when Wi-Fi is
available.

The firmware is intentionally simple:

- Wi-Fi only. BLE/iPhone notification capture is not part of this build.
- Polls `https://ink.createsomething.agency` for the current operator brief.
- Requests a live MCP/agent health review from Ink.
- Provides local rhythm, clock, settings, and calm decision tools.
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
- `Calm`: Calm Reset, Decision Garden
- `Settings`: Alerts, Quiet Mode, Status

Local settings are stored on the device:

- `Alerts` toggles sound alerts on or off.
- `Quiet Mode` suppresses all beeps without changing the alert preference.
- The footer shows `BEEP`, `MUTE`, or `QUIET` so the current sound behavior is visible.
- `Decision Garden` stores its marked slots and cursor locally so the surface can
  keep working offline. `Check In` includes the Decision Garden count in the next
  operator event posted to the bridge, then clears the local queue after a
  successful post.

## Untethered Use

Core Ink is a low-frequency decision instrument, not a small computer.

Expected untethered flow:

1. Sync the current operator brief when Wi-Fi is available.
2. Step away from the laptop.
3. Use `Decision Garden` to mark slow, unresolved business signals offline.
4. Use `Check In` to post the compact state when Wi-Fi returns.
5. Let Retool, ChatGPT Apps, or repo-side agents expand that signal into a review
   packet before anything lands in code, config, client communication, or
   production.

In `Decision Garden`, `B` marks the current slot. When all nine slots are marked,
pressing `B` resets the garden locally.

Allowed offline work:

- calm reset
- daily rhythm review
- decision incubation
- marking high-level signals
- acknowledging that something needs desktop review later

Blocked offline work:

- production deploys
- permission changes
- client-visible publication
- secrets or credential changes
- employment, staffing, legal, or financial decisions

## Notes

Core Ink is an e-ink surface. Keep refreshes deliberate. Operator alerts and
health summaries should feel like a physical briefing, not a small phone.

The firmware renders each screen to an offscreen canvas and pushes one completed
frame to e-ink. It also skips duplicate frames, so automatic syncs that return
the same operator state do not visibly refresh the screen.
