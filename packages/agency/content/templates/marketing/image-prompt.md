# CREATE SOMETHING Image Prompt

> Content asset ID:
> Image asset slug:
> Surface: article | social | deck | delivery | sales | client-update
> Image family: atlas-story-canvas | system-map-hero | db-automation-judgment | policy-gate-chart | evidence-map | handoff-receipt | screenshot-annotation | cta-visual
> Canvas renderer: static-story | react-flow | sigma | cosmograph | not applicable
> Atlas graph source: existing starter map | new graph artifact | not applicable
> Owner:
> Review status: draft | approved | published | retired
> Target export:
> Last updated:

## Model

```text
Model: gpt-image-2
Quality: high
Size:
Source manifest or brief:
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
```

## Prompt

```text
Create a CREATE SOMETHING <image family> for <surface>.

Purpose: <what the image must prove>.
Audience: <operator, buyer, builder, reviewer, client>.
Show: <workflow objects, states, proof artifacts, owners, gates>.

If the image explains workflow behavior, governance, an offer, a case study, a
tool comparison, or agent behavior, use an Atlas-style canvas with nodes and
mapped relationships before any decorative composition. Preserve the graph as the source of truth: owner, workflow or data artifact, automation route, AI-assisted task when present, human judgment point, stop condition, and receipt surface. Use static story canvas for marketing and article visuals, React Flow only when the surface needs editing or intake, and Sigma/Cosmograph only for large read-only network exploration.

Style: Use Ona.com as the design and communication foundation: calm hierarchy,
plain claims, compact proof, governed execution, visible evidence, and restrained
action states. Translate that foundation into CREATE SOMETHING artifact language:
system maps, MCP boundaries, policy gates, receipts, validation proof, owners,
and handoff state. Prefer porcelain or quiet near-black surfaces, crisp labels,
restrained cobalt/moss/stop accents, compact proof panels, and the isometric cube
as a persistent system signature.

Avoid: glowing robots, circuit faces, blue AI gradients, generic brains, stock
photography, fake dashboards, unreadable file paths, client secrets, PHI, private
prompts, watermarks, vendor endorsement, and decorative AI atmosphere.
```

## Review Gate

- [ ] Text is legible at 50% size.
- [ ] The image answers a specific operational question.
- [ ] Workflow, governance, or agent-behavior visuals use an Atlas canvas unless explicitly marked not applicable.
- [ ] The canvas shows owner, workflow artifact, automation, human judgment, stop boundary, and receipt surface.
- [ ] The claim is supported by visible proof or a real screenshot.
- [ ] No fake UI is presented as a screenshot.
- [ ] No secrets, private data, private prompts, client records, or tokens appear.
- [ ] The source prompt, model, date, owner, target surface, and refresh date are stored.
- [ ] Braintrust is not required unless a separate scored image-quality rubric exists.
