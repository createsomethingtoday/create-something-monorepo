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

The foundation is:

> Calm proof surfaces that show how AI work becomes mapped, governed,
> validated, and handed off.

Generated images are preferred when they clarify the system and meet the review
gate. They are not acceptable when they only create AI atmosphere.

For `.agency` marketing and article pages, the current visual precedent lives in
`packages/agency/static/images/articles/`. That family is not the flat LMS
lesson-diagram style. Use LMS-style deterministic diagrams only for learning
lessons and simple instructional figures. `.agency` article and internal
marketing visuals should read as high-fidelity operating artifacts: product-like
workspaces, connected panels, owners, policy gates, evidence rails, status rows,
subtle isometric system objects, and real screenshot evidence when a concrete
tool claim needs proof. SVGs and Atlas graphs are source briefs unless they meet
the same polish bar as the generated export.

## Tier Mapping

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
- light operational surfaces
- compact navigation, task rows, or proof panels
- visible receipts, metrics, logs, owners, or boundaries
- direct action states
- restrained motion and limited color

Reject references that rely on:

- decorative gradients
- generic AI abstraction
- simulated dashboards with no claim
- spectacle without evidence
- copied brand marks, source assets, fonts, layouts, or campaign language

## Visual Grammar

CREATE SOMETHING images should feel like governed operations, not generic AI
marketing.

| Element | Rule |
| --- | --- |
| Surface | Porcelain, white, or quiet near-black. Avoid noisy gradients and atmospheric backgrounds. |
| Composition | One proof object first, then supporting labels, gates, or receipts. |
| Structure | Maps, lanes, cards, state rows, policy gates, receipt panels, and handoff arrows. |
| Color | Canon clear tokens first: onyx, porcelain, cobalt, moss, and stop red. |
| Type | Short workflow nouns and state labels. Avoid category jargon. |
| Brand signature | Use the isometric cube as a small system mark, not as decoration. |
| Motion | Move only selection, state, progression, handoff, or proof reveal. |
| Evidence | Real screenshots are evidence. Generated images are explanatory artifacts. Do not mix the two without labeling. |

`.agency` article visuals add a stricter style distinction:

- Use 1536x1024 generated PNG exports for primary in-page article/marketing
  visuals.
- Use 1280x720 screenshots only when the image is evidence from a real tool,
  docs page, or review workspace.
- Keep SVG/Atlas/source diagrams as briefs, control artifacts, or editable
  sources; do not publish a flat deterministic SVG as the default `.agency`
  marketing visual.
- Prefer high-fidelity operating UI compositions: multi-panel workspaces,
  dotted connectors, compact state rows, owner panels, proof summaries, receipt
  rails, status counts, subtle iconography, and small cube signatures.
- Avoid oversized lesson-card layouts, sparse educational lane diagrams, and
  flat 1200x720 figures for `.agency` marketing pages unless the page is
  explicitly educational.

## Core Image Families

Use repeatable families so generated assets become a recognizable system.

| Family | Use When | Must Show |
| --- | --- | --- |
| Atlas story canvas | The visual explains workflow behavior, governance, case studies, offers, or agent behavior | Owner, artifact, automation route, human judgment point, stop boundary, receipt |
| System map hero | A page needs to show the whole operating path | Input, systems touched, policy gate, execution path, proof output |
| Database / Automation / Judgment diagram | The three-tier framework is the point | Resources, tools, prompts or policy, plus one concrete example |
| Policy gate chart | The argument is about approval, risk, or control | Allowed, ask, blocked, escalated, complete |
| Evidence map | A claim needs supporting proof | Claim, artifact cards, dates, owners, source labels |
| Database layer proof | A page needs to show the CREATE SOMETHING-owned operating database | Source records, Atlas bindings, action state, receipt, API/MCP boundary |
| Front-end database demo | A visitor needs to understand the product experience before booking | Filtered records, selected row, binding health, related map node, read-only proof receipt |
| Handoff receipt | The image closes a delivery or client update | Owner, state, validation, rollback, next action |
| Screenshot annotation | A real product/tool claim needs evidence | Real screenshot, date checked, numbered callouts, redactions |
| CTA visual | The image supports conversion | Specific next action and what artifact the user receives |

Default to a graph or Atlas-style brief when the image explains behavior, then
use an approved generated export for the public visual when the brief would look
too crude or low quality. For `.agency`, assume the generated export is the
publishable layer and the SVG/Atlas artifact is the source brief unless a human
explicitly approves the source artifact as production-quality.

For database-layer marketing, Canon is the source of the design and
implementation context. Use Clear components, Atlas graph/story primitives, and
the database-layer UI patterns before inventing a new visual system. The best
database images are either real dated screenshots with redactions or generated
exports briefed from real Atlas/database state: source rows, binding ledgers,
transfer readiness, workflow actions, receipts, and selected node details.

Do not make the database layer look like a generic SaaS table. It should read as
a fast operator surface: compact rows, direct record identity, visible status,
source bindings, map context, and proof receipts. A public page may use a
generated image to explain the experience, but a claim that a transfer or
workflow is complete needs screenshot evidence or a dated receipt.

## Generation Route

Use the route that matches the work:

| Need | Route |
| --- | --- |
| One production image from a completed prompt | OpenAI Image API generation with `gpt-image-2` when access is available |
| Editing a specific source image or export | OpenAI Image API edit, preserving source and prompt beside the export |
| Conversational image iteration or multi-turn refinement | Responses API with the image generation tool |
| Image based on an existing Atlas graph or SVG brief | Preserve the graph/brief as source context, then generate or edit the publishable export |
| Screenshot evidence | Capture the real surface, redact, annotate, and label as screenshot evidence |

Keep model, quality, size, prompt, source inputs, owner, and review status beside
the generated export. GPT image access may require OpenAI organization
verification; treat that as an environment prerequisite, not a reason to change
the language foundation. Google Gemini, Omni, and Vertex are not first-class
providers for this Canon pipeline because CREATE SOMETHING is intentionally
limiting the visual-generation stack around OpenAI plus repo-owned source
briefs.

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

Style: Canon Clear image language. Ona is the communication reference; CREATE
SOMETHING owns the artifact language. Use a calm proof surface with a plain
claim, compact evidence, governed action states, and a visible handoff. Prefer
porcelain `#f9f9f9`, white panels, onyx `#0a0e19`, quiet grey `#636363`, thin
`#e1e1e1` borders, 4-8px radii, and restrained semantic accents: ocean
`#0048ff`, moss `#1e3c2c`, and stop `#c41e3a`. Build the composition from
Clear-style receipts, state rows, decision panels, artifact cards, policy gates,
owners, and proof rails. Use the isometric cube as a small system signature only
when useful. The image should feel mapped, governed, validated, and handed off.

For `.agency` article and internal marketing visuals, push this into a polished
operating workspace rather than a teaching diagram: layered white panels,
small icons, status rows, owner panels, evidence tables, proof summaries,
timestamp-like receipts, dotted connectors, subtle shadows, and isometric
system objects. The visual should feel like a client-safe product proof surface,
not a flat explanatory slide.

Avoid: glowing robots, circuit faces, blue AI gradients, generic brains, stock
photography, generic premium desk scenes, random decorative objects, fake
dashboard evidence, unreadable labels, flat LMS lesson-card diagrams for
`.agency` marketing pages, client secrets, private prompts, PHI, vendor
endorsement, and watermarks.
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
