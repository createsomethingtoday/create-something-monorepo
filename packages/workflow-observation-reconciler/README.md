# Workflow Observation Reconciler

`@create-something/workflow-observation-reconciler` compares a compiled workflow definition with a committed historical calibration report. It is the CRE-1193 observed-execution follow-up to the Workflow Compiler and Workflow Evidence Extractor prototypes.

The package keeps four boundaries explicit:

1. **Observation:** extract configured metrics with exact line provenance from an immutable report snapshot.
2. **Reconciliation:** classify supported alignments, coverage gaps, and evidence limitations from a versioned policy artifact.
3. **Proposal:** translate only configured gaps into additive workflow evaluations and preserve unsupported generalization as an operator-required conflict.
4. **Approval:** delegate all mutation gates and compiler proof to `@create-something/workflow-evidence-extractor` and `@create-something/workflow-compiler`.

## Marketplace result

The bounded adapter reads:

- `specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md`
- `packages/workflow-compiler/fixtures/marketplace/workflow.json`
- `fixtures/marketplace/reconciliation-policy.json`

It extracts nine observations, including 50 selected cases, 49 usable evidence packets, 13 approved cases with minor objective signals, one approved case with a substantive signal, 17 rejected or policy cases not explained by the sandbox, 10 unexplained iterative cases, the Introx/Automatia comparison, and a 36 percent maximum reviewer share.

The policy classifies two alignments, two discrepancies, and one limitation. It proposes two additive evaluations:

- `decision-surface-classification`
- `appeal-equity-comparison`

Reviewer concentration remains `conflict:observed-subjective-threshold-generalization`. Acknowledging that conflict permits the unrelated evaluations to be applied but does not create or modify a subjective threshold.

## Public interface

```ts
import {
  reconcileWorkflowObservationReport,
  writeWorkflowObservationReconciliationArtifacts,
} from '@create-something/workflow-observation-reconciler';
```

The reconciler does not mutate its baseline, report, or policy inputs. The generated proposal uses the same content-hash, provenance, operation, conflict, and approval contracts as the evidence extractor.

## CLI

```bash
node packages/workflow-observation-reconciler/dist/cli.js reconcile \
  --baseline packages/workflow-compiler/fixtures/marketplace/workflow.json \
  --report specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md \
  --policy packages/workflow-observation-reconciler/fixtures/marketplace/reconciliation-policy.json \
  --out /tmp/workflow-observation-reconciliation
```

The output includes `reconciliation.json` plus a proposal review packet containing an untouched approval template. Apply that packet through the evidence extractor only after an operator classifies every operation and acknowledges every conflict.

## Acceptance verifier

```bash
pnpm --filter @create-something/workflow-observation-reconciler test:acceptance
```

The verifier reconciles twice and compares byte-for-byte output, exercises the blank-approval failure, applies an explicit approval twice, recompiles the resulting definition, and proves the baseline and historical report remain unchanged.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/reconcile.ts`, `src/artifacts.ts`, `src/cli.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test && pnpm test:acceptance` |
| Validation surfaces | Report hash, line-level observations, findings, proposal evidence, conflicts, approval diagnostics, compiler proof, deterministic artifacts |
| UI validation path | none; this prototype emits machine-readable reconciliation and review artifacts |
| Escalation rule | stop on missing configured evidence, unsupported threshold generalization, unreviewed operations, unacknowledged conflicts, source mutation, live-system access, or deployment |

## Shadow-only boundary

This package parses one committed aggregate calibration report. It does not observe live execution, ingest raw case receipts, infer undocumented workflows with a model, change marketplace policy, write to external systems, or deploy. Its findings are evidence-backed prototype outputs, not approval of real marketplace decisions.
