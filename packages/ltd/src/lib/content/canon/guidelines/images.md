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

Use `gpt-image-2` for production image generation when access is available. Keep
prompts structured and repeatable:

```text
Model: gpt-image-2
Quality: high
Size: <target size>

Create a CREATE SOMETHING <image family> for <surface>.
Purpose: <what the image must prove>.
Audience: <operator, buyer, builder, reviewer, client>.
Show: <workflow objects, states, proof artifacts, owners, gates>.
Style: Ona.com communication foundation translated into CREATE SOMETHING artifacts:
calm hierarchy, porcelain surfaces, compact proof panels, governed execution,
crisp labels, restrained cobalt/moss/stop accents, isometric cube signature.
Avoid: glowing robots, circuit faces, blue AI gradients, generic brains,
fake dashboards, stock photography, unreadable file paths, private data,
client secrets, vendor endorsement, watermarks.
```

The prompt should name the artifact family and proof requirement before style. Style
cannot rescue a vague visual brief.

For article, social, deck, sales, or client-update images, start from
`packages/agency/content/templates/marketing/image-prompt.md` and store the
completed prompt beside the generated export.

Use the Image API for a single completed generation or edit. Use the Responses
API image generation tool for conversational, multi-turn image refinement.

## Review gate

Before publishing or reusing an image:

- Text is legible at 50% size.
- The image still works without animation.
- The claim is supported by visible proof or a real screenshot.
- No fake UI is presented as a screenshot.
- No secrets, private data, private prompts, client records, or tokens appear.
- The asset has source prompt, model, date, owner, target surface, and refresh date.
- The result feels like governed operations, not generic AI atmosphere.

Use deterministic repo checks as the required gate for this workflow. Braintrust
is not required to generate, store, or approve image assets. Add Braintrust later
only if CREATE SOMETHING needs a scored rubric across many generated images,
prompt variants, or approval outcomes.

## File metadata

Every generated image should keep a source prompt beside the export:

```text
<asset-slug>--prompt--vYYYYMMDD.txt
<asset-slug>--source--vYYYYMMDD.svg
<asset-slug>--export--1200x630--vYYYYMMDD.png
```

Include the model, snapshot if known, quality, size, source inputs, and review status
in the prompt file. This makes the visual system auditable and repeatable.
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
