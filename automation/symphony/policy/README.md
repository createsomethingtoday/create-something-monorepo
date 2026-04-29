# Policy Symphony

This workflow runs Symphony against Linear issues labeled `policy`.

## Requirements

- `LINEAR_API_KEY` exported in the environment
- `codex` available on `PATH`
- `pnpm` available on `PATH`
- Linear GraphQL reachable at `https://api.linear.app/graphql`

## Task convention

Create Linear issues for this lane with the `policy` label. Example:

```bash
pnpm linear:create -- \
  --title "Align tenant tool exposure policy with current hub routing" \
  --description "Update the policy artifacts and supporting governance docs to match the live hub routing model." \
  --label policy \
  --project "CREATE SOMETHING Agent Coordination"
```

## Running

Continuous orchestration:

```bash
pnpm symphony:policy
```

Single poll / dispatch pass:

```bash
pnpm symphony:policy:once
```

Runtime state is exposed on `http://127.0.0.1:4781/`.
