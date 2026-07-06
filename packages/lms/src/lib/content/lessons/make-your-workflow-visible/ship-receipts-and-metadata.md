---
title: Ship Receipts and Metadata
description: Package the image with the claim, validation evidence, owner, refresh date, and next action.
duration: 15 min
---

A learning image is not finished when it looks good. It is finished when someone can inspect the claim, source, owner, and next action.

Canon images should ship with enough context to be reused without guessing:

- What claim the image makes.
- What evidence supports the claim.
- Who owns the workflow.
- When the asset should be refreshed.
- What the next action is.

<figure class="learning-figure">
  <img src="/learning/canon/handoff-receipt.png" alt="Receipt-style artifact listing claim, validation, owner, and next action." />
  <figcaption>A receipt makes the image reusable as an operating artifact.</figcaption>
</figure>

## What to store

For generated learning images, keep the source brief in the repo and make the lesson cite the exact workflow claim. Store the prompt and metadata beside the export.

Use this minimum metadata:

```text
Asset:
Surface:
Purpose:
Audience:
Claim:
Proof:
Owner:
Created:
Refresh date:
Review status:
```

## Operator exercise

Take one image from this path and write its receipt. If the proof line is weak, revise the image or the workflow. Do not publish a polished visual that does not prove the operating claim.

The final habit is simple: image -> proof -> owner -> next action. That is how Canon turns visuals into usable workflow infrastructure.
