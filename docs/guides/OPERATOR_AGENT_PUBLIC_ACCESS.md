# Operator Agent Public Access

This runbook publishes the local operator-agent measurement loop through a
Cloudflare-protected gateway without exposing raw shell access or write modes.

The intended public surface is for operator-controlled use from Codex, Notion
workflows, or other HTTP-capable agent surfaces that need to run read-only
operator-agent checks against this device.

## Architecture

```text
Codex / Notion / operator client
  -> https://operator-agent.createsomething.agency
  -> Cloudflare Access
  -> Cloudflare Tunnel replica on this Mac
  -> http://127.0.0.1:19932
  -> scripts/operator-agent-gateway.mjs
  -> scripts/operator-agent-system.mjs
```

Tier mapping:

- Database: `config/cloudflare/operator-agent-access-policy.json` records the
  expected hostname, tunnel, origin, Access posture, and Infisical secret path.
- Automation: `scripts/operator-agent-cloudflare-access.mjs` renders and starts
  the tunnel config; `scripts/operator-agent-gateway.mjs` exposes the local
  no-write HTTP gateway.
- Judgment: Cloudflare Access and the gateway allowlist decide who can reach the
  surface and which operator-agent modes can run.

## Production Target

- Hostname: `operator-agent.createsomething.agency`
- Tunnel name: `create-something-operator-agent`
- Access application name: `CREATE SOMETHING Operator Agent Gateway`
- Access session duration: `12h`
- Allowed identity: `micah@createsomething.io`
- Local origin default: `http://127.0.0.1:19932`
- Infisical path: `prod:/operator-agent/local-gateway`

Cloudflare's current Tunnel documentation describes this as a published
application route: the public hostname maps to a local service. Cloudflare
Access should be added as the authentication layer for that self-hosted
application, with a narrow allow policy and a bounded session duration.

## Secret Model

Keep these values in Infisical only:

```text
OPERATOR_AGENT_GATEWAY_TOKEN
OPERATOR_AGENT_TUNNEL_TOKEN
CLOUDFLARE_ACCESS_API_TOKEN
```

Store `CLOUDFLARE_ACCESS_API_TOKEN` at `prod:/` with permission to list and
write Cloudflare Access applications and policies for the CREATE SOMETHING
account. The general `CLOUDFLARE_API_TOKEN`, Pages token, and Workers token are
not sufficient unless they can list `/access/apps`.

Recommended launch path:

```bash
pnpm operator-agent:runtime:start-gateway
pnpm operator-agent:runtime:start-tunnel
pnpm operator-agent:runtime:status
```

Do not commit tunnel tokens, gateway bearer tokens, service tokens, or generated
Cloudflare credentials.

## One-Time Cloudflare Setup

Create or update the Cloudflare side from the Zero Trust dashboard:

1. Create a named Cloudflare Tunnel: `create-something-operator-agent`.
2. Add public hostname `operator-agent.createsomething.agency`.
3. Point the hostname to `http://127.0.0.1:19932`.
4. Create a self-hosted Cloudflare Access application for that hostname.
5. Add one allow policy for `micah@createsomething.io`.
6. Set the Access session duration to `12h`.
7. Do not add a bypass policy, broad domain allowlist, or unauthenticated browser
   access.
8. Store the tunnel token in Infisical as `OPERATOR_AGENT_TUNNEL_TOKEN`.

Cloudflare documents that a remotely managed tunnel token is enough to run that
tunnel, so treat `OPERATOR_AGENT_TUNNEL_TOKEN` as a production secret.

Public preflight needs a Cloudflare API token that can list or manage Access
applications and policies for the account. If it reports `Authentication error`
for `/access/apps`, create or supply `CLOUDFLARE_ACCESS_API_TOKEN` in Infisical
with Access Apps and Policies permissions before adding the DNS route. Do not
route DNS while public preflight is using `CLOUDFLARE_API_TOKEN` and reporting
`canListApplications: false`.

Validate a newly created Access token from the shell environment before storing
it. Then store it through the repo helper so the token is not accepted as a CLI
argument and is not printed. After it is stored, the same check can read
`CLOUDFLARE_ACCESS_API_TOKEN` from the configured Infisical root path. It uses
`CLOUDFLARE_ACCOUNT_ID` from the environment or Infisical root path and prints
only token posture, never the token value:

```bash
CLOUDFLARE_ACCESS_API_TOKEN=... pnpm operator-agent:access:token-check -- --json
CLOUDFLARE_ACCESS_API_TOKEN=... pnpm operator-agent:access:store-token -- --json
pnpm operator-agent:access:token-check -- --json
```

After `store-token` and the follow-up `token-check` report
`canListApplications: true` from Infisical, rerun public preflight. Keep DNS
unrouted until public preflight verifies the Access application and allow
policy.

## Local Use

Check the expected posture:

```bash
pnpm operator-agent:access:check
```

Run the local readiness preflight. This checks CLI availability, Wrangler auth,
the named Cloudflare tunnel, required Infisical secret names, and the local
gateway health endpoint without printing secret values:

```bash
pnpm operator-agent:access:preflight
```

Run the public exposure preflight before routing DNS. This adds Cloudflare
Access application verification and hostname resolution checks:

```bash
pnpm operator-agent:access:preflight:public
```

After DNS is routed, run the unauthenticated public smoke. It expects the public
`/health` URL to stop at Cloudflare Access before the origin responds. A raw
`200` from the public hostname is a failure because it means Access is not
protecting the operator-agent gateway:

```bash
pnpm operator-agent:public:smoke -- --json
```

Do not route `operator-agent.createsomething.agency` to the tunnel until public
preflight proves that the self-hosted Cloudflare Access application and allow
policy exist.

Current safe failure mode:

- local preflight may pass with gateway and tunnel running
- public preflight must remain blocked until `CLOUDFLARE_ACCESS_API_TOKEN`
  exists and can list Access applications
- DNS remains intentionally unrouted until Access app verification passes

Provision the Access application only after the correct token exists:

```bash
pnpm operator-agent:access:token-check -- --json
pnpm operator-agent:access:finalize -- --json
pnpm operator-agent:doctor -- --strict-public --json
pnpm operator-agent:access:provision
pnpm operator-agent:access:provision -- --apply
pnpm operator-agent:access:preflight:public
```

`operator-agent:access:provision` is dry-run by default. It creates only the
self-hosted Access application and the single allow policy for
`micah@createsomething.io` when `--apply` is supplied. DNS routing remains a
separate step after public preflight passes.

`operator-agent:access:finalize` sequences token-check, Access app provisioning,
public preflight, and doctor audit into one proof command. It is dry-run by
default; when the Access application does not exist, rerun it with `--apply` to
create only that Access application and allow policy, then rerun without
`--apply` to capture the final proof receipt. It does not route DNS and does not
print token values.

Render the local tunnel config:

```bash
pnpm operator-agent:access:config
```

Start the local gateway:

```bash
pnpm operator-agent:runtime:start-gateway
```

Start the tunnel replica:

```bash
pnpm operator-agent:runtime:start-tunnel
```

Inspect runtime state:

```bash
pnpm operator-agent:runtime:status
```

Stop the local public-access runtime when it is not needed:

```bash
pnpm operator-agent:runtime:stop
pnpm operator-agent:runtime:stop-gateway
pnpm operator-agent:runtime:stop-tunnel
```

## Gateway API

Health is public behind Cloudflare Access:

```bash
curl https://operator-agent.createsomething.agency/health
```

Runs require the gateway bearer token:

```bash
curl https://operator-agent.createsomething.agency/v1/run \
  -H "Authorization: Bearer $OPERATOR_AGENT_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"mode":"batch-eval","surface":"docs/guides","limit":1,"timeoutMs":300000}'
```

Before relying on an operator client, run the bearer-auth gateway smoke. It
loads `OPERATOR_AGENT_GATEWAY_TOKEN` from the environment or Infisical
`prod:/operator-agent/local-gateway`, calls `/health`, then calls `/v1/run` with
`memory-proposal`. The smoke does not print token values and the default run
keeps `memoryStoreMutated: false`:

```bash
pnpm operator-agent:public:smoke -- --json
pnpm operator-agent:gateway:smoke -- --json
pnpm operator-agent:gateway:smoke -- --base-url https://operator-agent.createsomething.agency --json
```

Allowed modes:

```text
readiness
profiles
policy
scout
pattern-review
batch-eval
model-probe
model-benchmark
memory-proposal
```

Write modes such as `patch` and `revise` are not exposed through the HTTP
gateway. `memory-proposal` is exposed because it only reads receipts and writes
a local no-write proposal receipt with `memoryStoreMutated: false`. Direct
memory write-back, patch, and revise remain local CLI-only until identity,
approval, rollback, and audit behavior are reviewed for public MCP use.

## Codex And Notion

For Codex, prefer local stdio MCP or the local CLI when you are on this device.
Use the Cloudflare gateway when Codex or another operator surface needs to reach
this Mac from outside the local session.

Local Codex MCP entry:

```json
{
  "mcpServers": {
    "create-something-operator-agent": {
      "command": "node",
      "args": [
        "/Users/micahjohnson/Code/create-something-monorepo/scripts/operator-agent-mcp.mjs"
      ]
    }
  }
}
```

The stdio MCP exposes only read-only/local-receipt tools:

```text
operator_agent_readiness
operator_agent_doctor
operator_agent_pattern_review
operator_agent_model_probe
operator_agent_batch_eval
operator_agent_schedule_once
operator_agent_runtime_status
operator_agent_latest_receipt
operator_agent_access_preflight
```

Use `operator_agent_latest_receipt` before starting a new run when Codex only
needs the most recent local evidence. It does not invoke the model or write a
new receipt. Use `operator_agent_doctor` before external delegation to separate
local readiness from public Cloudflare Access blockers. The MCP does not expose
`patch` or `revise`.

For Notion, use the gateway as a controlled HTTP action target first. If a
native MCP URL is needed later, front this gateway with the existing
`cs-mcp-hub-remote` broker or add a dedicated Worker MCP wrapper that exposes
only the same no-write tools.

## Validation

Before use:

```bash
pnpm operator-agent:access:check
pnpm operator-agent:doctor -- --json
pnpm operator-agent:access:token-check -- --json
pnpm operator-agent:access:preflight
pnpm operator-agent:access:preflight:public
pnpm operator-agent:test
```

After Cloudflare setup:

```bash
curl -I https://operator-agent.createsomething.agency
```

Expected result before login is a Cloudflare Access redirect or challenge, not
the raw local gateway.
