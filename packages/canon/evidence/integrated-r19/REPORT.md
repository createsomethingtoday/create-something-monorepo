# Independent integrated R19 review

**Changes required.** Current local integration passes packaging and the bounded R17 enlarged-text reflow review, but four LTD guides overflow at 320 px. The separate R20 forced-colors indicator finding remains open. This report does not approve release or source-master art.

Reviewed intentionally dirty branch `t3/canon-design-system-redesign`, HEAD `5f9bfab3f6a9069332d650f42a09f5bd18d806a7`, in the parent-owned preserved worktree. No app source, Git state, external system or production surface was mutated. Own Ego space 47 was closed; user spaces and parent space 12 were untouched.

## Failing acceptance

LTD ordinary 320 px prose contains unbroken inline package imports. Root scroll widths: colors 359 px, typography 333 px, theming 362 px, get-started 341 px. The remaining 32 guide/width combinations are contained. Actual offending inline `code` in paragraph text:

- colors and theming: `@create-something/canon/styles/operator.css`
- typography: `@create-something/canon/styles/canon.css`
- get-started: `@create-something/canon/styles/tokens.css`

`ltd-overflow.json` and `ltd-overflow-*-320.png` preserve actual DOM evidence and captures. Colors initially measured the inline import at right 359.08 px. `scrollIntoView` then horizontally shifted the document, producing recorded right positions near 320 while root overflow remained; this is not containment. Parent should preserve normal inline-code legibility while allowing those long paths to wrap, and independently rerun the four 320 px cases. No source repair was made here.

This differs from deliberate `pre` scrolling: code blocks retain `overflow-x:auto` and contained outer boxes, even where the code child is wider. No root overflow was excused as code-block scrolling.

## Passing bounded checks

All 11 requested commands passed sequentially through pinned pnpm 9.15.4: Canon full test, check, build; Agency, IO, LTD and Space check/build pairs. Canon passed 98 files / 818 tests on the first run. Full Canon chained gates passed. R18 read-only source checker passed 45 guides, 78 token references, 39 package paths and 117 local links. See `COMMANDS.md`, `results.json` and per-command logs. No checks were weakened or repeated after passing.

Before/after packaging SHA256 matches across 1,981 scoped source files: `75689842e573202d6a865f5d07eb5d8963738f1d8af9cc0e3c130d6392e00e10`. The after-browser snapshot also matches. Generated caches/dist are excluded explicitly; no scoped source drift occurred.

Fresh actual Ego captures cover components, patterns, filters and timeline at 320, 390, 768, 1024, 1025 and 1440 in both owning palettes: 48 normal combinations. All are horizontally contained. Directly viewed each route's six-width/two-palette contact sheet, individual narrow light output and settled light 768 components. Colors, readable hierarchy, solid controls and normal composition remained coherent within this representative review.

The same four routes passed all 16 combined CSS stress combinations at 320 and 1280 in both owning palettes. The fixture snapshots original computed font sizes, applies 2x inline important sizes, and sets line-height 1.5, letter spacing .12em, word spacing .16em and paragraph margin-bottom 2em. `canon-matrix.json` has zero root or essential control horizontal overflow and records actual palette attributes/computed backgrounds. Directly viewed dark/light defect areas: decision status now separates and tabs wrap; Hide fits its border; timeline time/zoom groups and summary wrap vertically. Very narrow stress layouts become tall and split words; no normal-size aesthetic claim is derived from that fixture. Internal timeline canvas and table scrolling remain distinct from DOM toolbar/summary reflow.

Actual interactions: native project select reached the saved shared-library toast; invalid save focused the required owner; keyboard-opened dialog closed on Escape and returned focus; keyboard menu Enter selected Duplicate and returned focus; stressed filter Hide/Show and material callback succeeded; stressed decision Review updated current state without status overlap at 1280; stressed nested timeline zoom reached 125%, ArrowRight emitted frame 13, and reversal changed nested ownership to light. See callback JSON and interaction logs. Native browser zoom was **not tested**. The CSS fixture is not browser zoom, text-only scaling or WCAG certification. Full stressed-modal keyboard coverage and timeline pointer projection under the smallest canvas remain untested.

Footer active property contrast passed independently at 320 and 1440: editorial patterns dark 16.867:1, light 14.281:1; actual LTD and Agency dark 16.867:1. Exact destinations, active classes and links were retained and focus was reachable; actual captures were directly viewed. This is bounded focus evidence, not a complete keyboard traversal of every footer link or all interaction colors. Actual consumers were only tested in their ordinary dark website palette; both explicit comparison palettes were tested in the patterns owner.

All six requested LTD routes loaded and compiled, with actual six-width captures directly viewed. Prose and navigation have coherent black foundation/Geist hierarchy; code-block outer boxes remain contained. At 390, keyboard Enter opened Browse Canon, Escape returned focus, and following Typography changed both URL and actual H1 to Typography and closed the drawer. Inline-code overflow above prevents overall guide acceptance.

Private character readback at actual 390 and 1440 showed the complete r38 body with antenna, both hands and feet plus clear margins. Both source images decode at 1199x1312; preferred image displays at 290x317.33 and 320x350.16 respectively. The route still uses r34 at 96 px, text below that size, and captioned r35 static poses. This is framing/readback acceptance only; full-resolution material quality and user art approval remain open.

## Evidence limitations and recovery

The first long Ego matrix invocation ended code 1 after 49 captures without an app diagnostic. The same space remained usable; only remaining cases resumed. Metadata audit rejected four initially mislabeled light stress captures where an early appearance click had left the owner dark. Those four were replaced after explicit expected-state verification; no mismatched palette remains in final matrix data. Normal guide screenshots were replaced with explicit top-of-page scroll positioning after scroll restoration left some original captures mid-page. Character 1440 similarly required explicit positioning before its final directly viewed capture. These are recorded capture corrections, not app repairs or autonomous self-healing.

Ego auto-scroll failed an offscreen action; observed current state, then used explicit instant scrolling. One unsupported bare role locator was corrected to the documented selector form. Component dialog screenshot is correctly labeled 1280 because metrics reset between Ego invocations. Timeline and route matrices explicitly reapply viewport metrics. Ego reported an update; no upgrade was attempted.

## Quality gates

- **Functional correctness: failed overall acceptance.** All requested local tests/checks/builds and bounded R17 behavior checks passed; LTD 320 root containment fails. No external workflow or production runtime was exercised. R20 forced-colors is a separate open integration finding reported by its owner, not independently retested here.
- **Perceptual/product quality: failed overall acceptance.** Actual output was directly viewed; ordinary Canon compositions, repaired text-stress areas, footer contrast and provisional body framing pass their bounded scope. Four guide pages still overflow, forced-colors repair remains open, and full-resolution character art acceptance is not established.
- **Release readiness: failed / unapproved.** Deployable local artifacts exist, but source acceptance findings remain. No publishing destination or promotion is authorized here. Parent retains user art approval, the eight-hour floor (23:05:32Z), integration, release and rollback decisions.

Worktree disposition: preserved at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-a01044d6-2f560e0ec9e58190`, branch `t3/canon-design-system-redesign`. LTD dev server was started only in this worktree at 127.0.0.1:5194, PID 48100, tool session 3510; parent may reuse or stop it. This reviewer owns no further source or browser lock. Parent should repair the concrete guide and R20 findings, then run focused regressions and independent affected-output review; the passing full matrix need not be repeated without new risk.
