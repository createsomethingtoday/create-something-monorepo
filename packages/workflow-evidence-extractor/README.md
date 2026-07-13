# Workflow Evidence Extractor

`@create-something/workflow-evidence-extractor` turns bounded operating evidence into a provenance-backed workflow-definition proposal. It is the CRE-1192 follow-up to the marketplace Workflow Compiler prototype.

The package deliberately separates three moments:

1. **Evidence:** parse and hash existing source artifacts.
2. **Proposal:** emit additive operations and unresolved conflicts with confidence and field-level provenance.
3. **Approval:** apply only operations explicitly approved by an operator against the exact baseline and proposal hashes.

The resulting definition is then passed to `@create-something/workflow-compiler`, which remains the owner of structural and governance validation.

## Public interface

```ts
import {
  applyApprovedWorkflowProposal,
  extractWorkflowDefinitionProposal,
  loadWorkflowEvidenceSource,
} from '@create-something/workflow-evidence-extractor';
```

`extractWorkflowDefinitionProposal` never mutates its baseline or sources. `applyApprovedWorkflowProposal` clones the baseline, verifies the proposal content hash, requires every operation to be approved or rejected, requires every conflict to be acknowledged, applies approved additive operations, and returns compiler proof.

## Marketplace evidence adapter

The prototype reads the actual versioned artifacts:

- `specs/webflow-marketplace/delivery/template-review-hub/agent_contract.yaml`
- `specs/webflow-marketplace/delivery/template-review-hub/mcp_contract.yaml`
- `specs/webflow-marketplace/delivery/template-review-hub/rule-catalog.phase1.json`

The bounded extraction policy lives at `fixtures/marketplace/extraction-policy.json`. It makes system, rule, and semantic action mappings explicit instead of hiding judgment in source code.

The accepted run emits six additive system/evaluation operations and surfaces two unresolved autonomy conflicts:

- `/actions/approve_template/autonomy`
- `/actions/publish_template/autonomy`

Those conflicts do not become operations. Acknowledgment permits unrelated approved additions to proceed but does not resolve or modify the conflicting fields.

## Two-phase CLI

Generate a review packet:

```bash
node packages/workflow-evidence-extractor/dist/cli.js propose \
  --baseline packages/workflow-compiler/fixtures/marketplace/workflow.json \
  --agent-contract specs/webflow-marketplace/delivery/template-review-hub/agent_contract.yaml \
  --mcp-contract specs/webflow-marketplace/delivery/template-review-hub/mcp_contract.yaml \
  --rule-catalog specs/webflow-marketplace/delivery/template-review-hub/rule-catalog.phase1.json \
  --policy packages/workflow-evidence-extractor/fixtures/marketplace/extraction-policy.json \
  --out /tmp/workflow-evidence-proposal
```

Copy and complete the generated `approval-template.json`, then apply that separate manifest:

```bash
node packages/workflow-evidence-extractor/dist/cli.js apply \
  --baseline packages/workflow-compiler/fixtures/marketplace/workflow.json \
  --proposal /tmp/workflow-evidence-proposal/proposal.json \
  --approval /tmp/workflow-evidence-approval.json \
  --out /tmp/workflow-evidence-application
```

The proposal command never accepts approval flags. The apply command never extracts evidence. This preserves an inspectable operator boundary.

## Acceptance verifier

```bash
pnpm --filter @create-something/workflow-evidence-extractor test:acceptance
```

The verifier runs proposal generation twice and approved application twice, compares byte-for-byte output, exercises the blank-approval failure, proves the baseline file is unchanged, and recompiles the approved definition.

## Agent Legibility Contract

| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/extract.ts`, `src/approval.ts`, `src/source.ts`, `src/cli.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm check && pnpm test && pnpm test:acceptance` |
| Validation surfaces | Source hashes, evidence inventory, proposal hash, conflicts, approval diagnostics, application receipt, compiler proof, deterministic artifact manifests |
| UI validation path | none; the prototype produces machine-readable review artifacts and a separate approval template |
| Escalation rule | stop on unreviewed operations, unacknowledged conflicts, hash mismatch, source mutation, automatic conflict resolution, or any live-system boundary |

## Shadow-only boundary

This package performs no model call, live discovery, production deployment, external write, marketplace decision, credential/access change, or public positioning migration. Fixture approval demonstrates the gate; it is not approval of real marketplace policy.
