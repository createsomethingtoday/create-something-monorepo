---
category: "Canon"
section: "Components"
title: "Performance Components"
description: "Performance Lab communication primitives for mapped, governed, proof-bearing work."
lead: "Performance components turn the owned CREATE SOMETHING design language into workflow maps, policy states, receipts, validation gates, and operator handoff."
publishedAt: "2026-06-21"
published: true
---

## What Ships Today

- `PerformancePageSection`: open page bands for claims, proof, actions, and asides
- `PerformancePlatformHero`: first-viewport product, system, or platform anchors
- `PerformanceProofStrip`: compact evidence objects scanned together
- `PerformanceDecisionPanel`: allow, review, block, or neutral decision states
- `PerformanceStateRows`: explicit run, wait, stop, or handoff rows
- `PerformanceReceiptGrid`: delivery evidence, artifacts, and validation receipts
- `PerformanceArtifactCard`: one evidence object with status and link
- `PerformanceCtaBand`: restrained next-action bands
- `PerformanceActionFooter`: final page-level actions with proof and restraint
- `PerformanceCardGrid`: repeated evidence cards without nested-card shells
- `PerformanceContentHighlights`: compact highlights for claims, facts, and receipts
- `PerformanceErrorPage`: plain-language failure state with recovery path
- `PerformanceLogoStrip`: partner, proof, or trust marks with accessible labels
- `PerformanceMetadataRail`: dense metadata, owners, receipts, and state facts
- `PerformancePillarGrid`: pillar summaries for proof-bearing systems
- `PerformanceQuoteMetricPanel`: quote and metric pairings for validated claims
- `PerformanceSecurityPanel`: trust, policy, and control evidence for sensitive surfaces
- `PerformanceUseCaseBand`: use-case summaries tied to concrete next actions
- `PerformanceWorkflowMiniArtifact`: compact artifact preview for workflow state

## When To Use Performance Components

Use Performance components when the page needs to show at least one operational answer:

1. What workflow or system has been mapped?
2. What can run, what needs review, and what is blocked?
3. Which policy, contract, receipt, or validation gate proves the claim?
4. What should the buyer, operator, reviewer, system, or agent do next?

Do not use Performance components as generic light-themed decoration. If the surface does not carry
maps, trust boundaries, approval states, receipts, validation gates, or handoff evidence, use the
standard Canon components instead.

## Example

```svelte
<script lang="ts">
  import { PerformanceDecisionPanel, PerformancePageSection, PerformanceReceiptGrid } from '@create-something/canon';
</script>

<PerformancePageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Governed workflow"
  title="Map the action before the agent runs."
  description="Name the object, approval rule, stop condition, and receipt before execution."
/>

<PerformanceDecisionPanel
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

<PerformanceReceiptGrid
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

On CREATE SOMETHING properties, use `PerformanceLogoStrip` only when the relationship behind each
logo is true and labelable. Use `PerformanceContentHighlights`, `PerformancePillarGrid`, `PerformanceUseCaseBand`,
and `PerformanceQuoteMetricPanel` when a claim needs nearby proof or a concrete buyer/operator use case.
Use `PerformanceSecurityPanel` when the page needs to show policy, access, control, or compliance
evidence. Use `PerformanceMetadataRail` and `PerformanceWorkflowMiniArtifact` for dense operational state,
owners, receipts, and handoff metadata. Use `PerformanceErrorPage` when failure recovery must be plain
language, visible, and actionable. Use `PerformanceActionFooter` when the final action should remain
bounded to a named workflow, review, handoff, or governed surface.

## Copy Rules

- Use nouns from the workflow: object, tool, record, tenant, bundle, policy, receipt.
- Use verbs from the work: map, review, approve, block, run, validate, hand off.
- Put proof beside the claim.
- Keep headings plain and short.
- Use mono labels for short state, receipt, or identifier text.

## Related

The `/canon/components/clear` route and `component.clear-*` registry IDs remain
compatibility identifiers. New code imports `Performance*` names.

- [Navigation](/canon/components/navigation)
- [Colors](/canon/foundations/colors)
- [Typography](/canon/foundations/typography)
