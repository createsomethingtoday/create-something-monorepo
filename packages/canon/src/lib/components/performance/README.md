# Performance Lab Design And Composition System

The Performance design system is one Canon-owned namespace for presenting and operating an AI workflow system from claim through handoff. It applies to campaign, editorial, research, learning, product, evidence, and operator surfaces. It owns shared typography, spacing, contrast, responsive behavior, state, proof, motion, and composition so properties do not reconstruct those decisions route by route.

## The six-pattern sequence

| Pattern | Component | Owns |
|---|---|---|
| Campaign opening | `PerformanceCampaignOpening` | Media-first first viewport, responsive image source, claim hierarchy, actions, and campaign proof rail |
| Thesis + conditions | `PerformanceThesisConditions` | One governing proposition paired with explicit signal, pressure, growth, risk, or neutral conditions |
| Sequential field tests | `PerformanceFieldSequence` | Ordered studies, figure numbering, alternating media, optional sticky progression, and reduced-motion fallback |
| Contrast chapter | `PerformanceContrastChapter` | The black/white principle-to-intervention break and an inline or full-width slot for a real route-owned artifact |
| Evidence index | `PerformanceEvidenceIndex` | Inspectable public evidence rows, receipt state, links, and an explicit empty state |
| Conversion handoff | `PerformanceConversionHandoff` | Owner, authority, proof, state, optional staged steps, actions, and compact or full-width artifact placement at the next boundary |

Not every page needs all six patterns, but every Performance surface must compose from this system before inventing another route-level shell. The order is a narrative protocol, not a mandatory template: claim, conditions, tests, intervention, evidence, handoff. Product and operator surfaces normally emphasize conditions, evidence, and handoff; campaign and editorial surfaces may use the full sequence.

## Ownership boundary

Canon owns layout, responsive behavior, contrast, accessible section semantics, state tones, empty states, media handling, reduced-motion behavior, and the shape of the handoff contract.

Properties own words, route data, original media, domain-specific artifacts, application forms, live canvases, analytics, and integration behavior. The `artifact`, `actions`, and `aside` snippets are the intended seams. Do not move a booking form, Atlas renderer, or client record into Canon to make a page fit this system.

Campaign actions inherit a mode-aware surface from `PerformanceCampaignOpening`: ink openings provide a light primary action and a translucent, light-bordered secondary action; paper openings reverse that relationship. Properties may supply the action destination and label, but they must not reintroduce page-surface button colors over image-backed media.

Keep ordinary proof artifacts inline. Use `artifactPlacement="full-width"` on `PerformanceContrastChapter` when the artifact is itself an operating surface, such as a live canvas whose nodes, controls, and inspector need enough width to remain legible. The property still owns the renderer and projection; Canon only owns its placement in the chapter.

The same placement rule applies to conversion. Keep a compact receipt or object in the default `sidecar` position. Set `artifactPlacement="full-width"` on `PerformanceConversionHandoff` when a delegation object, workflow map, or approval surface needs horizontal room. Canon then pairs the narrative with a compact authority ledger and promotes the route-owned artifact to a shared proof row below them.

## Typography contract

Performance display copy uses a system-safe Helvetica family stack: `Helvetica Neue`, `Helvetica`, `Arial`, then platform sans fallbacks. Canon sets display weight `500`, tracking `-0.03em`, line-height `0.94`, normal kerning, and standard kerning and ligature features. This replaces route-specific weight and tracking decisions while keeping paragraph and interface copy on the existing Canon sans and mono stacks.

Do not pull Satoshi or another client, template, remote, or unlicensed face into the shared system. A property may supply original media and content, but typography remains a Canon-owned contract. `PerformanceThesisConditions` defaults to an `h2`; set `headingLevel="h1"` when it is the primary product or operator opening.

## Composition example

```svelte
<PerformanceCampaignOpening {media} {proof} title="Train the system before it runs.">
  {#snippet actions()}...{/snippet}
</PerformanceCampaignOpening>

<PerformanceThesisConditions
  title="Governance is the channel, not the dam."
  conditions={operatingConditions}
/>

<PerformanceFieldSequence title="Test the workflow in sequence." studies={fieldStudies} />

<PerformanceContrastChapter
  {intervention}
  title="Every action leaves a wake."
  artifactPlacement="full-width"
>
  {#snippet artifact()}<!-- route-owned proof object -->{/snippet}
</PerformanceContrastChapter>

<PerformanceEvidenceIndex title="Evidence index" items={evidence} />

<PerformanceConversionHandoff
  {handoff}
  title="Make one workflow safe to delegate."
  artifactPlacement="full-width"
>
  {#snippet actions()}...{/snippet}
</PerformanceConversionHandoff>
```

## Rollout gate

Before another property adopts the system:

1. Canon component tests, package checks, and export verification pass.
2. The `.agency` reference routes pass type checks, production build, desktop, mobile, keyboard, and reduced-motion review.
3. The property supplies original media and its own proof data; no Fleet, Evermind, or other template code, assets, fonts, identity, or copy crosses the boundary.
4. Route-owned application behavior remains independently testable.
5. The rollout records which local structural selectors were removed and which remain intentionally domain-specific.
