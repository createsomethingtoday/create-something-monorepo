# CREATE SOMETHING Image Language Foundation

This is the image-language foundation for CREATE SOMETHING generated,
designed, captured, and rendered visuals.

The purpose is not to make prettier AI images. The purpose is to make delegated
work visible: maps, gates, owners, receipts, validation, and handoff state.

## Decision

Use TASTE as the judgment layer for image generation, and use approved OpenAI
generated exports as the first-class publishable visual layer when a visual will
be used externally.

TASTE supplies the reference corpus, comparison standard, and rejection filter.
Image generation supplies controlled variants and production assets. Atlas,
SVGs, and Canon graph artifacts supply briefs, structure, and evidence state;
they are not automatically the public-quality visual.

The foundation has two coordinated modes:

> Campaign surfaces show intelligent work under pressure through original human
> motion, material study, decisive typography, and technical annotation. Product
> surfaces show how that work becomes mapped, governed, validated, and handed off.

Generated images are preferred when they clarify the system and meet the review
gate. They are not acceptable when they only create AI atmosphere.

## Tier Mapping

<!-- prettier-ignore -->
| Tier | Role in Image Language | Repo Surface |
| --- | --- | --- |
| Database | TASTE references, Are.na channels, Atlas graph artifacts, prompts, metadata, screenshots, source files | `/taste`, `/llm.txt`, `packages/agency/content/assets/**`, article metadata |
| Automation | GPT Image generation or editing, Atlas story-canvas briefs, screenshot annotation, asset checks | Image API, Responses API image tool, Atlas renderers, `scripts/marketing-image-assets-check.mjs` |
| Judgment | Human curation, TASTE scoring, brand fit review, evidence review, publish approval | TASTE approvals, Canon image guideline, article review gate |

## What Images Must Prove

Every CREATE SOMETHING image should answer at least one question:

1. What workflow, system, object, or decision is being mapped?
2. What can run, what needs review, and what must stop?
3. What proof supports the claim?
4. Who owns the next action?
5. What artifact carries the state forward?

If none of those answers are visible, do not use the image.

## TASTE Intake

Before generating production images, assemble a small TASTE packet. A packet is
not a mood board. It is a judgment input for the prompt and review gate.

Include:

- 3 to 7 approved references from the relevant TASTE channel or `/taste`.
- One sentence for why each reference belongs.
- One sentence for what must not be copied.
- The target surface: article, social, deck, sales, delivery, client-update, or product UI.
- The proof requirement: map, receipt, policy gate, screenshot, trace, owner, status, or validation result.

Prefer references that show:

- clear hierarchy and literal offer language
- human or system motion under visible load
- kinetic crops, temporal sequence, and decisive scale contrast
- material or prototype studies with measurement and annotation
- light operational surfaces
- compact navigation, task rows, or proof panels
- visible receipts, metrics, logs, owners, or boundaries
- direct action states
- restrained motion and limited color

Reject references that rely on:

- decorative gradients
- generic AI abstraction
- simulated dashboards with no claim
- spectacle without evidence or a field-to-proof translation
- copied brand marks, source assets, fonts, layouts, or campaign language

## Visual Grammar

CREATE SOMETHING images should feel like governed operations, not generic AI
marketing.

<!-- prettier-ignore -->
| Element | Rule |
| --- | --- |
| Surface | Campaign: optic white or near-black with field/material imagery. Product: porcelain, white, or quiet near-black proof surfaces. |
| Composition | Campaign: one kinetic field or material study integrated with proof. Product: one proof object first, then labels, gates, or receipts. |
| Structure | Maps, lanes, cards, state rows, policy gates, receipt panels, and handoff arrows. |
| Color | Canon clear tokens first: onyx, porcelain, cobalt, moss, and stop red. |
| Type | Short workflow nouns and state labels. Avoid category jargon. |
| Brand signature | Use the isometric cube as a small system mark, not as decoration. |
| Motion | Campaign motion may express load, sequence, intervention, and recovery. Product motion moves selection, state, progression, handoff, or proof reveal. |
| Evidence | Real screenshots are evidence. Generated images are explanatory artifacts. Do not mix the two without labeling. |

## Core Image Families

Use repeatable families so generated assets become a recognizable system.

<!-- prettier-ignore -->
| Family | Use When | Must Show |
| --- | --- | --- |
| Performance field study | Homepage, services, editorial, case study, or social needs visceral evidence of work under pressure | Original human or system motion, temporal cue, technical annotation, and a workflow meaning |
| Material / prototype study | A service or article needs to make an agent, MCP, policy, or workflow feel engineered | Original material or abstract system object, version/measurement cues, and a named operating claim |
| Editorial hybrid | A high-intent article needs campaign energy without losing proof | Original field/material image plus map, trace, receipt, policy, owner, or validation result |
| Atlas story canvas | The visual explains workflow behavior, governance, case studies, offers, or agent behavior | Owner, artifact, automation route, human judgment point, stop boundary, receipt |
| System map hero | A page needs to show the whole operating path | Input, systems touched, policy gate, execution path, proof output |
| Database / Automation / Judgment diagram | The three-tier framework is the point | Resources, tools, prompts or policy, plus one concrete example |
| Policy gate chart | The argument is about approval, risk, or control | Allowed, ask, blocked, escalated, complete |
| Evidence map | A claim needs supporting proof | Claim, artifact cards, dates, owners, source labels |
| Handoff receipt | The image closes a delivery or client update | Owner, state, validation, rollback, next action |
| Screenshot annotation | A real product/tool claim needs evidence | Real screenshot, date checked, numbered callouts, redactions |
| CTA visual | The image supports conversion | Specific next action and what artifact the user receives |

Default to a graph or Atlas-style brief when the image explains behavior, then
use an approved generated export for the public visual when the brief would look
too crude or low quality. Publish raw SVG or Atlas renders only when they meet
the same quality bar as the generated export.

## Generation Route

Use the route that matches the work:

<!-- prettier-ignore -->
| Need | Route |
| --- | --- |
| One production image from a completed prompt | OpenAI Image API generation with `gpt-image-2` when access is available |
| Editing a specific source image or export | OpenAI Image API edit, preserving source and prompt beside the export |
| Conversational image iteration or multi-turn refinement | Responses API with the image generation tool |
| Image based on an existing Atlas graph or SVG brief | Preserve the graph/brief as source context, then generate or edit the publishable export |
| Screenshot evidence | Capture the real surface, redact, annotate, and label as screenshot evidence |

Use `pnpm marketing:image:screenshot -- --help` for public screenshot evidence.
The command preserves the screenshot outside declared redaction regions, creates
a 1080×1350 LinkedIn composition with authored text, and writes a provenance
manifest with source and output hashes. It fails closed unless at least one
redaction is declared or the operator explicitly passes `--allow-unredacted`
after reviewing the source.

Keep model, quality, size, prompt, source inputs, owner, and review status beside
the generated export. GPT image access may require OpenAI organization
verification; treat that as an environment prerequisite, not a reason to change
the language foundation. Google Gemini, Omni, and Vertex are not first-class
providers for this Canon pipeline because CREATE SOMETHING is intentionally
limiting the visual-generation stack around OpenAI plus repo-owned source
briefs.

## SVG Education Precision Route

Use the repo-owned `svg-education-precision` skill when labels, topology, data,
policy states, or proof relationships must remain exact. The skill compiles a
structured JSON source into SVG and fails closed on canvas overflow, text-fit
risk, unintended element collisions, malformed geometry, and undeclared
relationships.

```bash
pnpm agent:svg-education validate path/to/spec.json
pnpm agent:svg-education check path/to/spec.json path/to/review.svg
```

The precision route does not reverse the Image2 decision above:

- Ship the SVG directly for instructional, accessible, editable, responsive,
  or interactive surfaces only after browser-size and human visual review.
- Use the validated SVG as Image2 source context when public marketing polish,
  atmosphere, or expressive composition matters more.
- Keep the structured spec authoritative in both cases; neither the SVG renderer
  nor Image2 becomes the source of workflow truth.

Deterministic markup is supporting evidence, not a publication gate by itself.
The target surface must still be rendered and inspected at its native and
smallest supported display sizes.

## Prompt Stack

Prompts should be structured in this order:

1. Image family and target surface.
2. Operational purpose.
3. Audience.
4. Proof requirement.
5. Objects, states, owners, gates, and receipts to show.
6. TASTE packet summary.
7. Canon style constraints.
8. Avoid list.
9. Output size and format.

Template:

```text
Create a CREATE SOMETHING <image family> for <surface>.

Purpose: <what the image must prove>.
Audience: <operator, buyer, builder, reviewer, client>.
Proof requirement: <map, receipt, policy gate, screenshot, trace, owner, status, validation result>.

Show: <workflow objects, states, proof artifacts, owners, gates, receipts>.

TASTE packet: <3 to 7 approved references by title/source and the specific
communication pattern to borrow>. Use the references for judgment only. Do not
copy source assets, brand marks, fonts, layouts, campaign language, or images.

Style: CREATE SOMETHING Performance Lab image language on its Readable Control
substrate. The
visual should make delegated work feel trained, tested, governed, and proven
before it runs. CREATE SOMETHING owns the artifact language. Choose the surface
mode deliberately. Campaign images may use original human motion, temporal
composites, hard crops, material texture, asymmetric editorial layout, and
technical annotation. Product images use a calm proof surface with a plain claim,
compact evidence, governed action states, readiness cues, and a visible handoff. Prefer
porcelain `#f9f9f9`, white panels, onyx `#0a0e19`, quiet grey `#636363`, thin
`#e1e1e1` borders, 4-8px radii, and restrained semantic accents: ocean
`#0048ff`, moss `#1e3c2c`, stop `#c41e3a`, and performance pressure only when
it marks readiness, stress, or a decision point. Build the composition from
Clear-style receipts, state rows, decision panels, artifact cards, policy gates,
owners, tests, and proof rails. Use the isometric cube as a small system
signature only when useful. The image should feel mapped, tested, governed,
validated, and handed off.
For `.agency` article and internal marketing visuals, push this into a polished
operating workspace rather than a teaching diagram: layered white panels,
small icons, status rows, owner panels, evidence tables, proof summaries,
timestamp-like receipts, dotted connectors, subtle shadows, and isometric
system objects. The visual should feel like a client-safe product proof surface,
not a flat explanatory slide.

Avoid: glowing robots, circuit faces, blue AI gradients, generic brains, stock
photography, celebrity or athlete likenesses, sportswear marks or silhouettes,
generic premium desk scenes, random decorative objects, fake
dashboard evidence, unreadable labels, client secrets, private prompts, PHI,
vendor endorsement, and watermarks.
```

## Review Gate

Before publishing:

- The image answers a specific operational question.
- TASTE references were used as judgment input, not copied source material.
- The visual family is named in the metadata.
- Workflow and governance visuals preserve a graph, SVG, Atlas, or written brief
  as source context before generating the public export.
- Text is legible at 50% size.
- Generated UI is not presented as real screenshot evidence.
- Screenshots are real, dated, redacted, and claim-specific.
- The proof requirement is visible or explicitly labeled as conceptual.
- Source prompt, model, size, source brief, output hash, owner, target surface,
  and refresh date are stored.
- The result feels like CREATE SOMETHING: mapped, governed, validated, handed off.

## Boundary

TASTE can improve the standard, but it does not replace human approval.

OpenAI image generation can produce the publishable visual layer, but it does
not create evidence.

Atlas, SVGs, and deterministic diagrams can brief the image, but they should not
be published merely because they are deterministic. The source of truth remains
the workflow artifact, graph, policy, screenshot, receipt, metadata record, and
approved generated export.
