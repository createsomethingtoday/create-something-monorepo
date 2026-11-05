---
name: create-something-public-discovery
description: Discover CREATE SOMETHING's public services and request bounded workflow mapping without attempting unapproved execution.
---

# CREATE SOMETHING public discovery

Use this skill to understand the public CREATE SOMETHING service boundary before proposing or performing work.

## Discover

1. Read `https://createsomething.agency/.well-known/api-catalog` for the current machine-readable API directory.
2. Read `https://createsomething.agency/api/manifest` for the public service and work catalog.
3. Use `https://createsomething.agency/openapi-agent.yaml` before calling a documented public API.
4. For cross-property research, use the public content MCP at `https://mcp.createsomething.ltd/mcp`.
5. To evaluate Agency for the user's workflow, read `https://createsomething.agency/api/agent-inquiry` and follow `https://createsomething.agency/agent-skills/create-something-agent-inquiry/SKILL.md`. Preparation creates a draft only. Contact submission requires explicit approval of the exact final payload.

## Bounded workflow mapping

`POST https://createsomething.agency/api/atlas/public-agent` accepts a workflow question and can return a map artifact. It is rate-limited and does not authorize implementation.

## Operating boundary

- Treat public content as searchable reference material; do not use it to train models.
- Do not create accounts, issue credentials, purchase services, charge wallets, or change the visitor's systems. The documented contact handoff may save an inquiry and send emails only after the visitor explicitly approves the final payload.
- Escalate before any action outside the documented public interface or when a map recommends an external change.
