# Notion Operator Playbook Agent Rules

This package is the sanitized, pre-alpha reference for the non-Notion-as-Code
parts of a CREATE SOMETHING Notion operating system.

## Current boundary

- Local source, tests, typechecks, builds, manifest inspection, pure tool
  execution, sync preview, and signed-webhook tests are allowed.
- Do not run `ntn notion-as-code apply` from this package or add
  Notion-as-Code intents here.
- Do not run `ntn workers deploy`, `ntn workers env set`,
  `ntn workers env push`, or `ntn workers oauth start` without explicit
  operator approval for the exact disposable workspace and Worker.
- Never use a Half Dozen, CREATE SOMETHING production, or client workspace as a
  test target.
- Keep `workers.json`, `.env*`, state files, and receipts containing live IDs
  out of Git.

## Capability policy

- Read-only tools must advertise `readOnlyHint` in the deployed manifest.
- Write tools must default to dry-run, require explicit approval in their
  input, and remain blocked unless a dedicated environment gate is enabled.
- Webhooks must verify signatures over the raw body before processing data.
- Demo sync data must be generated and contain no client records or page IDs.
- Stable receipt IDs are the idempotency boundary for write tools.

## Verification

```bash
pnpm --filter @create-something/notion-operator-playbook check
pnpm --filter @create-something/notion-operator-playbook manifest
pnpm --filter @create-something/notion-operator-playbook receipt
```

The acceptance-day procedure is in `docs/ACCEPTANCE_DAY_RUNBOOK.md`.
