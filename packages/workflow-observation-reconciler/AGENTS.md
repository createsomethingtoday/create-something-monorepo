# Agents: @create-something/workflow-observation-reconciler

## Agent Entry

- Start with `README.md` for the documented-versus-observed boundary.
- Read `../workflow-evidence-extractor/README.md` before changing proposal or approval behavior.
- Read `../workflow-compiler/README.md` before changing compiled workflow semantics.
- Primary entrypoints: `src/index.ts`, `src/reconcile.ts`, `src/artifacts.ts`, and `src/cli.ts`.

## Ownership

| Tier | This package owns | This package does not own |
| --- | --- | --- |
| Database | Parsed historical observations, exact source pointers, report hashes, reconciliations, and generated review artifacts | Live workflow receipts, Airtable, Webflow, or production state |
| Automation | Deterministic report parsing, policy-driven classification, proposal generation, and CLI artifact writing | Source-report generation, workflow compilation semantics, or live execution |
| Judgment | Explicit alignment, discrepancy, limitation, evaluation-proposal, and conflict policy | Automatic policy changes, subjective threshold selection, or marketplace decisions |

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm check && pnpm test && pnpm test:acceptance`
- Verify public imports with `pnpm exports @create-something/workflow-observation-reconciler`.
- Escalate if a requested change would infer unconfigured metrics, generalize subjective thresholds, bypass proposal approval, mutate historical evidence, call a live system, or deploy.

Develop one public behavior at a time: failing check, minimal implementation, green check, then refactor while preserving deterministic output.
