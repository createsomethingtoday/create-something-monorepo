# Canon: measured and whimsical

Canon makes the beginning welcoming and the work understandable. Its public
foundation remains black. Original felt characters, paper objects and warm
workshop materials supply the whimsy; the interface supplies clear decisions.

## Foundation

| Element | Current direction |
| --- | --- |
| Website canvas | True black, `#000000` |
| Raised neutral surface | `#111111` in the default dark scope |
| Primary foreground | `#f2f2f2` in the default dark scope |
| Light work surface | Explicit `data-theme="light"`, with rebound semantic roles |
| Type | Locally loaded Geist for headings and prose; mono for actual records, code and measured chapter labels |
| Geometry | Soft-square controls; square artwork frames and fine rules |
| Materials | Solid interface surfaces; felt, paper, pale wood and matte ceramic inside original artwork |
| State | Named success, error, review and waiting roles with text and an appropriate next action |

Use existing canonical imports, components and semantic tokens. A special
`data-canon-next` attribute is not required by the shared foundation. Keep
specialist operator palettes explicitly scoped. Do not use a warm illustration's
paper color as the website canvas or use a status color merely for decoration.

Geist remains the installed house typeface. Alignment with OpenAI's clear,
approachable design language is useful context for CREATE SOMETHING's Select
Partner relationship; it does not turn Geist into OpenAI Sans or authorize
third-party font assets. ChatGPT-embedded experiences follow their host's
typography contract. Canon retains its own character, content and identity.

## Scene composition

Heroes and CTA sections use CSS background images. Their headings, supporting
copy, actions and essential information remain HTML. Inline images belong in
subsequent editorial sections. This rule concerns sections, not individual
buttons.

Select a scene around the intended copy, rather than covering a face or task
with an opaque card. A desktop dark wall can hold a short proposition while
the character and paper steps remain visible. Mobile often needs a separately
composed portrait scene. Cropping and background-image implementation alone do
not establish a good composition; inspect the actual output at intermediate
widths as well as phone and desktop endpoints.

Dense evidence cards, workflow states and authority records need their own
readable region outside the scene's subject. Artwork can accompany those
records; it cannot serve as their proof. Preserve the full task object when the
illustration is intended to explain it. Use a clean environment plate when a
character would compete with the decision.

Preload the actual above-fold hero source with matching responsive conditions.
Do not preload every CTA. Give decorative scenes no redundant accessible name;
provide a concise description when the image contributes meaning. Missing
imagery must leave readable copy and usable actions on the owning palette.
See [the shared background contract](BACKGROUND-COMPOSITION-MIGRATION.md).

## Character

Canon's current direction is a squat charcoal felt companion with a soft square
head, short cream-tipped antenna, original woven digital expression, oval eyes
and a useful notebook. Keep the body compact and gestures purposeful. The
computer reference supplies a quiet display structure, not shiny glass, metal,
glow or a copied product shell.

Circular eyes were explicitly rejected. The flat face study was also rejected;
it is historical evidence, not a public mark. A nose is not required. The current
r42 cuboid head study uses filled oval eyes and dimensional material at 96px, with
independent acceptance at that size on black and paper. Smaller interface placements use
plain Canon text; 64px comparisons are diagnostic and unsupported.

The user-approved r41 body and r45 gesture sheet have opaque black backdrops.
The compact r42 still is static. Six captioned body-pose studies are available in
the character guide, separately from the live sample text. The head does not
blink, detect work or change expression
when state copy changes. A future expression asset must remain subordinate to
truthful words and explicit controls. Character and scene studies never prove
that a workflow ran, a reviewer approved it or an external action succeeded.
See [current character status](src/lib/character/README.md).

## Voice and interaction

Use a concrete invitation: “Bring a rough idea.” Name what the system can do
next and what the person decides. State scope before work, retain the draft
through recoverable failure, and make review and editing easy. Avoid invented
urgency, pleading expressions, unexplained status colors and celebratory claims
without evidence.

Keep controls comfortably operable, with visible focus and readable errors.
Use motion to clarify a real transition or selection. Avoid idle bobbing and
perpetual busy theatre. Reduced motion and no-JavaScript fallbacks retain the
meaning and available actions. A chapter ruler is useful navigation with real
anchors and names, not an ornamental progress claim.

## Validation and adoption

Review 320, 390, 768, 1024, 1025 and 1440px, both owning palettes where relevant,
keyboard/focus, reduced motion, missing images and no-JavaScript behavior. Use
actual component fixtures and real consumer routes; distinguish local data from
production state. Test scope, field validation, approval guards, recovery and
focus restoration when those behaviors are affected.

Keep three gates separate: functional correctness, perceptual/product quality
and release readiness. A passing package build does not accept the artwork.
An attractive screenshot does not verify a workflow. Approved scene originals
do not approve derivative compositions, the final character or publication.

This redesign remains local in the preserved worktree. The approved four-scene
environment pack is retained byte-for-byte; new portrait compositions and
character refinements remain studies. The current Cook target, independent
review, user art acceptance and production optimization remain separate from
the completed implementation checkpoints. No deployment is implied.
