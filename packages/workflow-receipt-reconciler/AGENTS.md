# Agents: @create-something/workflow-receipt-reconciler

## Agent Entry

- Start with `README.md` for the case-receipt and corpus-sufficiency boundary.
- Read `../workflow-observation-reconciler/README.md` for aggregate reconciliation context.
- Read `../workflow-evidence-extractor/README.md` before changing proposal or approval behavior.
- Read `../workflow-compiler/README.md` before changing compiled workflow semantics.
- Primary entrypoints: `src/index.ts`, `src/extract.ts`, `src/reconcile.ts`, `src/artifacts.ts`, and `src/cli.ts`.

## Ownership

| Tier | This package owns | This package does not own |
| --- | --- | --- |
| Database | Immutable case receipt snapshots, joined artifact-bundle hashes, line provenance, corpus records, replay records, and review artifacts | Private bundle storage, Airtable, Webflow, or production state |
| Automation | Embedded-case extraction, case replay, sampling checks, deterministic artifact writing, and proposal generation | Live observation, source data acquisition, workflow compilation semantics, or execution |
| Judgment | Explicit outcome mappings, discrepancy mappings, corpus sufficiency thresholds, and operator-required sampling conflicts | Subjective threshold inference, reviewer-specific policy, marketplace decisions, or conflict resolution |

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm check && pnpm test && pnpm test:acceptance`
- Verify public imports with `pnpm exports @create-something/workflow-receipt-reconciler`.
- Escalate if a requested change would fabricate missing cases, confuse regenerated evidence with a historical sample, pass an insufficient corpus, infer reviewer-specific policy, bypass approval, mutate source evidence, call a live system, or deploy.

Develop one public behavior at a time: failing check, minimal implementation, green check, then refactor while preserving deterministic output.
