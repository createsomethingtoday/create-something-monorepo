# Background composition migration

> Current layout: intrinsic CSS scene rows, with dense records below the artwork and no hydration measurement. See [independent R08 acceptance](SCENE-INTRINSIC-INDEPENDENT-R08.md). Phase 6 occlusion and phase 7 initial-load findings are preserved in their historical reports; the checkpoints below are not current whole-system acceptance.

Phase 6 implements the user's black foundation plus measured whimsy direction. Heroes and CTA sections use CSS background scenes; subsequent editorial content may retain inline images. This is not a requirement to add pictures to individual buttons. Geist remains the installed house family; alignment with public OpenAI design principles does not rename it OpenAI Sans or copy OpenAI identity.

## Shared contract

The five public component entrypoints keep their existing names and behavior: PerformanceCampaignOpening, ClearPlatformHero, ClearCtaBand, PerformanceConversionHandoff and MeridianOfferPanel. They accept an optional `background` object:

```svelte
<ClearPlatformHero
  title="Make room for the next useful step."
  background={{
    src: '/owned-scenes/workshop-wide.webp',
    mobileSrc: '/owned-scenes/workshop-portrait.webp',
    aspectRatio: 1672 / 941,
    mobileAspectRatio: 941 / 1672,
    size: 'contain',
    mobileSize: 'contain'
  }}
>
  {#snippet actions()}<Button href="/work">Explore the work</Button>{/snippet}
</ClearPlatformHero>
```

URLs and framing belong to the consumer. No reusable component depends on `/canon-next` assets. BackgroundScene is an internal shared implementation; generated component prop types include the structural scene type. CSS URLs are quoted and escaped rather than concatenated into untrusted declarations. Desktop/mobile image, position and sizing values are independently selectable with a 48rem framing boundary.

Omit `description` for decorative imagery: it is hidden from assistive technology. Supply a concise `description` when the scene contributes meaning; its background layer receives an image role/name. The heading, proposition, essential details and actions always remain HTML. Do not encode essential instructions or state solely in the scene. Meaningful complex diagrams still belong in a subsequent editorial section, with their own semantic text.

The shared layer uses a palette-aware scrim. Copy regions additionally retain near-solid owning-palette backing where full image coverage would threaten legibility. Black remains the default website foundation; explicit light boundaries keep the same roles. Frame faces and task objects away from text. Inspect the actual asset at every target width; a scrim cannot repair a poor crop. No asset leaves a solid, readable fallback and no fake broken-image placeholder. Consumers without an asset still need a deliberate scene selection before satisfying the website composition policy.

## Compatibility and media

PerformanceCampaignOpening's existing `media.src`, `mobileSrc`, `alt`, `objectPosition`, video and studio properties remain accepted. Static source imagery is now CSS background instead of picture/img. Existing alt text becomes the meaningful scene description unless `artifactOwnsMedia` suppresses that redundant scene. Valid positive width/height now preserve the legacy source aspect ratio. Optional mobileWidth/mobileHeight preserve an independently authored portrait ratio. An explicit background object takes precedence. Missing dimensions retain the documented default geometry; verify actual source files before declaring dimensions. CSS intrinsic rows own layout without a post-hydration size change. `mediaMobilePlacement='flow'` is retained as an accepted legacy input, but scenes now stay behind the hero; semantic artifact snippets can still flow using their existing placement contract. Arbitrary action/artifact/ornament snippets are retained. Consumers remain responsible for not putting an inline scene image back into a hero snippet.

Campaign video remains a muted looping enhancement, separate from CSS static imagery, and is absent for reduced-motion readers and before JavaScript enhancement. The static background is the no-JavaScript/reduced-motion fallback. It must carry a suitable representative scene; do not use a video-only URL as `src`. Studio canvas remains an optional enhancement. Neither background imagery nor a looping scene implies actual agent activity.

MeridianOfferPanel's existing `media={src,alt}` becomes a full-section CSS background. Its native action href and labels remain. The no-media semantic artifact remains available as a compatibility fallback; a property-owned scene is still required for final website CTA adoption. Clear hero/CTA and Performance handoff gain the optional scene without changing their snippets, authority records or callbacks. Lower PerformanceFieldSequence and MeridianFeatureSplit editorial images are deliberately unchanged.

## Loading and ownership

Background images do not have img loading/decoding attributes. The route owns LCP budget and should preload only the above-fold hero asset, with matching desktop/mobile media conditions when using separate crops. Do not preload every CTA. Campaign's existing `priority` compatibility behavior is documented alongside its generated head preload; route authors must avoid duplicate competing preloads. Missing or slow imagery must leave useful HTML on its solid foundation. Local fixture PNGs are approved original studies, not optimized production assets or publication approval.

## Consumer migration

The complete read-only source inventory is `evidence/compositions/background-consumers.md`. Agency contains most campaign/handoff consumers, including services, control, delivery, Dify routes and GovernanceProductPage/HighIntentSearchLanding wrappers. Review media objects in their owning modules before migration. Existing `media` users gain CSS backgrounds automatically; no-asset users need consumer-owned URLs. Inline images passed through arbitrary aside/artifact snippets require an authored consumer decision. LTD taste and any shared wrapper references remain in the inventory; no property source was edited by this phase.

`/next/compositions` is an actual-component fixture using the approved local workshop/review scenes. It demonstrates all five scene families, canonical Buttons, truthful property links, lower inline editorial imagery, light/dark comparison and presentation controls. Parent-owned main overview, world, character, wayfinding, art and vNext paths are untouched.

## Validation and gates

Evidence and final command results are appended at handoff. New SSR checks were first run against the old component implementation: six failed and one passed, showing inline campaign/offer images and absent background/semantic support. These are composition-contract regressions, not invented behavioral failures. Existing video/proof/slot tests are migrated to assert the new CSS static fallback while retaining their video, href, artifact and reduced-motion expectations.

Functional correctness, perceptual/product quality and release readiness are reported separately. Builder inspection does not replace the parent's independent actual-output retest or the Cook floor. No commit, push, merge, deployment or publication is authorized here.

## Builder runtime checkpoint

Actual Ego space 19 inspected desktop and mobile output directly, with dark and explicit light appearances. `background-widths-final.json` records all twelve mode/width combinations (320, 390, 768, 1024, 1025, 1440): no document overflow, no visible anchor/button below 44px in either dimension, five CSS scene layers and zero inline scene img nodes across the five hero/CTA families. The lower field section retains one inline editorial image. Keyboard activation changed the real hash to `#cta`; native links and canonical Buttons remain. Reduced-motion rendering and a JavaScript-disabled reload retained background scenes, HTML copy and native actions. The mobile/no-JS screenshots show the actual scene above legible copy as one background composition, not an inline image element.

Direct inspection corrected an initially obscured mobile face, undersized fixture navigation anchors and overly translucent CTA evidence cards. The original failing contract log is retained; exploratory screenshots without `final` in their names are not current acceptance evidence. Final stills include `background-mobile-final.png`, `background-dark-campaign-final.png`, `background-light-campaign-final.png`, `background-dark-offer-final.png`, `background-light-offer-final.png` and dark/light CTA stills. These are local original-scene previews, not a production export.

No new motion behavior was added. Existing campaign video and reduced-motion tests continue to assert enhancement/fallback behavior; the fixture does not download or play an external video. A real consumer video journey remains an integration check. External property hrefs were preserved, not followed or submitted.

Final commands: `pnpm exec vitest run` passed 92 files / 790 tests; `pnpm check` passed with zero Svelte errors/warnings and all package gates; `pnpm build` passed svelte-package/publint. Invoked through local `npx --yes pnpm@9.15.4 --dir packages/canon ...`. Logs are `background-suite.log`, `background-check.log`, `background-build.log`. All Canon package/check/sync/build commands are complete and idle. Parent may resume browser and sequential consumer checks. Development server 5191 remains available; Ego space 19 was closed.

Functional correctness: **passed**, bounded to local tests and exercised fixture behavior. Perceptual/product quality: **passed for builder inspection**, with desktop/mobile actual stills and framing fixes; independent parent acceptance remains pending. Release readiness: **untested/not approved**, because production asset optimization, consumer adoption, independent retest and user-authorized promotion remain outside this phase. No final design/Cook completion claim is made.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`, unchanged HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`. No commits, pushes, merges or deployments. Character/world/wayfinding/vNext/art and property source ownership remained reserved. New scene files are internal source implementations, not new public package entrypoints. The issue remains open.
