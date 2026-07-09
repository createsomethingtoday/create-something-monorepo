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
| `ClearSystemPlate` | A technical system, canvas, topology, or database needs a mood-board/spec-sheet presentation with graph proof, metrics, layers, and operator review lanes. |
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
- Use `ClearSystemPlate` when Atlas, Topology, Substrate, or another canvas-native
  system needs to be consumed like an engineering plate: graph first, metadata
  beside it, human review below it, and proof state visible without opening a
  separate dashboard.
- Use motion only for state, selection, progression, or handoff.
- Keep CTAs bounded to concrete work such as mapping one workflow, reviewing a
  handoff, or opening a governed surface.

## System Plate Contract

`ClearSystemPlate` is Canon's reusable presentation pattern for CREATE SOMETHING
technical mood boards. It should make a complex system feel inspectable rather
than decorative.

Use it for:

- WebGPU database and canvas surfaces where performance changes what a human can
  see, filter, and decide in real time.
- Atlas maps where the graph is the operating object, not an illustration of one.
- Topology surfaces that need relationship density, health, and ownership in the
  same frame.
- Substrate records where durability, policy, actions, and receipts should be
  read as one technical artifact.

The plate should contain at least three of these proof objects: graph/canvas,
system layers, metrics, query or action trace, human review state, policy/proof
rows, and source metadata. Avoid using it as a static collage without an
operational claim.

## Boundary

Clear components should make CREATE SOMETHING feel calm and inevitable while
proving a different thing than Ona: the work has been mapped, integrated,
governed, validated, and handed off with evidence.
