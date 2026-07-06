# Promptfoo Hub Harness

This is the first Promptfoo lane for `cs-mcp-hub-remote`.

It is intentionally narrow:

- strict identity enforcement
- broker-only tool catalog shape
- direct proxy denial
- proxy discovery envelope

It does **not** replace runtime governance in the Hub or policy engine. It complements:

- `evals/langfuse/mcp/*` for live telemetry-oriented evals
- `scripts/policy-os-live-verify.sh` for shell-based policy verification
- `packages/policy-os-engine/*` for runtime decisioning

## Files

- `promptfooconfig.yaml`: Promptfoo suite definition
- `providers/hub-rpc-provider.mjs`: tiny custom provider that sends raw JSON-RPC to the Hub `/mcp` endpoint
- `assertions/*.cjs`: repo-local assertions for Hub-specific response contracts
- `.env.example`: required live env vars

## Live env

Copy the values into your shell or `.env` file before running:

```bash
export PROMPTFOO_HUB_URL=https://your-hub.example.workers.dev/mcp
export PROMPTFOO_HUB_API_TOKEN=...
export PROMPTFOO_HUB_SESSION_TOKEN=...
```

Notes:

- `PROMPTFOO_HUB_API_TOKEN` is optional if the Hub endpoint is public.
- `PROMPTFOO_HUB_SESSION_TOKEN` is required for the authenticated provider lane.
- If the live env vars are missing, the suite skips those checks instead of fabricating failures.

## Run

From the repo root:

```bash
pnpm promptfoo:hub:validate
pnpm promptfoo:hub:eval
```

## Scope boundaries

This scaffold does not yet cover:

- `hub_execute_proxy_tool` success-path execution against a known downstream proxy tool
- service-tier gating on paid or write-capable routes
- account echo or cross-account isolation via a dedicated validation route
- Promptfoo red-team plugins against a live Hub-connected agent

Those are the next additions once a stable live fixture set exists.
