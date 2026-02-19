# Portkey Gateway Worker Wrapper

Thin Cloudflare Worker wrapper that provides a stable runtime contract in front of a pinned Portkey OSS gateway deployment.

## Endpoints

- `POST /v1/responses`
- `POST /v1/chat/completions`
- `GET /v1/models`
- `GET /health`

## Config

Set `PORTKEY_UPSTREAM_URL` to your Portkey OSS gateway URL.

Optional:
- `PORTKEY_UPSTREAM_API_KEY` if your upstream requires bearer auth.

## Purpose

- Keeps external endpoint stable while you pin/upgrade Portkey OSS internally.
- Allows the `gateway-control-worker` to target one canonical gateway URL.
