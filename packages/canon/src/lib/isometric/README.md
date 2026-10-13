# Canon isometric illustrations

Classified as a `brand-surface` following Canon’s existing ASCII identity policy, not promoted to the stable foundation component registry.

Original conceptual family for explanatory placements. Uses one 30-degree projection, two side values, thin non-scaling strokes and inherited Canon ink. It does not replace the CREATE SOMETHING mark, Draw identity or compact navigation glyphs.

```svelte
<IsometricIllustration kind="diagnose" size={144} />
<IsometricIllustration kind="handoff" label="Documented ownership handoff" />
```

Exports: `IsometricIllustration`, `IsometricKind`, `isometricKinds`, `isometricDescriptions`, `isometricModel`, `project`, `IsoShape` from `@create-something/canon`. Minimum recommended display width: 64px; use existing compact marks below that. Repeated instances are static and contain no animation, canvas, network request or event handler. The parent supplies foreground color and may set `--isometric-surface` to its actual Canon surface token. No status colors or measured-result claims are built in.

Meaning: Map connects steps; Diagnose isolates a break; Build aligns layers; Approve holds an action at a boundary; Verify pairs checks with a record; Handoff transfers documentation; Learn opens a guide; Operate joins a queue, boundary and retained record. These are concepts, not product screenshots or live result indicators.

By default illustrations are decorative beside visible explanatory text. Supply `label` only when the illustration conveys independent content; the SVG then has an accessible title and semantic description. No IDs are generated, so repeated instances cannot collide. Page actions remain native buttons/links with their existing labels and targets.

Motion guidance and exact accepted reference: `docs/designs/canon-isometric/ACCEPTANCE.md` and `.agents/skills/canon-educational-video/references/brand-and-motion.md`. Original source; Anatomy reference pinned to `dbf697a527bbf7d358668e1557cb1e35ff725d46`. No upstream executable code reused; reference MIT notice retained in the design study.
