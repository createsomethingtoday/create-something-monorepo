# G2 Cloudflare Codex Access

This runbook owns the all-day Even G2 access path for Codex when Tailscale
cannot join the right tailnet.

Use this for operator access from the glasses, not for broad public demos. The
default posture is a 12-hour session, a dedicated hostname, a single Cloudflare
Tunnel, and a localhost-only Codex or Even Terminal origin.

There are two supported shapes:

1. **Browser-gated Access path**: Cloudflare Access protects the public
   hostname. Use this when the client can complete Cloudflare's browser-based
   identity challenge.
2. **Native Even app path**: the Even app probes the host directly and may not
   send the configured auth token while using Cloudflare mode. Use a separate
   native hostname and local auth proxy so the public hostname is not the same
   as the browser-gated Access application.

Do not publish the native hostname if it is being used as a temporary bearer
secret. Treat it as short-lived and rotate it if it appears in screenshots,
terminal logs, chat, or documentation.

## Architecture

```text
Even G2 / Even app
  -> https://codex-g2.createsomething.agency
  -> Cloudflare Access
  -> Cloudflare Tunnel replica on the Mac
  -> http://127.0.0.1:19931 (compiled Even client + Presence API)
```

Native Even app path:

```text
Even G2 / Even app
  -> native Cloudflare Tunnel hostname
  -> Cloudflare Tunnel replica on the Mac
  -> local auth proxy on 127.0.0.1
  -> Even Terminal bound to 127.0.0.1
  -> Codex provider
```

The native path exists because the Even mobile client is not a browser. If it
cannot emit the same identity or bearer-token shape as a browser session, keep
the browser-gated Access application intact and add a separate native route with
a narrower security story.

Tier mapping:

- Database: `config/cloudflare/codex-g2-access-policy.json` records the
  expected production hostname, tunnel name, allowed identity, and 12-hour
  session duration.
- Automation: `scripts/codex-g2-cloudflare-access.mjs` renders the local
  tunnel config and starts the `cloudflared` replica.
- Judgment: Cloudflare Access remains the preferred policy artifact at the
  edge. If a native route is needed, treat the native hostname or any bridging
  token as a temporary operator secret, not as a replacement for identity-aware
  access.

## Production Target

- Hostname: `codex-g2.createsomething.agency`
- Tunnel name: `create-something-codex-g2`
- Browser Access application name: `Codex G2 operator access`
- Access session duration: `12h`
- Allowed identity: `micah@createsomething.io`
- Local origin default: `http://127.0.0.1:19931`
- Tunnel transport: `http2` (works when outbound QUIC/UDP 7844 is blocked)

The native Even app path should use a different hostname and should never route
directly to an unauthenticated local service. The local proxy may accept a
short-lived native secret and forward to Even Terminal with the local
authorization shape that Even Terminal expects.

The local origin may use a different port for a specific Codex or Even Terminal
session, but it must remain bound to `127.0.0.1`, `localhost`, or `::1`.

## One-Time Cloudflare Setup

Create or update the browser-gated Cloudflare side from the Zero Trust
dashboard:

1. Create a named Cloudflare Tunnel: `create-something-codex-g2`.
2. Add public hostname `codex-g2.createsomething.agency`.
3. Point the hostname to `http://127.0.0.1:19931` unless the local Codex/Even
   port is different.
4. Create a self-hosted Cloudflare Access application for that hostname.
5. Add one allow policy for `micah@createsomething.io`.
6. Set the Access session duration to `12h`.
7. Do not add a bypass policy, broad domain allowlist, or unauthenticated
   service token for browser access.

For the native Even app path:

1. Keep the Access application above in place for browser traffic.
2. Create a second hostname for the native app path.
3. Route the native hostname through the same named tunnel to a loopback-only
   auth proxy, not directly to Even Terminal.
4. Configure the proxy to forward only the Even Terminal API paths required by
   the glasses.
5. Rotate the native hostname or token after any screenshot, screen share, or
   public debugging session.
6. Prefer a real service-token or signed-request path if the native client gains
   support for sending the required headers.

If the tunnel is token-managed in the dashboard, store the token outside the
repo and expose it only when starting the local replica:

```bash
CLOUDFLARED_TUNNEL_TOKEN=... pnpm codex:g2:access:start
```

For a locally managed tunnel, authenticate `cloudflared` once and start the
replica by name.

## Daily Use

Check the expected access posture:

```bash
pnpm codex:g2:access:check
```

Render the local tunnel config:

```bash
pnpm codex:g2:access:config
```

Start the all-day tunnel replica:

```bash
pnpm codex:g2:access:start
```

For Codex Presence, build the client and start its loopback-only production
process before starting the tunnel:

```bash
pnpm --filter @create-something/even-codex-presence build
pnpm --filter @create-something/even-codex-presence pack:even
pnpm codex:presence:production:start
pnpm codex:presence:production:status
```

The launcher retrieves the approved transcription key from Infisical without
printing or persisting it. Its short-lived pairing token exists only in the
mode-`0600` runtime receipt under the ignored `.tmp/` directory and the Even
Hub install QR. Do not copy the token into shell history or Linear evidence.

Use a non-default local port when Codex or Even Terminal is listening elsewhere:

```bash
pnpm codex:g2:access:start -- --origin http://127.0.0.1:1455
```

Inspect the tunnel:

```bash
pnpm codex:g2:access:status
```

Stop the foreground process with `Ctrl-C` when glasses access is no longer
needed. If you run the tunnel under a terminal multiplexer or launch service,
stop that supervisor at the end of the workday.

## Security Rules

- Keep Codex or Even Terminal bound to loopback, not `0.0.0.0`.
- Expose only one local port through the tunnel.
- Treat Cloudflare as a trusted proxy for this path; do not use it as a
  substitute for Tailscale-style private end-to-end networking.
- Keep the Access session at `12h`; do not make it persistent across days.
- Keep the browser-gated hostname and native hostname separate.
- Do not publish the native hostname when it is functioning as a bearer secret.
- Do not paste raw production secrets, customer data, or long-lived credentials
  into the remote glasses session.
- Rotate any secret that appears in terminal output or browser content during a
  remote session.
- Disable or delete the Access application if the glasses are lost.
- Disable or rotate the native hostname if the glasses, phone, or screenshots
  are exposed.

## Validation

Before production use:

```bash
pnpm codex:g2:access:check
node --test scripts/test/codex-g2-cloudflare-access.test.mjs
```

After Cloudflare setup, verify:

```bash
curl -I https://codex-g2.createsomething.agency
```

Expected result before login is a Cloudflare Access redirect or challenge, not
the raw Codex or Even Terminal origin.

For the native Even app path, validate the actual client behavior:

1. Start Even Terminal on loopback.
2. Start the local auth proxy on loopback.
3. Start `cloudflared` with the native hostname routed to the proxy.
4. Probe from the Even app.
5. Inspect the local proxy logs and confirm the app reaches only expected API
   paths.
6. Confirm no raw token, secret hostname, or customer data was captured in
   shareable screenshots or documentation.

Expected result is a successful Even app probe and session list without exposing
the unauthenticated local Even Terminal origin to the public internet.

## Streaming Expectations

The current native path may show agent thinking or session state without showing
full token-by-token streaming. Treat that as expected unless every layer in the
path supports the same streaming transport end to end.

Full streaming requires alignment across:

- the Even app client
- the Cloudflare route
- any local auth proxy
- Even Terminal
- the Codex provider connection

If any layer buffers responses, translates the request into polling, or does
not preserve long-lived Server-Sent Events or WebSocket connections, the glasses
may show updated thinking/status but not live streaming text.

During the 2026-06-22 native-path test, the session history continued to append
assistant progress messages while the session list still reported `idle`. For
debugging, treat history polling as the stronger signal than the coarse session
status field.

This is still useful for portable supervision. It is not full desktop terminal
parity.

## Publication Boundary

This setup can support a public paper or demo about operator mobility, but the
paper must not include raw hostnames used as temporary secrets, bearer tokens,
Cloudflare certificate paths, tunnel credential paths, or screenshots that show
active credentials.

Frame the public claim as a governed operator surface:

- the operator can observe and redirect Codex from a heads-up display
- the repo, Linear issue, tunnel, and deployment receipts remain the source of
  truth
- the glasses are an access surface, not the authority model
- the native route is experimental until it uses a first-class identity or
  service-token shape
