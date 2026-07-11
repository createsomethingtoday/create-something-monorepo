# Workflow Historical Context Reconciler

`@create-something/workflow-historical-context-reconciler` measures whether controlled historical workflow context can account for outcomes left unexplained by the objective evidence lane.

The package is deliberately narrower than a subjective judge. It consumes only:

- selection stratum;
- observed status;
- controlled rejection category;
- controlled improvement-area options;
- booleans indicating whether review feedback, rejection feedback, and decision date exist;
- source hashes and line pointers.

It never emits feedback text or reviewer identity. Unknown taxonomy values fail closed. Langfuse is explicitly out of scope because it belongs to another project.

## Public interface

```ts
import {
  loadSanitizedHistoricalContextBundle,
  reconcileWorkflowHistoricalContext,
  writeWorkflowHistoricalContextArtifacts,
} from '@create-something/workflow-historical-context-reconciler';
```

The loader joins `outcomes.private.jsonl` and `status-alignment.jsonl` by case ID, records per-file and composite hashes, and constructs a sanitized bundle. The reconciler applies only the versioned policy at `fixtures/marketplace/context-policy.json`.

## CRE-1203 result

Against the private CRE-1202 20-case corpus:

- objective-lane discrepancies: 13;
- manual-quality context: 4;
- policy or duplicate context: 4;
- iterative-feedback context: 4;
- snapshot-or-override ambiguity: 1;
- context-supported cases: 12;
- context coverage: 92.3 percent;
- additive evaluations proposed: 2;
- operator-required conflicts: 1.

The remaining ambiguous approved case is not resolved automatically. Current-site evidence cannot distinguish a historical snapshot change from an explicit override or exception without additional receipts.

## CLI

```bash
node packages/workflow-historical-context-reconciler/dist/cli.js reconcile \
  --baseline packages/workflow-compiler/fixtures/marketplace/workflow.json \
  --context-dir "/private/context-bundle" \
  --policy packages/workflow-historical-context-reconciler/fixtures/marketplace/context-policy.json \
  --out /tmp/workflow-historical-context
```

The output contains the sanitized context bundle, reconciliation, evidence inventory, conflicts, proposal, and untouched approval template. The command never applies the proposal.

## Privacy proof

The accepted private run compared every emitted artifact against the reviewer names and feedback snippets present in the source corpus. It checked 23 sensitive values plus the forbidden keys `reviewer`, `review_feedback_snippet`, and `rejection_feedback_snippet`; zero appeared in seven output files.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/load.ts`, `src/reconcile.ts`, `src/artifacts.ts`, `src/cli.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test` |
| Validation surfaces | Source hashes, joined case IDs, sanitized context, coverage counts, ambiguity conflict, proposal hash, approval template, deterministic artifact comparison, privacy scan |
| UI validation path | none; this package emits private machine-readable review artifacts |
| Escalation rule | stop on unknown categories, private-text or identity leakage, unconfigured discrepancies, ambiguity resolution, unreviewed proposal application, external writes, or deployment |

## Boundary

Historical context explains why a human-owned lane may have acted; it does not prove the decision was correct. The proposal adds evidence requirements and escalation behavior only. No creator-facing feedback, decision reversal, subjective automation, or policy promotion is authorized.
