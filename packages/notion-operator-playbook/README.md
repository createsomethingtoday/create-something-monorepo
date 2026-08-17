# Notion Operator Playbook

Sanitized reference for every non-Notion-as-Code part of a CREATE SOMETHING
Notion operating system.

## What it demonstrates

| Tier       | Artifact                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------- |
| Database   | Versioned Playbook, instantiated Runbook, generated evidence sync, deterministic receipts |
| Automation | Readiness tool, guarded/idempotent instantiation tool, manual managed sync, HMAC webhook  |
| Judgment   | Approval state, dry-run default, write gate, target boundary, rollback and proof policy   |

The package uses Notion's native Worker SDK. It does not build a competing
runtime and contains no Notion-as-Code project or intents.

## Capabilities

- `inspectRunbookReadiness`: read-only evaluation of owner, approval, rollback,
  evidence, and steps.
- `instantiateRunbook`: preview-first write tool with approval, environment,
  target, authentication, and deterministic idempotency gates.
- `demoEvidenceSync`: manual replace-mode sync of three generated evidence
  artifacts into a Worker-managed database.
- `runbookEvidenceWebhook`: raw-body HMAC-verified evidence intake that emits a
  deterministic receipt.

## Local verification

Requires Node.js 22 or newer.

```bash
pnpm --filter @create-something/notion-operator-playbook check
pnpm --filter @create-something/notion-operator-playbook demo
pnpm --filter @create-something/notion-operator-playbook manifest
SOURCE_DATE_EPOCH=1786651200 \
  pnpm --filter @create-something/notion-operator-playbook receipt
```

These commands do not apply Notion-as-Code, deploy a Worker, write secrets, or
mutate a workspace.

## Proof boundary

Local tests and manifests prove package behavior and SDK registration only.
They do not prove alpha entitlement, hosted deployment, Custom Agent
attachment, secret configuration, or live Notion behavior. Follow
`docs/ACCEPTANCE_DAY_RUNBOOK.md` after the exact disposable target is approved.

## Related repo evidence

- `packages/notion-worker-experiments` contains client/internal Worker spikes.
- `docs/guides/NOTION_WORKERS_AND_CLI_2026.md` owns the broader platform choice.
- CRE-1671 records the prior build-only Notion-as-Code pilot and entitlement
  roadblock.
- CRE-1752 is the current intent map; CRE-1753 owns this prototype.
