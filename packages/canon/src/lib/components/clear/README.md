# Legacy Clear Compatibility

The files and `Clear*` exports in this directory are compatibility identifiers
for the original Ona-derived implementation. New CREATE SOMETHING surfaces use
the `Performance*` exports from `components/performance`. Both names resolve to
the same Performance Lab implementation so existing downstream callers and
`component.clear-*` registry IDs remain stable.

The public Canon docs page for this layer is
`packages/ltd/src/lib/content/canon/components/clear.md`.

Use Performance components when a page needs to show:

- what workflow or system is being mapped
- which action can run, needs review, or is blocked
- which policy, contract, receipt, or validation gate proves the claim
- what the operator or buyer should do next

Do not use Performance components as generic light-themed decoration. A Performance surface
should answer at least one operational question.

## Component Roles

| Component | Use when |
|-----------|----------|
| `PerformancePageSection` | A page band needs a plain claim, short explanation, proof, action, or aside. |
| `PerformancePlatformHero` | The first viewport needs to anchor a product, system, or platform with proof. |
| `PerformanceProofStrip` | Several compact proof objects need to be scanned together. |
| `PerformanceWorkflowMiniArtifact` | Signal, Decision, or Proof needs a deterministic mini artifact that reads as interface evidence, not illustration. |
| `PerformanceDecisionPanel` | A workflow has allow, review, block, or neutral decision states. |
| `PerformanceStateRows` | The page needs explicit run, wait, stop, or handoff rows. |
| `PerformanceReceiptGrid` | Delivery evidence, artifacts, or validation receipts need to be shown. |
| `PerformanceArtifactCard` | One evidence object needs a title, status, description, and link. |
| `PerformanceCtaBand` | The next action needs a restrained final prompt. |

## Copy Contract

Performance component copy should use workflow nouns and verbs:

- object: workflow, tool, record, tenant, bundle, policy, receipt
- action: map, review, approve, block, run, validate, hand off
- proof: contract, gate, trace, eval, receipt, runbook, evidence
- owner: buyer, operator, reviewer, system, agent

Avoid generic AI language when a concrete operational noun exists.

## Layout Contract

- Prefer open sections over nested cards.
- Keep headings plain and short.
- Put evidence beside claims, not several sections later.
- Use compact panels for operator surfaces.
- Use motion only for state, selection, progression, or handoff.
- Keep CTAs bounded to concrete work such as mapping one workflow, reviewing a
  handoff, or opening a governed surface.
- Use `controlled`, `ready`, `review`, and `stop` for action authority. Pair
  each state color with a label, reason, owner, or receipt.
- Use pressure orange for test intensity or decisive emphasis, never as a
  synonym for approval or safety.

## Boundary

Performance components should make CREATE SOMETHING feel calm and inevitable while
proving that the work has been mapped, integrated, governed, validated, and
handed off with evidence.
