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
- Long-press `B` on the brief opens the Detail view (the bridge's extended
  context for the active alert or health item). Short-press still opens the
  menu.
- `PWR`: manual sync.

The menu shows the current bucket and position, for example `Operator 1/11`.
Each selected item includes a one-line purpose. The footer keeps action hints on
the left and battery/sound state on the right.

Menu buckets:

- `Operator`: Sync, MCP Review, Check In
- `Rhythm`: Clock, Rhythm
- `Calm`: Calm Reset, Stone Garden
- `Settings`: Alerts, Quiet Mode, Update, Status

The Rhythm screen fetches `/ink/rhythm` from the bridge and renders up to five
daily anchors. Its footer starts with `Bridge`, `Default`, or `Offline` so the
operator can tell whether the anchors came from deployment config, firmware
fallbacks, or the last known local values.

Stone Garden places one stone per `B` press at the cursor. When all nine slots
are filled, the next `B` clears the garden and starts a fresh cycle.

Local settings and the last brief are stored on the device:

- `Alerts` toggles sound alerts on or off.
- `Quiet Mode` suppresses all beeps without changing the alert preference.
- The footer shows `BEEP`, `MUTE`, or `QUIET` so the current sound behavior is visible.
- The last successful brief is persisted to NVS so the next boot can render
  it before Wi-Fi is up. The footer reads `Cached` until the fresh fetch
  lands.

The brief footer also shows a trust signal on the left:

- `Synced now` immediately after a successful sync.
- `Synced Nm` / `Synced Nh` while the last successful sync ages.
- `Stale` after 24 hours without a successful sync.
- `Cached` when the visible brief came from NVS at boot.
- `ATTENTION` when the bridge marks the brief urgent (takes precedence).

Battery state appears on the right side of the footer. When the pack falls
to or below 15 %, the label switches to `LOW` so it stays glanceable; when
full and above 4.15 V it shows `FULL`.

The device seeds its BM8563 RTC from every successful bridge clock payload
(both `/ink/clock` and the `clock` field embedded in `/ink/brief`). When
`/ink/clock` is unreachable the Clock screen falls back to the RTC and the
footer includes `RTC` so the operator knows the time is locally tracked.
When the RTC backup coin cell drops, the Status screen shows `RTC LOW` so
the operator can service the device before the clock returns to bridge-only.

## OTA firmware update

`Settings > Update` fetches `GET /ink/firmware/manifest` from the bridge.
The bridge returns a manifest of the shape `{ version, url, sha256, size,
signature, notes? }` when `INK_FIRMWARE_MANIFEST_JSON` is set, or `null`
when the channel is not configured.

### Layered safety

1. **ECDSA P-256 signature verification.** The manifest carries a base64
   signature over `"${version}|${sha256}|${size}"`. The device verifies it
   with the public key in `include/firmware_signing_pubkey.h` before
   considering the manifest at all. Missing signature -> `UNSIGNED MANIFEST`.
   Bad signature -> `SIGNATURE FAILED`. No download attempted in either case.
2. **Long-press gate.** Hold `B` (≥0.5 s) to apply. Short-press exits to the
   menu. A single tap can never flash unsigned firmware.
3. **Streaming SHA-256 of the downloaded image.** The apply path writes the
   .bin into the inactive OTA partition while hashing every chunk. The hash
   is compared to `manifest.sha256` before `Update.end(true)` commits the
   new partition. Any mismatch aborts before the bootloader switches.

### Publishing a signed build

One-time setup (already done on this repo; recorded here for posterity):

```bash
pnpm --dir packages/calm-operator-ink-firmware sign:keygen
# 1. Upload tmp/ink-signing-private.jwk.json contents to Infisical as
#    INK_FIRMWARE_SIGNING_PRIVATE_JWK
# 2. Delete the local file
# 3. Commit include/firmware_signing_pubkey.h
# 4. Reflash every device that should accept this signing key
```

For every release:

```bash
pnpm --dir packages/calm-operator-ink-firmware build

infisical run --env=prod --path=/ -- pnpm --dir packages/calm-operator-ink-firmware sign:manifest -- \
  --bin "$(pwd)/packages/calm-operator-ink-firmware/.pio/build/m5stack-coreink/firmware.bin" \
  --version 0.1.10 \
  --url "https://ink.createsomething.agency/ink/firmware/binary?version=0.1.10" \
  --notes "Brief description of changes"
```

Paste the printed JSON into `wrangler.toml`'s `INK_FIRMWARE_MANIFEST_JSON =
""" ... """` and redeploy the bridge, then upload the .bin to R2 (see
below).

### Self-hosted binary on the bridge (R2)

The firmware's manifest URL points at
`https://ink.createsomething.agency/ink/firmware/binary?version=X.Y.Z`. The
bridge streams the matching `firmware/X.Y.Z.bin` object out of an R2 bucket
bound as `FIRMWARE_BUCKET`.

One-time operator setup (requires a Cloudflare API token with R2 scope):

```bash
pnpm --dir packages/calm-operator-ink-bridge exec wrangler r2 bucket create \
  calm-operator-ink-firmware
# Then uncomment the [[r2_buckets]] block in wrangler.toml and redeploy.
```

Per release:

```bash
pnpm --dir packages/calm-operator-ink-bridge exec wrangler r2 object put \
  calm-operator-ink-firmware/firmware/0.1.10.bin \
  --file packages/calm-operator-ink-firmware/.pio/build/m5stack-coreink/firmware.bin
```

Until the R2 binding exists, `GET /ink/firmware/binary` returns a clean 503
with operator guidance; the manifest endpoint and signature verification
remain fully functional, so the device can still surface
"signature valid but binary not hosted" cleanly.

## Power discipline

The firmware enables Wi-Fi modem sleep (`WiFi.setSleep(true)`) on boot. The
radio idles between TCP transactions while the association stays up. A full
disconnect-after-sync was considered and rejected: the 5-10 s reassociation
cost would land on every manual operator action, which is worse for the
calm-glance experience than the additional milliamps modem sleep saves.
Deep/light sleep is intentionally out of scope on this build because PWR on
Core Ink is a reset (not a wake) and the e-ink retains its image anyway.

## Notes

Core Ink is an e-ink surface. Keep refreshes deliberate. Operator alerts and
health summaries should feel like a physical briefing, not a small phone.

The firmware renders each screen to an offscreen canvas and pushes one completed
frame to e-ink. It also skips duplicate frames, so automatic syncs that return
the same operator state do not visibly refresh the screen.

On boot the firmware paints a `CALM OPERATOR` boot frame before Wi-Fi
association and the first `/ink/brief` fetch, so the operator sees the device
is alive during the 10-15 second startup window.
