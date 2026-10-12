# InspectableJourney — provisional composition

CRE-2259 pilot; not promoted to the stable foundation registry. Reuses Canon tokens and native anchors. Agency is the first consumer. No domain data, provider call, storage, router import, timer or animation loop is owned here.

## Contract

- Supply a document-unique, fragment-safe `id` and a nonempty list of unique, fragment-safe step IDs. Use lowercase letters/digits/hyphens; never use `-detail` as a step suffix (reserved for contextual records). Labels, headings and summaries are plain content owned by the property.
- `location` is controlled. Its `stepId` must exist. `onselect` is a request; the owner commits selection synchronously, keeps URL/history state, and prevents stale delayed focus work. `journeyFragment`/`readJourneyLocation` form the exact, scoped fragment contract; unknown fragments resolve to the first step.
- Set `enhanced` only after hydration. Before that, every step/content snippet is rendered and visible. An owner must retain all necessary content in that static representation.
- Selection is not focus. Clicking a scene anchor leaves native focus there; the owner handles explicit progression, detail focus, Escape and browser Back. Ensure returned focus is visible vertically on narrow screens, not just present in the DOM. Modified clicks remain ordinary native links.
- `overview(selectedId)` keeps one persistent overview; `content(step, detailOpen)` supplies each record and its native interaction controls. Hidden enhanced panels stay mounted but must not run hidden external work. ID targets `${id}-${step.id}` and `${id}-${step.id}-control` are stable.
- `reducedMotion` defaults true and should receive the property's preference. System reduced motion is also enforced in CSS. The only built-in feedback is a 200ms opacity change on an activated panel; no motion gates logical state, no RAF/timers or new dependencies. Every selection is interruptible.
- Current layout optimizes a short sequence of four steps (two columns on narrow layouts). This version labels panels “illustrative example”; use for synthetic teaching journeys only. Do not use it to claim live state or verified results. Generalize these constraints only with a second reviewed consumer.

Registry policy: explicitly `experiment` / `classified-out` for CRE-2259; no stable promotion. The registry test guards this boundary.

## Agency pilot composition

`ServiceJourney` supplies a fixed broken-form example and unchanged accepted isometric assets. SvelteKit router-owned fragment navigation preserves unrelated page state, preserves query parameters and exposes direct scene/detail links. The sample's separate anchor resolves to Handoff. The owner retains fixed synthetic choices in versioned tab storage; completion is synchronous and explicitly says nothing was sent, changed or booked. Storage failure preserves the in-memory result with an honest limitation.

## Verification

Agency `test/interaction-pilot.test.ts` tests semantic completion and invalid restoration/location. `scripts/check-interaction-pilot.mjs` covers rendered behavior at 1440/390/320, no-JS, keyboard records/return, browser history/deep links, route return, sample completion/reload, storage failure, reduced motion, rapid state interruption and emulated touch/orientation. Device/VoiceOver acceptance remains distinct from headless browser tests.
