# CREATE SOMETHING Image Prompt

> Content asset ID:
> Image asset slug:
> Surface: article | social | deck | delivery | sales | client-update
> Image family: atlas-story-canvas | system-map-hero | db-automation-judgment | policy-gate-chart | evidence-map | handoff-receipt | screenshot-annotation | cta-visual
> Canvas renderer: Atlas | static-story | sigma | cosmograph | not applicable
> Atlas graph source: existing starter map | new graph artifact | not applicable
> Source brief: graph | SVG | Atlas map | written brief | screenshot | not applicable
> TASTE packet: approved references attached | not applicable
> Owner:
> Review status: draft | approved | published | retired
> Target export:
> Output hash:
> Last updated:

## Model

```text
Model: gpt-image-2
Quality: high
Size:
Source manifest or brief:
TASTE packet:
```

## Purpose

State what the image must prove in one sentence.

```text
Purpose:
Audience:
Primary claim:
Proof object:
Next action:
Canvas source:
Canvas must show: owner | workflow artifact | automation | AI task | human judgment | stop boundary | receipt
Publishable layer: approved OpenAI generated export | screenshot evidence | raw SVG/Atlas only if quality-approved
TASTE references:
```

## Prompt

```text
Create a CREATE SOMETHING <image family> for <surface>.

Purpose: <what the image must prove>.
Audience: <operator, decision owner, builder, reviewer, client>.
Show: <workflow objects, states, proof artifacts, owners, gates>.

TASTE packet: <3 to 7 approved references by title/source and the specific
communication pattern to borrow>. Use references for judgment only. Do not copy
source assets, brand marks, fonts, layouts, campaign language, or images.

If the image explains workflow behavior, governance, an offer, a case study, a
tool comparison, or agent behavior, preserve a graph, SVG, Atlas map, or written
brief with nodes and mapped relationships before any decorative composition. Use
that source brief to generate the publishable OpenAI export.
Preserve the graph
as source context: owner, workflow or data artifact, automation route,
AI-assisted task when present, human judgment point, stop condition, and receipt
surface. Publish raw SVG/Atlas output only when it meets the same quality bar as
the generated export.

Style: CREATE SOMETHING Performance Lab image language:
plain claim, decisive hierarchy, compact proof, governed execution, visible evidence,
readiness states, and restrained action states. Translate that foundation into CREATE SOMETHING artifact language: system maps, MCP boundaries, policy gates, receipts,
validation proof, owners, and handoff state. Prefer porcelain `#f9f9f9`, white
panels, onyx `#0a0e19`, quiet grey `#636363`, thin `#e1e1e1` borders, 4-8px
radii, compact proof panels, receipt grids, state rows, decision panels, and a
small isometric cube system signature only when useful. Use ocean `#0048ff`, moss `#1e3c2c`, and stop `#c41e3a` only as semantic state accents.

Avoid: glowing robots, circuit faces, blue AI gradients, generic brains, stock
photography, generic premium desk scenes, random decorative objects, fake
dashboards, unreadable file paths, client secrets, PHI, private prompts,
watermarks, vendor endorsement, and decorative AI atmosphere.
```

## Review Gate

- [ ] Text is legible at 50% size.
- [ ] The image answers a specific operational question.
- [ ] TASTE references are attached or explicitly marked not applicable.
- [ ] TASTE references were used as judgment inputs and were not copied.
- [ ] Workflow, governance, or agent-behavior visuals preserve a graph, SVG, Atlas map, or written source brief unless explicitly marked not applicable.
- [ ] The source brief shows owner, workflow artifact, automation, human judgment, stop boundary, and receipt surface.
- [ ] The claim is supported by visible proof or a real screenshot.
- [ ] No fake UI is presented as a screenshot.
- [ ] No secrets, private data, private prompts, client records, or tokens appear.
- [ ] The source prompt, source brief, model, date, output hash, owner, target surface, and refresh date are stored.
- [ ] Langfuse is not required unless a separate scored image-quality rubric exists.
