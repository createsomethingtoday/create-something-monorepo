# Policy Pi Lane

This lane replaces the old Policy Symphony workflow.

Use it for versioned policy artifacts, governance docs, supporting runbooks, and related compilation or validation work labeled `policy` in Loom.

## Start

```bash
pnpm loom:remote list --status ready --label policy
pnpm pi:policy -- --task-id <id> --claim
```

## Operating rules

- Treat policy artifacts as auditable deliverables.
- Keep markdown and machine-readable policy artifacts aligned when both exist.
- Prefer the smallest viable governance change that matches the task.
- Call out policy conflicts, missing evidence requirements, or lifecycle gaps explicitly.

## Default validation order

1. `pnpm policy:artifacts:check`
2. `pnpm authz:compile` when authz inputs are affected
3. targeted `pnpm check`, `pnpm lint`, or `pnpm test` only when code or scripts are touched
