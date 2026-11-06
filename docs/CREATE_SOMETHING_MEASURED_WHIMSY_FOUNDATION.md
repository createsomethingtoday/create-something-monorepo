# CREATE SOMETHING: measured whimsy

> Direction approved: November 6, 2026. First implementation: `.agency` homepage.
> Status: approved for production release; candidate integration and live acceptance remain separate checkpoints.

CREATE SOMETHING pairs a black field and white structure with curious, capable
characters. Measurement helps people find their way; whimsy gives the work a
recognizable personality. Begin with the Agency homepage and its existing Canon
workshop imagery, then use the same principles when directing images and video.

This extends [Performance Lab](CREATE_SOMETHING_PERFORMANCE_LAB_DESIGN_LANGUAGE.md)
and its [visual grammar](PERFORMANCE_LAB_VISUAL_GRAMMAR.md). It does not change
service positioning, commercial terms, evidence requirements, or other properties.

## Give the structure a job

- Use `#000` for the Agency shell and `#fff` for primary type and marks. Use
  existing Canon tokens and house sans/mono fonts. Borders and quieter labels
  can use restrained white opacity; maintain readable contrast.
- Pair decisive type with small, precise labels. Keep the proposition and main
  action understandable before introducing brand vocabulary.
- Make ticks, indices, rules, leaders, and coordinates explain a destination,
  sequence, image subject, or relationship. Do not invent readings, timestamps,
  signal strength, agent activity, or readiness to fill a display.
- Keep motion brief and purposeful. A marker can show which chapter is selected;
  a character can accompany a change. Reading and navigation never wait for either.

## Let Canon guide the reader

Canon is quietly capable, attentive, and curious. The character inspects, points,
builds, tests, and helps people understand the next step. Small gestures can bring
warmth to a measured composition. Use existing original Canon poses and workshop
assets for the first implementation.

Place personality beside a task: an annotation, a chosen chapter, an explanation,
or a handoff. Avoid continuous performance, a character following every pointer
movement, or a gesture that implies approval or completion without evidence.
The guide must never cover a control, obscure copy, or carry meaning by itself.

## Make the chapter ruler useful

The first Agency treatment uses five numbered chapter links to real homepage
sections. Each link has a plain label, a native hash destination, and a visible
current state. Scrolling updates the current chapter without taking focus or
changing the reader's selected disclosure.

Hover and keyboard focus preview the intended destination on the ruler. When the
pointer leaves or focus leaves the ruler, its marker returns to the current
chapter. Preview and current location remain distinguishable. Clicking a link
follows the native destination and places focus at the reading target through
the existing hash-navigation behavior.

Keep every destination available on phones and with JavaScript disabled. Do not
require dragging, precision pointing, hover, or animation to navigate. The ruler
is a reading aid; a countdown or a radio-frequency scale would have no truthful
meaning on this service page.

## Direct images and video from the same foundation

Use original graphite workshop scenes and Canon characters against the black
field. Preserve the material detail and the relationship between people, agents,
and their shared task. Establish the focal point and mobile framing before
placing type. White rules and numbered annotations may identify actual subjects
or connect a scene to the relevant section.

Keep annotation text in the page or player interface where practical. Pair each
number with a readable label; an image or video must retain meaning when an
overlay is unavailable. Keep captions outside important faces, hands, mechanisms,
and controls. Give smaller screens their own clear arrangement rather than
shrinking the complete desktop annotation layer.

The first hero plate uses the owned workshop image with numbered native links
to the connection, evidence, and handoff chapters. A reader can follow each
annotation by pointer or keyboard without relying on hover or JavaScript.
The three labeled destinations below the image explain the same routes;
existing handoff and FAQ disclosures remain available further down the page.

For video, use the chapter ruler as a persistent orientation device and carry
the same type, rules, numbered sequence, and black/white framing into titles and
prompts. Synchronize guidance with the action it explains. Retain playback,
pause, captions, seeking, and motion preferences. Do not invent footage or imply
that a conceptual animation records a delivered system.

## Preserve the evidence and the task

Workshop illustrations explain an idea. Real interface recordings, source
artifacts, tests, and receipts support delivery claims. Keep those boundaries
visible. A measured visual treatment does not turn an illustration into a live
agent run or prove a customer outcome.

The Agency implementation preserves the existing hero proposition, service and
pricing copy, ownership and consent terms, booking destination, inquiry behavior,
FAQ, proof attribution, work library, walkthrough dialog, and existing chapter
seeking. Existing navigation, focus restoration, interruption handling, and
reduced-motion preference remain part of the acceptance criteria.

## Verify the actual experience

Before this direction is ready for promotion:

1. Review the rendered page at `320`, `390`, `768`, `1024`, `1025`, `1440`,
   `1920`, and `2560` pixels. Check hierarchy, imagery, annotation legibility,
   overflow, and the ruler's relationship to the shared navigation.
2. Exercise all five links by pointer and keyboard, scroll in both directions,
   and check preview return, current state, hash destinations, and reading focus.
3. Check reduced motion, the site's motion control, no JavaScript, resize,
   interrupted movement, native disclosures, and walkthrough close/focus return.
4. Run the relevant Agency checks and obtain an independent review of the actual
   output against these criteria. Record functional correctness, perceptual
   quality, and release readiness separately, including untested limits.

If a marker or motion layer fails, native chapter links and readable content
remain the fallback. Repair or remove the enhancement before promotion; retain
the existing page behavior and scoped rollback.

## Reference evidence and adoption boundary

| Reference | Inspected evidence | Adopt | Avoid |
| --- | --- | --- | --- |
| [GSAP Vault Observatory](https://gsapvault.com/demos/observatory-template/index.html) | Browser interactions and static JavaScript analysis | Meaningful ruler navigation, numbered annotations, visible response and bounded interaction | Observatory identity, subject matter, assets, invented telemetry, or a second navigation system |
| [Fiasco](https://mobbin.com/sites/sections/b1072dab-8faa-4336-8cdf-980edf4d3213) | Static Mobbin section image | Decisive wordmark scale and type contrast | Its composition, assets, and brand identity |
| [COLLINS](https://mobbin.com/sites/sections/76aeaeb4-d741-43d4-a7c6-65dbbd902701) | Static Mobbin section image | One clear statement and legible navigation | Its copy, layout, and product-specific sequence |
| [Frontify](https://mobbin.com/sites/sections/62984214-7e41-43f6-b3fe-4ada5446fc18) | Static Mobbin section image | Annotations that help a reader inspect an image | Its imagery, labels, and branded composition |

Static Mobbin images establish visual states and hierarchy, not timing, easing,
or interruption behavior. The Observatory browser pass exercised the dish,
keyboard control, programme filters and empty state, elevation, walking map and
red mode, and planner. These observations inform interaction choices; Agency
must prove its own behavior in the rendered implementation.

REA CLI retained evidence:

- Evidence ID: `ev_d60a221d92f8dccdd6d8f6d6bf7f11f6227d36f96276b5801d968ad7ef7cad9a`.
- Analyzed script SHA-256: `35fefae7686605e1a49a6403317a02a54ccc4d50115b0043dc975e17c5312527`.
- Full local analysis: `/tmp/cs-observatory-rea.json` (temporary, machine-local).
- Retained local evidence: `artifacts/agency-measured-foundation/rea-evidence.json`
  and the smaller `rea-summary.json`. Static analysis parsed the shipped code;
  the separate Ego Browser observations established the exercised interactions.

The user authorized use of the reference code. This implementation re-expresses
its useful techniques in the existing Agency stack; no third-party source
assets need to be copied. The reference is an input to CREATE SOMETHING's owned
identity, and its interaction coverage is not evidence of Agency acceptance.

## Implementation evidence — November 6, 2026

The first slice replaces the decorative homepage trace with the chapter dial and
annotated workshop plate. The existing proposition, service terms, proof,
walkthrough, handoff tour and booking destination remain in their owning sources.
The new style sheet is scoped to the measured homepage; shared navigation logic
and other properties retain their existing behavior.

The rendered regression exposed a real interruption in the existing story
motion: an image loading during smooth hash navigation forced a ScrollTrigger
refresh, restoring a partial scroll position. Independent reproduction stopped
short of `#together` even though hash and focus changed. Blocking image-load
propagation or waiting for the images first removed the failure. The scoped
repair uses the installed GSAP 3.15 `ScrollTrigger.refresh(true)` safe path,
which waits for scrolling to settle before recalculating.

The retained browser check covers eight viewport widths, named annotation
targets, monochrome computed colors, pointer/focus preview and return, all five
keyboard destinations, direct hashes, current chapter, walkthrough pause/focus
return, mobile menu, reduced motion and native navigation without JavaScript.
See `packages/agency/scripts/verify-measured-foundation.ego.mjs` and
`artifacts/agency-measured-foundation/browser-report.json`. The pointer-exit
regression also proves that an existing keyboard preview survives pointer exit.

Validation commands: Agency `pnpm check`, `pnpm build`, Svelte check with
`--fail-on-warnings`, the focused motion/copy/policy tests, and the Ego script.
These are local build, offline test and local browser evidence. They do not
establish production deployment, provider delivery or human acceptance.

Final independent Sol 6.1 review: functional correctness **passed**;
perceptual/product quality **passed** after viewing all eight widths and the
settled mobile handoff; release readiness **passed for local review**.
Production release remains **untested**. The reviewer independently exercised
the original lazy-image race from an uncached motion-on page, all five pointer
and keyboard destinations, reduced motion and native no-JavaScript navigation.
Evidence is retained under `artifacts/agency-measured-foundation/final-review-*`.

Rollback is scoped: revert the measured-foundation release commit through the
normal review and promotion path. Preserve the newer walkthrough entrance,
chapter entrances, handoff scene motion, scroll-progress alignment, warm assets,
and dialog close-race repair. The local `AgencySalesHome.before.svelte` records
the design baseline; do not restore that older whole file over current upstream.

## Production release preparation — November 6, 2026

[CRE-2369](https://linear.app/createsomething/issue/CRE-2369/release-approved-agency-measured-whimsy-foundation)
tracks promotion. The approved local source receipt is the design baseline,
not the current production branch. Release preparation applies its narrow deltas
to `origin/main` at `2c9ca4390e8d872137b13995a2c6616ed41fed79`.
The dial and workshop plate retain their approved source bytes. Existing
upstream behavior and content remain in their owning sources.

Upstream added a warm `<picture class="hero-workshop">` behind the hero copy.
The measured stylesheet hides that picture only on the measured homepage so
the approved annotated `hero.webp` plate is the visible hero image. Its preload
replaces the now-hidden picture's warm-image preloads. The warm asset files,
example imagery and other surfaces remain unchanged.

The browser regression now accepts an explicit existing taskspace ID, page ID,
base URL and evidence directory through `globalThis.MEASURED_FOUNDATION`.
Its header shows the input shape. It creates no browser space or page and adds
an eight-width check for the suppressed duplicate backdrop and plate source.
The parent owns the rendered integration re-test in its existing taskspace.
The earlier browser and independent Sol 6.1 receipts above describe the local
approved baseline, not this integrated candidate or production runtime.

The user approved deployment before continued polish. This implementation
sub-agent prepares the isolated committed PR only. The parent owns integration,
merge, deployment, production readback and live acceptance. The public HTML
cache revision advances from `walkthrough-entry-20261106` to
`measured-foundation-20261106`; cache eligibility and policy are unchanged.
Worktree disposition: preserved at
`/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-99ce72a0`,
branch `t3/agency-measured-whimsy-release`, until the parent release checkpoint.
The original shared checkout remains untouched.

## Public Agency extension — CRE-2370

The approved foundation is deployed. The next pass carries its neutral roles,
square masthead, fine rules, image mounts and directory into the reviewed public
Agency portfolio. `usesAgencyMeasuredPublicSurface` owns the SSR opt-in,
separately from operator-palette ownership. Sign-in, private workspaces, client
surfaces, unknown/archived routes and the separately composed Webflow portfolio
remain outside that boundary. Canon's shared components and status colors keep
their existing contracts. The homepage retains its authored five-chapter dial.

`packages/agency/scripts/verify-measured-public.ego.mjs` runs in the parent's
existing Ego TaskSpace. Supply `globalThis.MEASURED_PUBLIC` with `taskSpaceId`,
`pageId`, `baseURL` and an absolute `output` path, then evaluate the script through
`ego-browser nodejs`. It exercises the six principal public journeys at
320, 390, 768, 1024, 1025 and 1440 pixels. It checks black document, opening and
inquiry surfaces, white titles, full-width navigation, readable content bounds,
original-image captions, and retained scheduler/form entry points. It never
creates or finishes a TaskSpace and never submits a form. The foundation script
continues to cover the homepage's eight-width interaction contract.

### Storytelling context

The user identified Palantir as business-model context on November 6. Its public
documentation describes an operation-specific model connecting data, logic,
actions and security, and a bootcamp approach that starts with an actual use
case and helps people adopt it. These are useful story principles, not evidence
that our commercial terms or capabilities match Palantir's.

Canon and the workshop crew make the customer's existing operation legible:
read the plan, connect the tools, repair within bounds, pause for human judgment,
test the result, and keep the receipt. Let the characters carry curiosity and
care. Let the structure explain actual relationships, authority and evidence.
Use the existing planning, repair, test-bench and handoff imagery; concept
illustrations remain distinct from real recordings and operational proof.

Sources: [Palantir Ontology system](https://www.palantir.com/docs/foundry/architecture-center/ontology-system),
[AIP Bootcamp](https://www.palantir.com/platforms/aip/bootcamp).
The supplied [David Carbutt video](https://youtu.be/_hFiiaf6Mi8) was identified as
“No One Sees What Elon & Palantir Are Building”; its public player required
sign-in to confirm a human, so its spoken content was not verified.
