# Harness MCP Server

MCP server for exposing harness-oriented operations to coding agents and operator tools.

This package should be understood as the tool surface around the harness loop, not as a Beads adapter. Its role is to let agents inspect task state, run quality gates, checkpoint context, and operate within a tracked execution workflow.

## What it exposes

- task and issue inspection
- quality gates
- git status and diffs
- checkpoints
- canon and quick-reference rules

## Intended use

Use this server when an agent needs structured access to harness operations during a coding run.

Typical loop:

1. inspect tracked work
2. inspect repo state
3. run or rerun validation
4. save checkpoint context
5. continue the execution or review loop

## Features

- **Task operations**: issue/task lookup and updates
- **Quality gates**: tests, typecheck, lint
- **Git operations**: status, diff, commit helpers
- **Checkpoint operations**: save, load, list
- **Canon operations**: style and reference guidance

> Note: some tool names and internal plumbing still reflect older naming. Prefer the harness workflow semantics over the legacy naming.

## Installation

```bash
cd packages/harness-mcp
pnpm install
pnpm build
```

## Configuration

Add the server as a local stdio MCP endpoint in your client of choice.

Example local command:

```bash
node /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/harness-mcp/dist/index.js
```

## Direct testing

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Architecture

```text
harness-mcp
  ↓
agent runtime / operator client
  ↓
task inspection + validation + checkpoint tools
  ↓
git state / quality gates / harness context
```

## Relationship to the harness

`@create-something/harness` is the orchestrator.

`@create-something/harness-mcp` is the tool surface that makes parts of that workflow accessible to agent runtimes and MCP-aware clients.

Use the harness when you need the full execution loop.
Use harness-mcp when you need callable operations inside that loop.
