# @create-something/pi-three-tier-framework

The **Three-Tier Framework** (Database, Automation, Judgment) for agent systems — delivered as a [Pi](https://pi.dev) coding agent package.

## Install

```bash
pi install npm:@create-something/pi-three-tier-framework
```

## What You Get

### Skills

- `/skill:three-tier-framework` — Load the full framework reference, tier definitions, debugging heuristic, and MCP mapping
- `/skill:deep-module-design` — Design modules for leverage, locality, testability, and clear tier ownership

### Prompt Templates

- `/classify` — Classify any system component into framework tiers
- `/debug-tier` — Apply the three-tier causality heuristic to debug a failure
- `/mcp-design` — Design an MCP server using the framework

## The Framework

Every agent system has three tiers, mapped to MCP's three primitives:

| Tier           | What                         | MCP Primitive | Control Model          |
| -------------- | ---------------------------- | ------------- | ---------------------- |
| **Database**   | What exists (state, records) | Resources     | Application-controlled |
| **Automation** | What happens (tools, skills) | Tools         | Model-controlled       |
| **Judgment**   | What should happen (policy)  | Prompts       | User-controlled        |

**Debug order**: Always check tiers in sequence — Database → Automation → Judgment. Lower-tier failures cascade upward.

**The recursive property**: MCP's sampling mechanism allows Automation to request Judgment, creating a feedback loop that mirrors embodied cognition.

**Policy as artifact**: Constraints flow through all tiers as data — stored in Database, transformed by Automation, evaluated by Judgment.

## Learn More

- [Three-Tier Framework paper](https://createsomething.io/papers/three-tier-framework)
- [CREATE SOMETHING](https://createsomething.agency) — Custom MCP development and Policy OS delivery
- [MCP server version](https://www.npmjs.com/package/@create-something/three-tier-framework-mcp) — The framework as an MCP server
