# @create-something/pi-policy-os

**Policy OS starter** for [Pi](https://pi.dev) coding agents — governed AI execution with quality gates, policy auditing, and the Subtractive Triad review methodology.

## Install

```bash
pi install npm:@create-something/pi-policy-os
```

## What You Get

### Extension

A lightweight quality gate extension that:

- Warns when code files lack basic quality signals (missing types, untested exports)
- Provides a `/policy-check` command to audit any codebase against Policy OS patterns
- Shows governance status in the Pi footer

### Skills

- `/skill:policy-os-starter` — What Policy OS is, how contract bundles work, the MCP-First Thesis
- `/skill:debug-feedback-loop` — Repro-first debugging for bugs, failing checks, and performance regressions
- `/skill:tdd-vertical-slice` — Test-first vertical-slice development through public interfaces

### Prompt Templates

- `/policy-audit` — Audit a codebase for governance gaps (missing tests, untyped exports, policy artifacts)
- `/subtractive-review` — Apply the Subtractive Triad as code review methodology (DRY → Rams → Heidegger)

## What Is Policy OS?

Policy OS is CREATE SOMETHING's governed execution platform:

1. **MCP servers establish trust** — controlled, permissioned access to your tools
2. **Skills provide capabilities** — reusable, portable across agent platforms
3. **Agents produce outcomes** — with approval gates, escalation policies, and quality controls

**The MCP-First Thesis**: The entry point to automation is connectivity, not intelligence. MCP consumption is commoditized. MCP creation is not.

## Go Further

- [CREATE SOMETHING](https://createsomething.agency) — Custom MCP development and Policy OS delivery
- [Three-Tier Framework](https://www.npmjs.com/package/@create-something/pi-three-tier-framework) — The architectural model
- [Policy OS paper](https://createsomething.io/papers/policy-os-development-infrastructure)
