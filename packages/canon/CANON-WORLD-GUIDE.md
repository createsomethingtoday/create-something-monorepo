# Canon world guide — local integration

This document preserves chronological implementation checkpoints. Start with
[the current system guide](APPROACHABLE-SYSTEM.md), [local review status](LOCAL-REVIEW.md)
and [current character guidance](src/lib/character/README.md). Earlier light
defaults, inline hero arrangements and frozen r09 character descriptions below
are historical. The current website foundation is black; heroes and CTA
sections use backgrounds. Approval of the four original scenes remains
separate from derivative compositions, character art and publishing.

`/next/world` applies the approved small-workshop environment to a local HTML hero and an explanatory design guide. Database: exact approved scene assets. Judgment: material, composition and evidence boundaries. No new Automation primitive or public export.

## Acceptance and approval

User approval in reference thread `7fc0551a-3d95-41d1-8745-1fe90a95ce9b` on November 13 covers the four selected environment scenes and task-connected whimsy in every scene. It does not cover final character approval, final campaign composition or publication. Frozen r09 remains provisional: squat charcoal felt body, short legs, softly squared head, woven digital face, oval eyes, cream-tipped antenna and notebook pocket. No regeneration, image edit or source-pack mutation was performed.

Acceptance: show all four exact approved scenes; preserve complete frames, faces, hands and task objects; readable HTML hero copy outside the artwork; canonical Button and Card, local Geist via canon.css, neutral light/dark role defaults; appropriate alt text, concept captions, crop and material guidance; working Canon navigation; actual responsive and no-JS reading checks. Independent final re-test belongs to the parent.

## Source and integrity

Source relative to the primary repository: `output/canon-environment/2026-11-13`. Read-only primary checkout: `/Users/createsomething/Code/create-something-monorepo`. Read `BRIEF.md`, `manifest.json` and `reviews/sol-final-review.md` and directly viewed all four selected originals before implementation.

Destination: `packages/canon/static/canon-next/world/`. Byte lengths and SHA-256 values were verified against the source manifest after copying. Machine-readable evidence: `evidence/world/asset-integrity.json`.

| Selected source | Dimensions | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `scenes/01-welcome-bench.png` | 1672 × 941 | 2488325 | `ba4507491e1269ef5257d2d1747bd63bde214d4bd585523f074335e1f2dcc8a3` |
| `scenes/02-connection-loom-whimsy-v2.png` | 1672 × 941 | 2170712 | `ed953bc712260cfe6d61b79d028e62b250b3544dada4f674ea9feaf48488ad55` |
| `scenes/03-review-nook-whimsy-v2.png` | 1122 × 1402 | 2355303 | `9b96dc4574a38dc6c46f2157cd68c2ce28d263732eed465f4dca5366adfc812d` |
| `scenes/04-welcome-clean-plate.png` | 1671 × 941 | 2219697 | `d8737e0fc5f6121a9c92451de111b5a6468986a4a3bdc7a1e9885bdf8f5d9394` |

## Composition contract

Pale ash joinery, charcoal felt, cotton-rag paper, undyed linen and matte porcelain remain distinct. Soft directional window light and a small practical lamp establish warmth. Contact shadows and oversized human tools establish miniature scale. No global color tokens are rethemed; wood/flax stays inside the artwork.

Welcome and its clean plate retain the paper staircase. Loom v2 retains two rising ribbon arches, both trays, loom and local working hands. Nook v2 retains the raised blank corner, lamp and full gesture. Each surprise explains a task. These are original conceptual scenes, never software execution proof.

Every image uses intrinsic width/height and `height:auto`; no cover crop or baked text. HTML text sits alongside the scene above 1024px and above it at narrower sizes. No overlay was needed. Future exact overlays require contrast and size verification inside the brief's conservative quiet areas: wide scenes approximately x5–39%, y10–48%; Nook x14–62%, y10–27%, avoiding lamp/antenna. Narrow landscape crops lose story information. Clean plate is one pixel narrower and not registered for compositing.

## Measured local checks

Existing dev server: `http://localhost:5191/next/world`. No new server, package build, check or sync run by this integration owner. Focused Svelte compiler parse passed. Initial ESM named-import invocation failed because the compiler is CommonJS; corrected require-based parse passed.

Full-page captures at 320, 390, 768, 1024, 1025 and 1440 CSS pixels were directly viewed. `evidence/world/responsive.json` records measured widths and all image natural/rendered dimensions. No horizontal document overflow; the browser reserves 10px for its scrollbar. Complete frames retain face, hands, steps, arches and lifted sheet corner. Mobile typography remains outside art; mobile scenes necessarily have smaller details, with adjacent explanatory text preserving meaning.

Settled dark captures at 390 and 1440 were viewed after canonical transitions finished. Card and Button use the owning dark roles. Keyboard Tab reaches the visible skip-link focus ring; Enter reaches `#main`; keyboard Enter toggles appearance. JavaScript-disabled reading exposes the full heading, four images and all footer links; browser-native lazy loading requires scrolling below the hero. Below-hero scenes use native lazy loading and async decode. Navigation destinations were actually opened and returned the expected Canon page titles. See `behavior.json` and PNG evidence. No animation or motion dependency was added.

## Gates and limits

- Functional correctness: passed for this local guide — Svelte parse, exact asset inventory, responsive DOM measurements, keyboard, theme, navigation and server-rendered reading. No runtime workflow is represented or tested.
- Perceptual/product quality: passed for local integration owner review — actual six-width full pages and settled dark output viewed against exact approved scenes. Parent's independent Sol re-test remains required. No additional human campaign acceptance is claimed.
- Release readiness: passed for local additive review handoff only. Publication is unauthorized and untested. The four PNG originals total 9,234,037 bytes; they are local review material. Production optimization, exact placement exports, performance budgets, campaign copy approval and deployment remain pending.

Rollback: remove only `src/routes/next/world/+page.svelte`, `static/canon-next/world/`, this guide and `evidence/world/`. Parent-owned `/next` navigation integration is separate. No old static image directories, source pack, shared primitive, export or global token was changed. Worktree disposition: preserved at the parent's isolated checkout `t3-a01044d6-2f560e0ec9e58190` until parent integration and final review.

## Measured black foundation revision

Latest user direction: retain the website’s black foundation/background with whimsy. This supersedes the earlier light-default application. `/next/world` now defaults to explicit dark Canon roles with a route-local black canvas; light remains an optional preview. Global tokens are untouched. Scene PNGs remain unchanged. Generic uppercase eyebrows and round image corners were removed; functional numbered ruler labels, mono captions, hairlines and square frames provide the measured structure.

Read the protected Agency `AgencyChapterDial.svelte` and `measured-foundation.css` as reference evidence, without edits or wholesale copying. New local `src/lib/wayfinding/ChapterRuler.svelte` takes chapter data, accessible label, preview enablement and reading offset. Native anchors work without JS; mounted reading tracks actual section geometry. Pointer/focus preview is separate from `aria-current`; leaving restores the active reading. Svelte-generated instance IDs avoid duplicate description IDs; listener, observer and requestAnimationFrame cleanup occurs on unmount. Reduced motion removes authored needle transitions. No Agency playback dependency or public export was added.

New implementation validation: Svelte server compilation of route and component passes with no warnings. `measured-responsive.json` records all six widths, exact `rgb(0, 0, 0)` default canvas, no horizontal overflow and measured ruler target heights of 84–88px. Actual keyboard Enter navigated to `#materials` and active `aria-current` followed it. Reduced-motion computed transition was 0.00001s because Canon’s global reduced-motion floor wins; no perceptible animation. All six measured full-page captures were directly viewed, plus the settled optional light preview. A no-JS native anchor to Scenes was exercised and the black default guide captured at 390px. Earlier captures above remain historical evidence; `measured-*` files describe the current revision. Regression-before-fix was not applicable: this adds new navigation and changes visual direction rather than repairing existing behavioral logic.

Local functional and perceptual gates pass for owner review; parent independent Sol re-test and package validation remain separate. Release readiness remains local handoff only, with production optimization/publication pending. Rollback additionally removes only `src/lib/wayfinding/ChapterRuler.svelte` (unless parent has integrated another consumer).

## Background-image hero and CTA rule (latest)

The user's latest rule is explicit: heroes always use background images; inset means inline, and inline images belong in sections beneath. CTA sections also use background images. This supersedes the earlier side-by-side inline hero application documented above.

Welcome Bench is now the actual CSS background of the hero section, preloaded from its exact original URL, with real HTML heading, paragraph and canonical link button. An accessible section description conveys its informational scene; no hidden inline image is used. The closing Explore Canon patterns CTA section uses the approved clean plate as its CSS background, while ordinary footer navigation remains plain links. Both compositions retain an explicit dark scope in the optional light page preview so text stays legible against artwork.

At widths through 1024px, each background is `100% auto` positioned at the bottom, with black space above for the HTML copy and full source-ratio image space reserved below. At 1025px and wider, the full scene fills a section at its native wide ratio with a left scrim and copy in the quiet upper left. No cover crop is used; full faces, hands, staircase, trays and lamp remain in frame. The clean plate's one-pixel ratio difference is negligible in this full-frame CTA background and is still not treated as compositing registration.

`background-responsive.json` records all six actual viewport checks: CSS hero/CTA background URLs resolve to approved files, hero contains no img, real heading remains, document has exactly three below-hero inline image elements, and there is no horizontal overflow. Four approved distinct assets are visible: one hero background plus three below-hero images; the clean plate repeats as the closing CTA background. Do not equate `document.images.length` with approved asset coverage. `background-{width}.png` and `background-light-{width}.png` cover 320/390/768/1024/1025/1440; these latest compositions replace the earlier measured captures for review. Keyboard and no-JS native chapter anchors retain their behavior. Backgrounds require CSS and remain available without JavaScript. No final independent gate or publishing acceptance is asserted by this implementation update.

## Portrait responsive composition studies (latest implementation)

The earlier small-screen black-space-plus-landscape treatment was technically a background but read like an inline illustration beneath text. The latest application uses the parent's new `static/canon-next/portrait/welcome-bench-portrait.png` and `welcome-cta-portrait.png` at widths below 768px. Both are 941 × 1672 prototype responsive compositions, directly viewed before integration. They are not part of the previously approved four-scene original pack, and neither publication nor art approval is implied. The character-free portrait is a new composition with small background differences, not a registered character-removal layer.

Mobile hero and CTA now fill their native portrait ratio using `background-size:100% 100%`, a restrained top scrim, short HTML copy and one action on the quiet felt wall. From 768px upward, approved landscape backgrounds use full native wide proportions with a left scrim. Complete Canon face, offered hand and paper stairs remain visible; there is no hero/CTA inline img. Responsive preload media selects the correct hero source. Both remain dark-scoped even in the light page preview.

All four approved original scenes now appear byte-identically as inline images in their lower scene-guide sections, including the original Welcome Bench; the original manifest hashes are unchanged. There are four lower inline images plus two CSS background compositions. Hero/CTA captions explicitly identify responsive composition study and new prototype portrait artwork.

Actual final captures `portrait-{dark|light}-{320|390|768|1024|1025|1440}.png` were reviewed for copy, framing and both appearances. `portrait-responsive.json` records final viewport widths, no horizontal overflow, responsive hero URL, zero hero inline imgs and four lower inline scenes. Stills use emulated reduced motion to avoid capturing a ruler needle mid-transition. At 768px the heading and CTA action were shortened/reduced after inspection to keep controls away from the task. No-JS 320px/844px initial viewport and native Scenes anchor were checked; CSS background and real HTML copy remain. Shared ChapterRuler was not changed. These are builder observations for parent independent review, not final aesthetic or publication approval.
