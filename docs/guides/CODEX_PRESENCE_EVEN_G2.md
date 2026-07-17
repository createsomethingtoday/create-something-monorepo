# Codex Presence for Even G2

Codex Presence is the stronger product candidate than an ngrok wrapper. Even
Terminal already owns terminal access and supports local, Tailscale, and quick
expose modes. Presence supplies the missing interface layer: an accurate answer
to “what is Codex doing, does it need me, and what is safe to do next?”

## Product boundary

```text
Codex rollout store
  -> deterministic Presence reducer
  -> authenticated localhost API and SSE
  -> Even G2 glanceable cards
  -> typed ring or confirmed voice action
  -> Even Terminal adapter
  -> Codex
  -> action receipt and updated Presence card
```

The tunnel is transport, not the product. For local simulation the service
stays on loopback. For physical glasses, prefer Even Terminal's Tailscale mode
when the phone and Mac can share a tailnet. When they cannot, the existing
deny-by-default Cloudflare Access runbook in
`docs/guides/G2_CLOUDFLARE_CODEX_ACCESS.md` is the governed fallback. Public
relay promotion, hostname changes, and physical sideloading remain separate
approval gates.

## State contract

The reducer uses explicit Codex lifecycle and tool events. It never infers
working state merely because a task is recent or unarchived.

| State | Default attention | Operator action |
| --- | --- | --- |
| `working` | quiet | inspect, follow up, or confirmed stop |
| `needs_input` | decision | answer |
| `approval` | decision | confirmed approve or deny |
| `blocked` | urgent | inspect or follow up |
| `failed` | urgent | inspect or follow up |
| `complete` | notice | follow up or dismiss |
| `available` | quiet | inspect |
| `stale` | notice | inspect; never presented as idle |

Large rollout files are read through bounded head/tail windows. One real local
rollout exceeded 4.7 GB, so reading whole task files is explicitly outside the
runtime design.

## Input and safety

Ring and glasses events are interpreted separately. The ring is optimized for
navigate, speak, confirm, and cancel; glasses double-click exits. The selected
task is retained by task ID while attention ranking updates, preventing a live
poll from switching the action target.

All mutations are typed and checked against the latest offered actions. Action
request IDs are idempotent. Approval and interrupt require confirmation. Voice
PCM is sent to the local service, transcribed server-side, shown for review,
and delivered only after a click. Neither the OpenAI key nor the Even Terminal
token enters client assets.

## Run locally

Start or reuse Even Terminal without a public tunnel:

```bash
even-terminal --provider codex --cwd "$PWD"
```

Start Presence:

```bash
export CODEX_PRESENCE_TOKEN="$(openssl rand -hex 24)"
pnpm --filter @create-something/codex-presence start
```

Then start the client and simulator using the runtime pairing URL described in
`apps/even-codex-presence/README.md`.

## Verification

```bash
pnpm codex:presence:verify
```

The verifier starts clean local service, client, simulator, and disposable
Codex processes; captures 576x288 screenshots and console output; drives two
simulator inputs; sends a typed follow-up through Even Terminal; generates a
speech fixture; and writes JSON evidence to `.tmp/codex-presence/<timestamp>`.

Completion requires two consecutive passes. As of 2026-07-17, the approved
existing OpenAI key authenticates but its API project returns HTTP 429
`insufficient_quota`. Add API credits or raise the project/organization spend
limit, then rerun the verifier twice. A mocked transcript is intentionally not
accepted as completion proof.

## Physical-device promotion

Before sideloading:

1. Choose Tailscale or the approved Cloudflare Access hostname.
2. Add only that exact HTTPS origin to `app.json` and repackage.
3. Use a short-lived Presence pairing token; do not bake it into the asset.
4. Verify microphone permission, R1 events, reconnect behavior, and all-day
   latency on physical G2 hardware.
5. Record rollback: stop the relay and Presence service, then remove the app.
