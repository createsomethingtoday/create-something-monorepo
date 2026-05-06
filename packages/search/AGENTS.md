# Agents: @create-something/search

## Agent Entry

- Start with `README.md` for API endpoints and the package contract.
- Read `UNDERSTANDING.md` for the package model.
- Primary entrypoints: `src/index.ts`, `wrangler.toml`.

## Validation

- Boot: `pnpm dev`
- Smoke: `curl http://localhost:8787/health`
- Escalate if Vectorize, Workers AI, or indexed content cannot be reproduced locally.
