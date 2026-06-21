# Even Operator Brief

CREATE SOMETHING operator-priority plugin for Even G2.

This app is a private heads-up surface over the existing Calm Operator Ink bridge.
It renders the current Linear open-items queue from:

```text
https://ink.createsomething.agency/ink/linear-open?team=CRE&limit=5
```

## Role

- Show the first few open `CRE` Linear issues as a selectable queue.
- Keep each issue to a compact identifier plus title line.
- Swipe up/down to move selection.
- Tap once to open issue detail.
- Tap detail to open a claim confirmation.
- Tap confirmation to claim the issue through the Ink bridge.
- Let a double tap exit through the Even system confirmation flow.
- Reuse the Ink bridge as the device-authenticated server-side proxy so the
  phone package never carries a Linear token.

## Runtime Configuration

The app needs a low-privilege Ink device token. Do not commit it.

Supported configuration paths:

```bash
VITE_INK_DEVICE_TOKEN=... pnpm --filter @create-something/even-operator-brief dev
```

or pass the token once in the sideload URL:

```text
http://<LAN-IP>:5173?token=<INK_DEVICE_TOKEN>
```

The app stores a query-string token in browser local storage so repeated QR
sideloads can omit it. Use only `INK_DEVICE_TOKEN`; do not use `INK_SOURCE_TOKEN`
or broader operator credentials in a client-distributed build.

Optional bridge override:

```text
http://<LAN-IP>:5173?bridge=https://ink.createsomething.agency
```

## Local Simulator

Run the app:

```bash
pnpm --filter @create-something/even-operator-brief dev
pnpm --filter @create-something/even-operator-brief simulator
```

If the simulator shows `Missing device token`, restart with
`VITE_INK_DEVICE_TOKEN` or include `?token=...` in the simulator URL.

## Hardware Sideload

Find the Mac Wi-Fi LAN IP:

```bash
ipconfig getifaddr en0
```

Start Vite on the LAN:

```bash
VITE_INK_DEVICE_TOKEN=... pnpm --filter @create-something/even-operator-brief dev
```

Generate the QR:

```bash
pnpm --filter @create-something/even-operator-brief exec evenhub qr --url "http://<LAN-IP>:5173"
```

Scan it from the Even Realities phone app with developer mode enabled.

## Package

The Even manifest is [app.json](./app.json). It includes only one network
permission, whitelisted to `https://ink.createsomething.agency`.

Build and package:

```bash
pnpm --filter @create-something/even-operator-brief build
pnpm --filter @create-something/even-operator-brief pack:even
```

## Validation

```bash
pnpm --filter @create-something/even-operator-brief check
pnpm --filter @create-something/even-operator-brief test
pnpm --filter @create-something/even-operator-brief build
```

Hardware validation still needs a real G2 QR sideload because local type checks
and Vite build do not prove bridge behavior on glasses.
