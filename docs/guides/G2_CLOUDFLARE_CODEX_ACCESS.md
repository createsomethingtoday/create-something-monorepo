# G2 Cloudflare Codex Access

This runbook owns the all-day Even G2 access path for Codex when Tailscale
cannot join the right tailnet.

Use this for operator access from the glasses, not for broad public demos. The
default posture is a 12-hour Cloudflare Access session, a dedicated hostname, a
single Cloudflare Tunnel, and a localhost-only Codex or Even Terminal origin.

## Architecture

```text
Even G2 / Even app
  -> https://codex-g2.createsomething.agency
  -> Cloudflare Access
  -> Cloudflare Tunnel replica on the Mac
  -> http://127.0.0.1:19931 (compiled Even client + Presence API)
```

Tier mapping:

- Database: `config/cloudflare/codex-g2-access-policy.json` records the
  expected production hostname, tunnel name, allowed identity, and 12-hour
  session duration.
- Automation: `scripts/codex-g2-cloudflare-access.mjs` renders the local
  tunnel config and starts the `cloudflared` replica.
- Judgment: Cloudflare Access remains the policy artifact at the edge. Keep it
  deny-by-default and scoped to the operator identity.

## Production Target

- Hostname: `codex-g2.createsomething.agency`
- Tunnel name: `create-something-codex-g2`
- Access application name: `Codex G2 operator access`
- Access session duration: `12h`
- Allowed identity: `micah@createsomething.io`
- Local origin default: `http://127.0.0.1:19931`
- Tunnel transport: `http2` (works when outbound QUIC/UDP 7844 is blocked)

The local origin may use a different port for a specific Codex or Even Terminal
session, but it must remain bound to `127.0.0.1`, `localhost`, or `::1`.

## One-Time Cloudflare Setup

Create or update the Cloudflare side from the Zero Trust dashboard:

1. Create a named Cloudflare Tunnel: `create-something-codex-g2`.
2. Add public hostname `codex-g2.createsomething.agency`.
3. Point the hostname to `http://127.0.0.1:19931` unless the local Codex/Even
   port is different.
4. Create a self-hosted Cloudflare Access application for that hostname.
5. Add one allow policy for `micah@createsomething.io`.
6. Set the Access session duration to `12h`.
7. Do not add a bypass policy, broad domain allowlist, or unauthenticated
   service token for browser access.

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
- Do not paste raw production secrets, customer data, or long-lived credentials
  into the remote glasses session.
- Rotate any secret that appears in terminal output or browser content during a
  remote session.
- Disable or delete the Access application if the glasses are lost.

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
