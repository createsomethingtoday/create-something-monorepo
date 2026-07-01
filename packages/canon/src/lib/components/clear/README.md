# Clear Components

The `Clear*` components are Canon's owned implementation of Ona-derived clear
communication. Ona is the communication reference; these components are the
CREATE SOMETHING surface for mapped, governed, proof-bearing work.

The public Canon docs page for this layer is
`packages/ltd/src/lib/content/canon/components/clear.md`.

Use clear components when a page needs to show:

- what workflow or system is being mapped
- which action can run, needs review, or is blocked
- which policy, contract, receipt, or validation gate proves the claim
- what the operator or buyer should do next

Do not use clear components as generic light-themed decoration. A clear surface
should answer at least one operational question.

## Component Roles

| Component | Use when |
|-----------|----------|
| `ClearPageSection` | A page band needs a plain claim, short explanation, proof, action, or aside. |
| `ClearPlatformHero` | The first viewport needs to anchor a product, system, or platform with proof. |
| `ClearProofStrip` | Several compact proof objects need to be scanned together. |
| `ClearWorkflowMiniArtifact` | Signal, Decision, or Proof needs a deterministic mini artifact that reads as interface evidence, not illustration. |
| `ClearDecisionPanel` | A workflow has allow, review, block, or neutral decision states. |
| `ClearStateRows` | The page needs explicit run, wait, stop, or handoff rows. |
| `ClearReceiptGrid` | Delivery evidence, artifacts, or validation receipts need to be shown. |
| `ClearArtifactCard` | One evidence object needs a title, status, description, and link. |
| `ClearCtaBand` | The next action needs a restrained final prompt. |

## Copy Contract

Clear component copy should use workflow nouns and verbs:

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

## Boundary

Clear components should make CREATE SOMETHING feel calm and inevitable while
proving a different thing than Ona: the work has been mapped, integrated,
governed, validated, and handed off with evidence.
