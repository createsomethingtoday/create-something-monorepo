---
category: "Canon"
section: "Guidelines"
title: "Images"
description: "CREATE SOMETHING image guidelines for marketing, articles, social previews, decks, and client proof artifacts."
lead: "Images should make the operating system visible. Use Ona.com as the communication foundation, then translate that clarity into CREATE SOMETHING maps, receipts, gates, and proof."
publishedAt: "2026-06-22"
published: true
---

## Decision

Use Ona.com as the design and communication foundation for CREATE SOMETHING images.
The reference is communication quality, not identity: calm hierarchy, plain claims,
compact proof, governed execution, visible customer evidence, and restrained action
states.

CREATE SOMETHING owns the implementation language. Our images should show how AI
work gets mapped, integrated, governed, validated, shipped, and handed off.
For external education, marketing, social, deck, and client-proof surfaces, the
approved OpenAI generated export is the first-class visual when it communicates
better than a raw SVG or Atlas render.

Property context matters. The `.learn`/LMS Canon lesson figures are an
educational format. They should not become the default `.agency` marketing or
article style. `.agency` uses the generated operating-artifact family visible in
`packages/agency/static/images/articles/`: polished workspace-like proof
surfaces with panels, owners, status rows, proof rails, receipt summaries,
subtle isometric objects, and screenshot evidence only when a real tool claim is
being proven.

Use `docs/IMAGE_LANGUAGE_FOUNDATION.md` when a generated, designed, captured, or
rendered image needs TASTE-backed judgment context. TASTE references are inputs
for review and prompting; they are not source assets to copy.

## What images should prove

Every generated or designed image must answer at least one operational question:

1. What object, workflow, or system is being mapped?
2. What can run, needs review, or must stop?
3. What policy, contract, receipt, trace, eval, or screenshot proves the claim?
4. Who owns the next step?

If the image cannot answer one of those questions, it is decoration. Do not use it.

## Visual grammar

Use this foundation for marketing materials, article visuals, social cards, pitch
decks, and client updates:

| Layer | Rule |
|-------|------|
| **Canvas** | Prefer porcelain, white, or quiet near-black surfaces. Avoid noisy gradients. |
| **Hierarchy** | One plain claim, then proof beside or below it. |
| **Structure** | Use maps, lanes, cards, state rows, gates, receipts, and arrows. |
| **Brand mark** | Use the isometric cube as the persistent system signature. |
| **Color** | Use Canon clear tokens first: onyx, porcelain, cobalt, moss, and stop red. |
| **Type** | Use direct labels. Prefer workflow nouns over category language. |
| **Motion** | For video or animated exports, move only state, selection, progression, or handoff. |
| **Proof** | Make validation visible through receipts, tests, links, dates, owners, and status. |

Raw SVGs, Atlas renders, and graph exports are useful control artifacts. Publish
them only when they meet the same quality bar as a generated export; otherwise
use them as source briefs for OpenAI generation or edits.

For `.agency` articles and internal marketing pages, treat raw SVGs and flat
deterministic diagrams as source briefs by default. The public visual should
usually be a 1536x1024 generated PNG export that reads like a client-safe
operating surface, not a lesson slide. The 1280x720 format is reserved for real
screenshot evidence unless a route has a specific crop need.

## Image families

Create reusable image families instead of one-off illustrations:

- **System map hero**: the full operating path from input to governed outcome.
- **Database / Automation / Judgment diagram**: the three-tier framework as lanes or columns.
- **Policy gate chart**: allowed, ask, blocked, escalated, complete.
- **Evidence map**: artifact cards connected to the claim they prove.
- **Handoff receipt**: owner, state, validation, rollback, and next action.
- **Screenshot annotation**: real product evidence with restrained callouts.
- **CTA visual**: the specific next action, not generic AI promise.

## GPT Image 2 prompt contract

Use OpenAI `gpt-image-2` for production image generation when access is
available. Keep prompts structured and repeatable:

```text
Model: gpt-image-2
Quality: high
Size: <target size>

Create a CREATE SOMETHING <image family> for <surface>.
Purpose: <what the image must prove>.
Audience: <operator, buyer, builder, reviewer, client>.
Show: <workflow objects, states, proof artifacts, owners, gates>.
Style: Canon Clear image language. Ona.com is the communication foundation:
plain claim, calm hierarchy, compact proof, governed execution, visible
evidence, and restrained action states. Translate that into CREATE SOMETHING
artifacts: porcelain `#f9f9f9`, white panels, onyx `#0a0e19`, quiet grey
`#636363`, thin `#e1e1e1` borders, 4-8px radii, compact receipts, state rows,
decision panels, artifact cards, policy gates, owners, proof rails, and a small
isometric cube signature only when useful. Use ocean `#0048ff`, moss `#1e3c2c`,
and stop `#c41e3a` only as semantic state accents.
Avoid: glowing robots, circuit faces, blue AI gradients, generic brains,
fake dashboards, stock photography, generic premium desk scenes, unreadable file
paths, flat LMS lesson diagrams for `.agency` marketing pages, private data,
client secrets, vendor endorsement, watermarks.
```

The prompt should name the artifact family and proof requirement before style.
Style cannot rescue a vague visual brief.

For article, social, deck, sales, or client-update images, start from
`packages/agency/content/templates/marketing/image-prompt.md` and store the
completed prompt beside the generated export.

Use the Image API for a single completed generation or edit. Use the Responses
API image generation tool for conversational, multi-turn image refinement.
Prefer editing from an approved export for revisions instead of regenerating
from scratch when layout continuity matters.

## Review gate

Before publishing or reusing an image:

- Text is legible at 50% size.
- The image still works without animation.
- The claim is supported by visible proof or a real screenshot.
- No fake UI is presented as a screenshot.
- No secrets, private data, private prompts, client records, or tokens appear.
- The asset has source prompt, source brief, model, date, output hash, owner,
  target surface, and refresh date.
- The result feels like governed operations, not generic AI atmosphere.

Use deterministic repo checks as the required gate for this workflow. Langfuse
is not required to generate, store, or approve image assets. Add Langfuse later
only if CREATE SOMETHING needs a scored rubric across many generated images,
prompt variants, or approval outcomes.

## File metadata

Every generated image should keep a source prompt beside the export:

```text
<asset-slug>--prompt--vYYYYMMDD.txt
<asset-slug>--brief--vYYYYMMDD.md
<asset-slug>--export--1200x630--vYYYYMMDD.png
```

Include the model, snapshot if known, quality, size, source inputs, output hash,
and review status in the prompt file. This makes the visual system auditable and
repeatable.
For article image sets, copy
`packages/agency/content/templates/marketing/image-metadata.md` into the asset
folder and fill it before publish.

Run the metadata/template check before publishing reusable article assets:

```bash
node scripts/marketing-image-assets-check.mjs
```

## Boundary

Do not copy Ona identity, campaign language, page layouts, or category framing.
Use Ona.com as the standard for how supervised autonomy should communicate. Use
CREATE SOMETHING to show how that autonomy gets connected to real systems, policy,
evidence, and delivery.

Do not route Canon image generation through Google Gemini, Omni, or Vertex. This
is an intentional stack-limit decision, not a temporary account-availability
fallback. If OpenAI image access is blocked, keep the prompt and source brief
ready rather than silently downgrading to another provider.
