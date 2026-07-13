# Agents: @create-something/workflow-historical-context-reconciler

## Agent Entry

- Start with `README.md` for the privacy and judgment boundary.
- Read `../workflow-receipt-reconciler/README.md` for the upstream case-receipt contract.
- Read `../workflow-evidence-extractor/README.md` before changing proposal or approval behavior.
- Primary entrypoints: `src/index.ts`, `src/load.ts`, `src/reconcile.ts`, `src/artifacts.ts`, and `src/cli.ts`.

## Ownership

| Tier | This package owns | This package does not own |
| --- | --- | --- |
| Database | Joined source hashes, sanitized controlled context, presence flags, provenance, and reconciliation artifacts | Private feedback storage, reviewer identity, Airtable, Langfuse, or production state |
| Automation | Strict loading, redaction, deterministic classification, coverage measurement, artifact writing, and proposal generation | Model inference, sentiment analysis, live observation, or workflow execution |
| Judgment | Versioned context taxonomy, ambiguity preservation, additive evaluation proposals, and operator escalation | Decision reversal, subjective thresholds, reviewer-specific policy, or proposal approval |

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm check && pnpm test`
- Verify public imports with `pnpm exports @create-something/workflow-historical-context-reconciler`.
- Escalate on unjoined cases, unknown controlled categories, feedback or reviewer leakage, automatic ambiguity resolution, proposal application, external writes, or deployment.

Develop one public behavior at a time: failing check, minimal implementation, green check, then refactor while preserving deterministic output.
