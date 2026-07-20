# CRE-1361 source and rendered baseline

Date: 2026-07-20

Issue: CRE-1361

Branch: `codex/CRE-1361-agent-worktree`

Exact base: `origin/main` at `9de7c0f6f6d8a8458fc1b54dee30c37ec1dfeb40`

Verdict: **revise**

No production source had changed when this baseline was captured.

## Bounded family

The registry's `ltd-presentations` cohort contains twelve checked-in route sources:

- Eleven fixed slide-deck pages.
- One dynamic `/presentations/[slug]/script` reader backed by ten checked-in `SCRIPT.md` files.
- `workway` intentionally has no script and its script URL returns HTTP 404.

The eleven decks contain 176 preserved `<Slide>` instances. The ten scripts contain 3,990 lines and 12,615 words. The shared Canon `Presentation` shell owns slide discovery, previous/next/Home/End navigation, fullscreen, progress, controls, and optional script access. Property routes own the slide and script content.

| Deck                   | Slides | Script lines | Script words |
| ---------------------- | -----: | -----------: | -----------: |
| `abundance-system`     |     14 |          217 |          964 |
| `beads-continuity`     |     14 |          473 |        1,388 |
| `canon-design`         |     15 |          460 |        1,360 |
| `claude-code-partner`  |     17 |          559 |        1,678 |
| `cloudflare-edge`      |     18 |          648 |        1,910 |
| `deployment-dwelling`  |     14 |          465 |        1,280 |
| `developer-onboarding` |     22 |          214 |          866 |
| `heidegger-canon`      |     18 |          633 |        1,792 |
| `hub`                  |     12 |          153 |          557 |
| `user-onboarding`      |     15 |          168 |          820 |
| `workway`              |     17 |         none |         none |

All eleven deck routes and both representative script routes returned HTTP 200 locally and on the live custom domain. `/presentations/workway/script` and `/presentations/not-real/script` returned HTTP 404.

## Baseline gates

- `pnpm agent:solo-loop:check`: pass; only the three known generated Canon declarations are untracked.
- `pnpm --filter @create-something/ltd check`: pass, 0 Svelte errors and 0 warnings; 2/2 Canon-language tests pass.
- `pnpm --filter @create-something/ltd build`: pass, Cloudflare adapter build completes.
- `pnpm performance:pages:check`: 229/229 registered, 36 migrated, 181 pending, 12 technical exclusions. `ltd-presentations` remains truthfully pending.
- Reduced-motion emulation matches `prefers-reduced-motion: reduce`; shared global policy reduces the control and progress transitions to `0.00001s`.
- Representative local and live pages emitted no browser console errors or warnings.

## Rendered failures

### 1. Every deck is blank without JavaScript

The server renders all slide elements, but the shared CSS hides every `[data-slide]`. `onMount` is the only path that counts the slides and restores the current one. With JavaScript disabled, the live and local HUB decks therefore show no argument, a false `1 / 0` counter, and dead controls.

Evidence:

- `output/playwright/cre-1361-baseline/hub-mobile-no-js.png`
- `output/playwright/cre-1361-baseline/live-hub-mobile-no-js.png`
- No-JavaScript accessibility snapshot: the presentation application contains only decoration, controls, and `1 / 0`; it contains no slide heading or body.

This fails the preservation contract even though all slide source remains checked in: a reader cannot reach it.

### 2. Mobile hides the script handoff on every script-enabled deck

The script link is nested inside `.hints`, and the mobile media query sets `.hints { display: none; }`. Exhaustive 390x844 rendering confirmed `scriptVisible: false` for all ten decks that have scripts. Desktop readers can see the script link; mobile readers have no presentation-owned route to the companion narration.

### 3. The global keyboard handler overrides focused controls and links

The shared window handler treats Enter, Space, and Backspace as slide navigation without first checking the event target. In the rendered HUB deck, keyboard focus reached the `script` link. Pressing Enter left the URL at `/presentations/hub` and advanced the counter from `1 / 12` to `2 / 12` instead of opening `/presentations/hub/script`.

The same handler can override ordinary browser behavior elsewhere on the page because it listens on `window`, not on a focused presentation control.

### 4. Fixed controls obscure slide content

The shared controls are fixed near the viewport bottom while slide content is allowed to grow past the available stage. At 390x844, every deck has affected slides. At 1440x1000, ten of eleven decks still have at least one affected slide.

| Deck                   | Mobile slides extending under controls | Desktop slides extending under controls | Mobile horizontal-overflow slides |
| ---------------------- | -------------------------------------: | --------------------------------------: | --------------------------------: |
| `abundance-system`     |                                     13 |                                       9 |                                 1 |
| `beads-continuity`     |                                     10 |                                       1 |                                 0 |
| `canon-design`         |                                      9 |                                       2 |                                 1 |
| `claude-code-partner`  |                                     13 |                                       6 |                                 0 |
| `cloudflare-edge`      |                                     15 |                                       6 |                                 1 |
| `deployment-dwelling`  |                                     10 |                                       2 |                                 1 |
| `developer-onboarding` |                                      9 |                                       2 |                                 0 |
| `heidegger-canon`      |                                     14 |                                       4 |                                 2 |
| `hub`                  |                                      8 |                                       0 |                                 0 |
| `user-onboarding`      |                                      7 |                                       1 |                                 0 |
| `workway`              |                                     13 |                                       5 |                                 0 |

The metric records a slide whose rendered bottom crosses the fixed control bar's top edge. Visual inspection confirms material obstruction: developer-onboarding slide 17 places the control bar over its OAuth explanation, and slide 21 clips its ASCII journey horizontally and places controls over the diagram.

Evidence:

- `output/playwright/cre-1361-baseline/developer-onboarding-mobile-slide-17.png`
- `output/playwright/cre-1361-baseline/developer-onboarding-mobile-slide-21.png`
- `output/playwright/cre-1361-baseline/developer-onboarding-mobile-initial.png`
- `output/playwright/cre-1361-baseline/developer-onboarding-mobile-final.png`

The global mobile search button also overlaps the fullscreen control on every deck. The measured overlap area is about 435 CSS square pixels.

### 5. The script reader preserves words but does not provide a readable path

The dynamic reader computes parsed `sections` but never renders them. It instead places the complete markdown file in one monospaced `<pre>` block nested inside a second `<main>` landmark.

- HUB's 557-word script produces an 8,263px mobile document and wraps the raw markdown into a 212px-wide text column.
- Cloudflare Edge's 1,910-word script produces a 19,291px desktop document.
- The accessibility tree exposes the entire narration as one large generic text node rather than slide headings and readable sections.
- Plain-text and markdown copy work with JavaScript, but `Copied!` has no `role=status` or `aria-live` announcement.
- With JavaScript disabled, all narration remains reachable, but both visibly enabled copy buttons are dead.

Evidence:

- `output/playwright/cre-1361-baseline/hub-script-mobile-initial.png`
- `output/playwright/cre-1361-baseline/hub-script-mobile-no-js.png`
- `output/playwright/cre-1361-baseline/cloudflare-script-desktop-initial.png`

### 6. The property emits duplicate canonical links

Both the local production build and the live custom domain emit the layout fallback canonical plus the correct route-specific canonical:

- `https://createsomething.ltd/`
- `https://createsomething.ltd/presentations/hub` or the corresponding script URL

The route-specific canonical is correct and must be preserved. The extra root canonical is inherited from LTD's shared layout and overlaps other active LTD cohorts, so it is recorded here as a broader property defect rather than silently absorbed into CRE-1361.

## Target-reader review

Representative reader: a junior operator who knows what Codex is but does not already know CREATE SOMETHING's Hub, Three-Tier, or governance vocabulary.

Vocabulary-free restatement after reading the complete HUB path:

> The Hub limits which connector tools Codex can see and checks whether a tool call is allowed before it runs.

What works:

- The first and last slides establish a real argument rather than an undirected collection.
- Numbering and arrow buttons make the basic sequence apparent with JavaScript.
- The HUB script eventually supplies actors, actions, policy, and outcome in plain enough terms to restate.
- All substantive slides, scripts, links, code, quotations, and diagrams remain present in source.

Material friction:

- A no-JavaScript reader receives none of the argument.
- A mobile reader cannot discover the script from the deck.
- A keyboard reader cannot trust Enter on the focused script link.
- Dense slides are physically covered or clipped, so their proof is not fully readable.
- The script reader offers a long raw artifact instead of a scan path, despite already computing section structure.
- “The governed MCP surface” asks the reader to accept internal vocabulary before the actors and action are clear.

Verdict: **revise**. These are task-completion and comprehension failures, not cosmetic preferences.

## Fail-first boundary for the implementation pass

The first red contract must preserve all 176 slides and all ten script files while requiring:

1. The complete twelve-source registry cohort remains atomic and moves to `migrated` only after rendered proof.
2. No-JavaScript deck rendering exposes the ordered slide argument and no dead `1 / 0` controls.
3. Enhanced controls do not obscure slide content at desktop or mobile.
4. Script access remains visible on mobile when a script exists and is absent for `workway`.
5. Global keyboard shortcuts do not override links, buttons, form controls, editable content, or browser conventions.
6. The script reader has one main landmark, renders semantic section headings and prose, keeps raw/plain copy capability, announces copy status, and hides dead copy controls without JavaScript.
7. Back, continuation, Home/End, arrow, fullscreen, progress, HTTP 404, route-specific SEO/AEO, reduced-motion, and all substantive content remain intact.

No human final prose approval has been given. Merge and production deployment remain held even after local and preview verification pass.
