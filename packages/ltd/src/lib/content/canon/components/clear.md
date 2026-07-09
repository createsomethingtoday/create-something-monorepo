---
category: "Canon"
section: "Components"
title: "Clear Components"
description: "Performance Lab communication primitives for mapped, governed, proof-bearing work."
lead: "Clear components turn Performance Lab discipline into owned CREATE SOMETHING surfaces for workflow maps, policy states, receipts, validation gates, and operator handoff."
publishedAt: "2026-06-21"
published: true
---

## What Ships Today

- `ClearPageSection`: open page bands for claims, proof, actions, and asides
- `ClearPlatformHero`: first-viewport product, system, or platform anchors
- `ClearProofStrip`: compact evidence objects scanned together
- `ClearDecisionPanel`: allow, review, block, or neutral decision states
- `ClearStateRows`: explicit run, wait, stop, or handoff rows
- `ClearReceiptGrid`: delivery evidence, artifacts, and validation receipts
- `ClearArtifactCard`: one evidence object with status and link
- `ClearCtaBand`: restrained next-action bands
- `ClearActionFooter`: final page-level actions with proof and restraint
- `ClearCardGrid`: repeated evidence cards without nested-card shells
- `ClearContentHighlights`: compact highlights for claims, facts, and receipts
- `ClearErrorPage`: plain-language failure state with recovery path
- `ClearLogoStrip`: partner, proof, or trust marks with accessible labels
- `ClearMetadataRail`: dense metadata, owners, receipts, and state facts
- `ClearPillarGrid`: pillar summaries for proof-bearing systems
- `ClearQuoteMetricPanel`: quote and metric pairings for validated claims
- `ClearSecurityPanel`: trust, policy, and control evidence for sensitive surfaces
- `ClearUseCaseBand`: use-case summaries tied to concrete next actions
- `ClearWorkflowMiniArtifact`: compact artifact preview for workflow state

## When To Use Clear Components

Use clear components when the page needs to show at least one operational answer:

1. What workflow or system has been mapped?
2. What can run, what needs review, and what is blocked?
3. Which policy, contract, receipt, or validation gate proves the claim?
4. What should the buyer, operator, reviewer, system, or agent do next?

Do not use clear components as generic light-themed decoration. If the surface does not carry
maps, trust boundaries, approval states, receipts, validation gates, or handoff evidence, use the
standard Canon components instead.

## Example

```svelte
<script lang="ts">
  import { ClearDecisionPanel, ClearPageSection, ClearReceiptGrid } from '@create-something/canon';
</script>

<ClearPageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Governed workflow"
  title="Map the action before the agent runs."
  description="Name the object, approval rule, stop condition, and receipt before execution."
/>

<ClearDecisionPanel
  title="Show whether to run, review, or stop."
  items={[
    {
      label: 'Review',
      summary: 'Approval needed',
      title: 'The write path changes customer data.',
      detail: 'The policy requires an operator review before the tool can run.',
      tone: 'review',
      evidence: ['Write target is named', 'Policy rule is attached'],
      receipts: ['workflow-map', 'approval-log']
    }
  ]}
/>

<ClearReceiptGrid
  receipts={[
    {
      title: 'Workflow map',
      status: 'Ready',
      description: 'Objects, tools, approval rules, and stop states are documented.'
    }
  ]}
/>
```

## Property Usage Notes

On CREATE SOMETHING properties, use `ClearLogoStrip` only when the relationship behind each
logo is true and labelable. Use `ClearContentHighlights`, `ClearPillarGrid`, `ClearUseCaseBand`,
and `ClearQuoteMetricPanel` when a claim needs nearby proof or a concrete buyer/operator use case.
Use `ClearSecurityPanel` when the page needs to show policy, access, control, or compliance
evidence. Use `ClearMetadataRail` and `ClearWorkflowMiniArtifact` for dense operational state,
owners, receipts, and handoff metadata. Use `ClearErrorPage` when failure recovery must be plain
language, visible, and actionable. Use `ClearActionFooter` when the final action should remain
bounded to a named workflow, review, handoff, or governed surface.

## Copy Rules

- Use nouns from the workflow: object, tool, record, tenant, bundle, policy, receipt.
- Use verbs from the work: map, review, approve, block, run, validate, hand off.
- Put proof beside the claim.
- Keep headings plain and short.
- Use mono labels for short state, receipt, or identifier text.

## Related

- [Navigation](/canon/components/navigation)
- [Colors](/canon/foundations/colors)
- [Typography](/canon/foundations/typography)
