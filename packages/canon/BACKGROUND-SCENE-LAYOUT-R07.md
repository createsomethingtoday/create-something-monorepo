# Scene layout repair · phase 7

> Historical phase 7 checkpoint. Its ResizeObserver layout caused a confirmed initial-load jump. The current intrinsic CSS implementation and fresh independent evidence are in [SCENE-INTRINSIC-INDEPENDENT-R08.md](SCENE-INTRINSIC-INDEPENDENT-R08.md).

The prior independent review **failed the perceptual gate**. Its screenshots showed CTA cards across Canon's face/task, a handoff authority column cutting the face, hero proof overlapping the body at 768px, and an offer copy edge cutting the face at 1024px. Those are the actual failing-before regression evidence in [BACKGROUND-INDEPENDENT-REVIEW.md](./BACKGROUND-INDEPENDENT-REVIEW.md) and `evidence/background-independent/`. The phase 6 builder's visual pass did not establish independent acceptance and is superseded.

## Structural repair

All five scene families now use the same internal `SceneLead.svelte`. The background is confined to a lead region containing concise HTML copy and actions. Dense content follows in a separate `.canon-scene-details` region on the owning foundation:

- ClearPlatformHero: metadata, proof and arbitrary aside below the artwork.
- ClearCtaBand: every outcome/state card below the artwork.
- PerformanceConversionHandoff: authority record, steps and either artifact placement below the artwork.
- PerformanceCampaignOpening: proof, arbitrary semantic artifact and ornament below the artwork. An explicit `artifactOwnsMedia` retains its legacy artifact-owned composition rather than forcing an arbitrary semantic artifact into the scene layout.
- MeridianOfferPanel: a concise scene lead and the same native action. Its no-scene semantic artifact remains in the legacy layout.

Existing public props, snippets, links, labels, states, table/record text and no-background branches remain available. Nothing is truncated. Campaign media input conversion, priority head preloads, color mode, video/reduced-motion fallback and studio enhancement remain; neither the reusable API nor the internal module knows `/canon-next` asset paths. No new public export or package entrypoint was introduced.

`BackgroundScene` now owns only CSS image URL/framing and decorative/meaningful semantics. It no longer paints a whole lower-image-to-black gradient. SceneLead owns quiet-region treatment and geometry. The desktop lead preserves the complete authored landscape at its ratio with copy at the left; mobile reserves the portrait's lower 55% independently of copy height. Only the upper quiet wall receives the readability treatment; the full face, body, held object and paper stairs remain visible. The mobile lower artwork is not hidden by the former fixed 20rem black gradient.

## Asset and content contract

```svelte
<ClearPlatformHero
  title="A clear next step."
  description="A local sample with a named owner."
  background={{
    src: '/owned-scenes/welcome-landscape.webp',
    mobileSrc: '/owned-scenes/welcome-portrait.webp',
    aspectRatio: 16 / 9,
    mobileAspectRatio: 941 / 1672,
    position: 'center',
    mobilePosition: 'center',
    description: 'An original workshop with Canon and the paper staircase.'
  }}
>
  {#snippet actions()}<Button href="/work">Explore the work</Button>{/snippet}
</ClearPlatformHero>
```

Supply actual image ratios. Defaults are landscape 16:9 and portrait 9:16 when a separate mobile source exists; a single source retains its landscape ratio. `size`/`mobileSize` remain accepted framing overrides; the default is `contain`, preserving the full image rather than cropping its task. The intended composition is a full-width public section, with the responsive scene boundary at 48rem. Pick a landscape with quiet left wall and a portrait with quiet upper wall. An arbitrary crop without these zones cannot acquire good composition through the API alone.

Keep lead copy concise. SceneLead measures natural desktop copy with ResizeObserver. If it exceeds the quiet region's budget, it moves the copy **above** the entire scene instead of overlapping or clipping it. The text remains complete at its existing readable width. This conservative stacked layout is also the desktop no-JavaScript default. On mobile, larger copy extends the quiet space above the anchored full portrait. No-JavaScript users keep HTML, native actions and all records without needing that measurement. A long-copy browser stress test at 768px confirmed copy bottom equals artwork top after fallback; no content was truncated. It is a structural recovery, not a claim that unlimited marketing copy makes a good hero.

Decorative scenes omit `description` and remain aria-hidden. Meaningful descriptions retain an image role/name; essential instructions stay in HTML. Missing/blocked images leave useful black-foundation copy and native actions, without a broken inline-image placeholder. Explicit light mode uses the same geometry with its own readable quiet-region treatment. Video remains an optional enhancement to a static scene; no external video is supplied in the fixture, so real decode/playback remains an integration check.

## Fixture and art status

`/next/compositions` demonstrates the five real families and canonical Buttons. Hero uses the original desktop welcome bench and the new mobile welcome portrait. CTA/offer/handoff use the original clean plate and its portrait recomposition; the complete paper staircase remains visible. Dense records are below both character and clean-plate art, so removing the character is not used to conceal the layout defect. A later consumer may supply another properly composed scene without changing the API.

The portrait files are **prototype recomposition studies, not final approved production art**. The approved scene originals and all portrait files were read only. Lower editorial inline images, real property links, parent overview/world/character/vNext/wayfinding, utility/maps and consumer sources were preserved. The fixture's lead text is intentionally shorter with one primary action; snippets still accept additional actions and content.

## Verification and limits

`evidence/scene-layout-r07/widths.json` and sixty actual settled per-section screenshots cover five families at 320, 390, 768, 1024, 1025 and 1440px in dark and explicit light. All twelve combinations measured five CSS backgrounds, zero inline hero/CTA scene images, no document overflow, no visible anchor/button below 44px, and dense-region top at or below the corresponding lead bottom. Browser geometry is evidence of separation, not automated aesthetic approval.

Builder directly inspected representative shots spanning every requested width, both modes and all five families, including the previous 768px hero, 1024px offer, mobile CTA/handoff and desktop authority failure cases. Full face/body/task and complete paper stairs are visible in the updated compositions. `long-copy.json`, `nojs-390.png` and `missing-image-390.png` preserve fallback evidence. Keyboard Enter on the real CTA navigation link changed the hash to `#cta`; reduced-motion emulation matched. Existing campaign video/reduced-motion tests remained in the focused regression run.

New runtime DOM tests assert that metadata/proof/outcomes/authority/artifacts actually live outside the scene lead, that all states and native destinations remain, that no-background layouts retain their legacy structure, and that measured desktop copy growth selects the stacked fallback without truncation. The Offer source-count assertion was replaced by a rendered SSR check proving exactly one native action per instance in both scene and fallback branches; duplicated conditional source text is not duplicated rendered behavior.

This is a checkpoint in a deliberately dirty shared checkout. Utility and Atlas owners added their source before the final full suite; package success is not a final exact-artifact integration claim. Any cross-owner failures are reported separately rather than repaired outside ownership. Parent retains independent retest, consumer validation and the eight-hour Cook floor.

## Final command checkpoint and handoff

Commands ran sequentially through `npx --yes pnpm@9.15.4 --dir packages/canon`:

- `exec vitest run`: **802 passed, 2 failed**, 95 files. All scene-layout, media, snippet and native-action checks passed. Current failures are outside this phase's ownership: foundation byte parity differs after parent token-comment edits, and the existing legacy-token policy reports 22 references in utility/maps and related utility families. Exact diff/paths are retained in `evidence/scene-layout-r07/suite.log`; no outside-owner repair or assertion weakening was performed.
- `check`: **passed**, zero Svelte errors/warnings, packaging/publint and package gates passed.
- `build`: **passed**, svelte-package/publint successful.
- Scoped `git diff --check`: passed.

**All Canon packaging/check/sync/build commands are complete and idle.** Parent was explicitly notified before handoff; browser/consumer owners may proceed. Development server 5191 is preserved. Ego space 23 is closed after evidence capture. No other checkout or root files were written.

Three gates: functional correctness **passed for the owned scene implementation**, while the current full-suite integration gate **fails** the two cross-owner assertions above. Perceptual/product quality **pending fresh independent retest**; the previous independent failure is not relabeled as a pass, and builder actual-output inspection only establishes that the named occlusions were repaired in the viewed samples. Release readiness **untested/unapproved**; consumer adoption, production optimization, fresh independent review and authorized promotion remain outstanding.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`. No commit/push/merge/deploy/publication. CRE-2434 remains open; parent owns final integration and Cook floor.
