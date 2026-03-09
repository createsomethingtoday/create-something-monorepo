# Understanding: @create-something/harness-mcp

> **The MCP tool surface around the harness loop: inspect work, run gates, save checkpoints, and expose execution-state operations to agents.**

## Ontological Position

**Mode of Being**: Operational MCP package

This package is not the orchestrator itself. It is the callable MCP interface around harness operations so agent runtimes and operator tools can inspect tracked work, repo state, checkpoints, and validation results without stepping outside the structured loop.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| `@create-something/harness` | Core execution model, checkpoint semantics, and orchestration behavior this MCP exposes |
| git state | Repository truth for status, diffs, and validation context |
| quality-gate commands | Mechanical validation surfaces this MCP can trigger or inspect |
| `@modelcontextprotocol/sdk` | MCP server and tool surface implementation |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| agent runtimes | Which harness operations are callable through MCP |
| operators | How tracked execution state can be inspected without using the full harness CLI |
| harness work | Where the execution loop becomes a structured tool surface |

## Internal Structure

```text
src/
├── index.ts                  → MCP server entry point
├── tools/ / handlers         → task, quality-gate, git, and checkpoint operations
├── dual-agent-routing.ts     → routing logic for different execution contexts
└── ...                       → support modules for harness-facing operations
```

## To Understand This Package, Read

1. **`README.md`** — intended use, exposed operations, and testing path
2. **`src/index.ts`** — MCP server boot path
3. **tool handler modules** — how harness operations are exposed through MCP
4. **`packages/harness/UNDERSTANDING.md`** — orchestrator-side model this package fronts

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/index.ts` |
| Boot command | `cd packages/harness-mcp && pnpm build && node dist/index.js` |
| Smoke command | `cd packages/harness-mcp && echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}' | node dist/index.js` |
| Validation surfaces | `tools/list` output, direct tool responses, repo state, quality-gate results, configured observability traces |
| UI validation path | none |
| Escalation rule | Stop if MCP tool output conflicts with the underlying harness or repo state, or if an operation cannot be validated through direct tool calls and the backing CLI/runtime state. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| harness tool surface | MCP layer around task inspection, quality gates, and checkpoints | `README.md` and `src/index.ts` |
| checkpoint operation | persisted context artifact surfaced through MCP | harness checkpoint handlers |
| quality gate | runnable validation command or result made available to agents | quality-related tools |
| tracked work inspection | issue/task and repo-state visibility through MCP | task/git tools |

## This Package Helps You Understand

- where the harness execution model becomes callable MCP operations
- how repo state and quality gates are surfaced to agents during a run
- what parts of the harness loop are safe to expose as tools

## Common Tasks

| Task | Start Here |
|------|------------|
| inspect available MCP tools | `README.md` and `src/index.ts` |
| test basic MCP surface | direct `tools/list` smoke command |
| understand backing execution model | `packages/harness/UNDERSTANDING.md` |
| extend a harness-facing operation | relevant tool handler module |

---

*Last validated: 2026-03-09*
