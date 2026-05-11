# Webflow Template Analyzer on Cloudflare Containers

This directory provides a Cloudflare deployment path for the existing analyzer backend (Python FastAPI + Playwright) without changing the main backend/frontend code.

## What this deploys

- A Cloudflare Worker (`src/index.ts`) that proxies all requests to a Cloudflare Container Durable Object.
- A container image (`Dockerfile`) that runs `backend/server.py` with Playwright Chromium.
- A runtime staging step (`scripts/prepare-runtime.sh`) that copies the current analyzer backend and extension HTML into `cloudflare/runtime/` before build/deploy.

## Prerequisites

- Cloudflare account with Workers Paid + Containers enabled.
- `pnpm` and `node` installed.
- Wrangler authenticated (`wrangler login`).
- Anthropic API key for runtime analysis.

## Required environment variables

Set as Worker secrets/vars in this Cloudflare project:

- `ANTHROPIC_API_KEY` (secret, required)
- `STEEL_API_KEY` (secret, optional, enables Steel-backed remote browser sessions)
- `UPSTREAM_PORT` (var, optional, default `7860`)
- `SANDBOX_SLEEP_AFTER` (var, optional, default `20m`)
- `ALLOW_VISIBLE_BROWSER` (var, optional, default `false`)
- `BROWSER_PROVIDER` (var, optional, `steel` uses Steel-backed browser sessions when `STEEL_API_KEY` is set)
- `STEEL_SESSION_TIMEOUT_MS` (var, optional, default `1200000`)

## Deploy

Run from this directory:

```bash
pnpm install
pnpm deploy
```

This runs:

1. `prepare-runtime` to stage current analyzer files into `cloudflare/runtime/`
2. `wrangler deploy` to publish Worker + Container config

The hosted UI uses same-origin when it is opened directly from the Worker URL. The bundled Webflow Designer extension still uses the remote fallback URL in `public/index.html`, so point that constant at the Worker URL if you want the extension to use Cloudflare instead of Render.

## Local Cloudflare dev

```bash
pnpm dev
```

## Notes and limitations

- `/open-form` is designed for local visible-browser automation and is not a good remote workflow in containerized hosting. Prefer using only `/analyze` remotely.
- Screenshot files are generated inside the running container filesystem; treat them as ephemeral.
