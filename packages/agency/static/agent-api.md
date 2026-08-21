# CREATE SOMETHING public agent API

This document describes the bounded public interfaces at `https://createsomething.agency`.

## What agents may do

- Read the current public service manifest at `/api/manifest`.
- Request a workflow map through `POST /api/atlas/public-agent` within the published input and rate limits.
- Check public map availability at `/api/map/health`.

## Operating boundary

The public API does not create accounts, issue credentials, make purchases, charge wallets, or make external system changes. A map is a planning artifact; it is not authorization to execute the workflow it describes.

## Discovery

- API description: `/openapi-agent.yaml`
- API catalog: `/.well-known/api-catalog`
- Authentication instructions: `/auth.md`
- MCP card: `/.well-known/mcp/server-card.json`
- Agent Skills index: `/.well-known/agent-skills/index.json`
