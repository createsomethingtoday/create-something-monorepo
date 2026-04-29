# Code-Quality Symphony

This workflow runs Symphony against Linear issues labeled `code-quality`.

## Requirements

- `LINEAR_API_KEY` exported in the environment
- `codex` available on `PATH`
- `pnpm` available on `PATH`
- Linear GraphQL reachable at `https://api.linear.app/graphql`

## Task convention

Create Linear issues for this lane with the `code-quality` label. Example:

```bash
pnpm linear:create -- \
  --title "Fix failing MCP typecheck in playbook worker" \
  --description "Investigate the current regression and land the smallest safe fix." \
  --label code-quality \
  --project "CREATE SOMETHING Agent Coordination"
```

## Running

Continuous orchestration:

```bash
pnpm symphony:code-quality
```

Single poll / dispatch pass:

```bash
pnpm symphony:code-quality:once
```

Runtime state is exposed on `http://127.0.0.1:4780/`.
