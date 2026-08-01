# Performance Lab Design And Composition System

The Performance design system is one Canon-owned namespace for presenting and operating an AI workflow system from claim through handoff. It applies to campaign, editorial, research, learning, product, evidence, and operator surfaces. It owns shared typography, spacing, contrast, responsive behavior, state, proof, motion, and composition so properties do not reconstruct those decisions route by route.

## The composition grammar

| Pattern                | Component                      | Owns                                                                                                                                            |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign opening       | `PerformanceCampaignOpening`   | Static-first first viewport, optional progressive video enhancement, responsive image source, claim hierarchy, actions, and campaign proof rail |
| Thesis + conditions    | `PerformanceThesisConditions`  | One governing proposition paired with explicit signal, pressure, growth, risk, or neutral conditions                                            |
| Sequential field tests | `PerformanceFieldSequence`     | Ordered studies, figure numbering, alternating media, optional sticky progression, and reduced-motion fallback                                  |
| Contrast chapter       | `PerformanceContrastChapter`   | The black/white principle-to-intervention break and an inline or full-width slot for a real route-owned artifact                                |
| Evidence index         | `PerformanceEvidenceIndex`     | Inspectable public evidence rows, receipt state, links, and an explicit empty state                                                             |
| Indexed narrative      | `PerformanceNarrativeStage`    | A persistent scene index, one focused property-owned artifact, URL state, pointer/touch/keyboard controls, and complete SSR/no-JavaScript order |
| Conversion handoff     | `PerformanceConversionHandoff` | Owner, authority, proof, state, optional staged steps, actions, and compact or full-width artifact placement at the next boundary               |

These seven patterns are a grammar, not seven required page sections. Every Performance surface must compose from this system before inventing another route-level shell, but adjacent ideas should share one chapter when they support the same decision. The narrative protocol remains claim, conditions, tests, intervention, evidence, handoff; a homepage should normally land that protocol in three to five top-level sections.

Use `PerformanceNarrativeStage` when two or more adjacent chapters are parts of one operating decision and each has a meaningful property-owned artifact. The ordered index keeps every scene label, summary, state, and primary destination visible; the active panel concentrates the complete detail, evidence, receipts, and artifact. Use the optional `preview` snippet when decisive property-owned proof must remain visible before scene selection; keep it compact and do not repeat the same proof object inside an active scene. Selection is always explicit—never autoplayed—and supports pointer, touch, roving arrow/Home/End keys, previous/next controls, and stable URL fragments. Canon renders every panel in document order during SSR, then hides inactive panels only after hydration. This is progressive disclosure, not content removal.

Judge the stage in the complete page. The opening must create the question, the stage must resolve it with proof, and the final handoff must be the earned next action. Do not use the stage to combine unrelated ideas, preserve duplicated introductions, or add motion that competes with the page argument. Property artifacts stay behind the scene-aware `artifact` snippet; Canon owns only selection, responsive composition, focus, state, and fallback behavior.

## Whole-page sharpness contract

The composition grammar sits inside a stricter whole-page contract. Every CREATE SOMETHING page declares one decision, one narrative or task spine, bounded chapter roles, one primary proof location, and one earned handoff. The stable archetypes are `landing`, `commercial`, `editorial`, `index`, `learning`, and `tool`; each has a different chapter budget and canonical spine. A long article body, collection, learning sequence, or live workspace remains one top-level chapter even when its internal structure is rich.

Use `validatePerformancePageContract` and the exported `PerformancePage*` types to validate the contract through Canon's public interface. The cross-property registry and fail-closed commands are documented in [`docs/PERFORMANCE_PAGE_SHARPNESS.md`](../../../../../../docs/PERFORMANCE_PAGE_SHARPNESS.md). A new route must be registered explicitly; authenticated and operator pages use the `tool` contract rather than escaping the system.

The universal sequence is not permission to make properties or page types look alike. Canon owns the vocabulary, budgets, responsive behavior, and validation. Properties keep their words, media, evidence, data, and domain action. Choose a static chapter, index, field sequence, narrative stage, editorial body, or work surface according to the communication problem.

Use `density="compact"` on `PerformanceCampaignOpening`, `PerformancePageSection`, `PerformanceDecisionPanel`, `PerformanceConversionHandoff`, and `PropertyFunnel` when the full content contract can remain visible with a shorter vertical commitment. Compact density changes spacing and responsive composition only. It must not hide summaries, remove evidence, or turn multiple unchanged chapters into one wrapper. `PropertyFunnel` may also carry a compact `handoff` ledger when progression and the final authority boundary belong to the same decision.

## Ownership boundary

Canon owns layout, responsive behavior, contrast, accessible section semantics, state tones, empty states, media handling, reduced-motion behavior, and the shape of the handoff contract.

Properties own words, route data, original media, domain-specific artifacts, application forms, live canvases, analytics, and integration behavior. The `artifact`, `actions`, and `aside` snippets are the intended seams. Do not move a booking form, Atlas renderer, or client record into Canon to make a page fit this system.

Campaign actions inherit a mode-aware surface from `PerformanceCampaignOpening`: ink openings provide a light primary action and a translucent, light-bordered secondary action; paper openings reverse that relationship. Properties may supply the action destination and label, but they must not reintroduce page-surface button colors over image-backed media.

Campaign video is a progressive enhancement, never the only media surface. Supply the canonical responsive `src`, `mobileSrc`, and `alt` first, then optionally add `video.mp4`, `video.webm`, and a matching `video.poster`. Canon renders the still during SSR and first paint, adds silent autoplaying loop media only after hydration when motion is allowed, and keeps the video element absent when `prefers-reduced-motion: reduce` applies. Text, actions, proof, scrims, and grid overlays remain live DOM; never bake them into video. The static image is also the rollback when video delivery or motion quality fails.

Keep ordinary proof artifacts inline. Use `artifactPlacement="full-width"` on `PerformanceContrastChapter` when the artifact is itself an operating surface, such as a live canvas whose nodes, controls, and inspector need enough width to remain legible. The property still owns the renderer and projection; Canon only owns its placement in the chapter.

The same placement rule applies to conversion. Keep a compact receipt or object in the default `sidecar` position. Set `artifactPlacement="full-width"` on `PerformanceConversionHandoff` when a delegation object, workflow map, or approval surface needs horizontal room. Canon then pairs the narrative with a compact authority ledger and promotes the route-owned artifact to a shared proof row below them.

`PerformanceConversionHandoff` defaults to an `h2`; set `headingLevel="h1"`
when it is the primary product or operator opening for the page.

## Typography contract

Performance uses the Canon system sans stack for commands, conclusions, interface prose, and display copy. Canon sets display weight `500`, tracking `-0.03em`, line-height `0.94`, normal kerning, and standard kerning and ligature features. IBM Plex Mono owns labels, evidence, numbers, metadata, states, timestamps, identifiers, topology labels, and code in bundled applications. Tabular values should continue to use tabular numerals.

IBM Plex Mono is bundled from the official `@ibm/plex-mono` package under the SIL Open Font License. Standalone documents and email use system sans and monospace stacks, so the Performance contract does not depend on a remote font host. A property may supply original media and content, but typography remains a Canon-owned contract. `PerformanceThesisConditions` defaults to an `h2`; set `headingLevel="h1"` when it is the primary product or operator opening.

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

<PerformanceNarrativeStage id="operating-story" title="Map. Decide. Prove." {scenes}>
  {#snippet preview()}<!-- compact route-owned proof visible before selection -->{/snippet}
  {#snippet artifact(scene)}<!-- route-owned artifact for this scene -->{/snippet}
</PerformanceNarrativeStage>

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
