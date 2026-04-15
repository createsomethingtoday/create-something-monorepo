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
- `UPSTREAM_PORT` (var, optional, default `7860`)
- `SANDBOX_SLEEP_AFTER` (var, optional, default `20m`)

## Deploy

Run from this directory:

```bash
pnpm install
pnpm deploy
```

This runs:

1. `prepare-runtime` to stage current analyzer files into `cloudflare/runtime/`
2. `wrangler deploy` to publish Worker + Container config

After deploy, set the extension frontend API base URL (currently hardcoded in `public/index.html`) to your deployed Worker URL.

## Local Cloudflare dev

```bash
pnpm dev
```

## Notes and limitations

- `/open-form` is designed for local visible-browser automation and is not a good remote workflow in containerized hosting. Prefer using only `/analyze` remotely.
- Screenshot files are generated inside the running container filesystem; treat them as ephemeral.
