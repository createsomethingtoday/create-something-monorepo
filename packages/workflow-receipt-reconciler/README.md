# Workflow Receipt Reconciler

`@create-something/workflow-receipt-reconciler` converts immutable case-level historical records into replayable workflow discrepancies, sampling-gate evidence, and approval-compatible workflow proposals.

It is the CRE-1195 follow-up to the aggregate Workflow Observation Reconciler. The original balanced-50 run referenced private JSONL files under `/tmp`, but those historical artifacts are not committed and no preserved local copy was found. The package can consume both exact case arrays embedded in committed reports and joined raw artifact directories from a new, explicitly identified acquisition.

The package never treats a regenerated corpus as reconstruction of the missing 2026-05-27 sample.

## Boundaries

1. **Receipt extraction:** parse the embedded cases and preserve the report hash plus exact source line range.
2. **Replay:** map observed outcomes to documented actions and classify whether objective evidence explains the historical result.
3. **Sampling gate:** evaluate minimum cases, minimum reviewers, and maximum reviewer share from explicit policy.
4. **Proposal:** add a case-provenance evaluation behind the existing hash-bound approval contract while preserving every failed sampling condition as an operator-required conflict.

Acknowledging a sampling conflict does not make the corpus sufficient. It only permits an operator to apply the unrelated evaluation contract so that a future adequate corpus must carry case-level provenance.

## Current result

The two available receipts replay as:

- Introx: approved despite two substantive objective findings.
- Automatia: rejected while the captured sandbox evidence contained no objective finding explaining the rejection.

Both discrepancies preserve source line provenance. The corpus gate correctly remains blocked:

- 2 cases versus a minimum of 8;
- 1 reviewer versus a minimum of 4;
- 100 percent maximum reviewer share versus a 35 percent ceiling.

This is a successful fail-closed result, not a promotion candidate.

## Public interface

```ts
import {
  extractEmbeddedWorkflowReceiptCorpus,
  loadWorkflowReceiptCorpusFromDirectory,
  reconcileWorkflowReceiptCorpus,
  writeWorkflowReceiptReconciliationArtifacts,
} from '@create-something/workflow-receipt-reconciler';
```

The public API does not mutate the report, corpus, policy, or baseline definition.

`loadWorkflowReceiptCorpusFromDirectory` requires these four JSONL files and fails unless every case ID joins across all of them:

- `manifest.blind.jsonl`
- `outcomes.private.jsonl`
- `sandbox-results.jsonl`
- `status-alignment.jsonl`

It records a SHA-256 hash for every file plus a composite corpus hash. Missing historical quality ratings remain absent rather than being fabricated.

## CRE-1196 regenerated corpus

A new credentialed read-only acquisition generated eight cases outside git after correcting the sampler to round reviewer caps down instead of above the configured share. The private bundle produced:

- 8 usable receipts across all five target strata;
- 5 reviewers;
- 25 percent maximum reviewer share against a 35 percent ceiling;
- 4 aligned and 4 discrepant replays;
- a passing corpus sampling gate;
- one transparent per-stratum fallback warning for the rejected-low-quality slice.

This validates the raw receipt contract. It does not recreate or supersede the original balanced-50 historical evidence.

## CRE-1202 wider corpus

A selection-only gate proved that current Airtable history could supply a wider sample without reviewer fallback, so a bounded 20-case E2B acquisition was allowed to proceed. The resulting private corpus contains:

- exactly 4 cases in each of the 5 target strata;
- 20 usable evidence packets;
- 7 reviewer buckets, including an explicit missing-reviewer bucket;
- 25 percent maximum reviewer share;
- zero selection warnings;
- 7 aligned and 13 discrepant case replays;
- a passing sampling gate and zero proposal conflicts.

Missing reviewer identity is normalized to `(missing reviewer)` for sampling accounting; no identity is inferred. Langfuse was explicitly excluded because it belongs to another project.

## CLI

```bash
node packages/workflow-receipt-reconciler/dist/cli.js reconcile \
  --baseline packages/workflow-compiler/fixtures/marketplace/workflow.json \
  --report specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md \
  --policy packages/workflow-receipt-reconciler/fixtures/marketplace/reconciliation-policy.json \
  --out /tmp/workflow-receipt-reconciliation
```

The output includes `corpus.json`, `reconciliation.json`, and a proposal review packet. The proposal must still be applied separately through the evidence extractor with every operation classified and every conflict acknowledged.

## Acceptance verifier

```bash
pnpm --filter @create-something/workflow-receipt-reconciler test:acceptance
```

The verifier runs reconciliation and approved application twice, compares byte-for-byte output, exercises the blank-approval failure, recompiles the approved definition, confirms the sampling gate remains blocked, and proves the report and baseline are unchanged.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/extract.ts`, `src/reconcile.ts`, `src/artifacts.ts`, `src/cli.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test && pnpm test:acceptance` |
| Validation surfaces | Source hash, receipt line ranges, replay classifications, sampling gate, proposal evidence, conflicts, approval diagnostics, compiler proof, deterministic artifacts |
| UI validation path | none; this prototype emits machine-readable receipt, reconciliation, and approval artifacts |
| Escalation rule | stop on missing provenance, fabricated cases, insufficient-corpus promotion, reviewer-specific policy, unreviewed operations, unacknowledged conflicts, source mutation, live access, or deployment |

## Next prerequisite

Keep the private corpus outside git and obtain operator approval before applying its additive `case-level-outcome-replay` evaluation proposal. The wider corpus removes the prior sampling fallback, but 13 of 20 outcomes remain unexplained by the objective lane; the next experiment should add an authorized, evidence-backed subjective or historical-context lane without promoting reviewer-specific policy.
