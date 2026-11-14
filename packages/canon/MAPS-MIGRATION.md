# Canon maps and miniature workflow artifacts

Local review surface: `/next/maps`. It imports the actual shared Atlas flow and
story canvas, all three Clear workflow mini-artifacts and the shared LTD bar
chart. Its reading-list graph is fictional; the selection callback changes only
page state. It does not submit records or modify external sources.

## Palette and interaction contract

Atlas canvas, node, ledger, edge label and solid chrome now use the owning
Canon background/foreground roles. `data-theme="light"` is an explicit work
surface; nested `data-theme="dark"` restores dark roles. Existing consumers
may still supply their own scoped operator overlay. This migration does not
remove those overlays or change graph policy, data, readiness or layout APIs.

Run, wait and stop remain named in text and use success, warning and error
foreground/background/border pairs. Story selection exposes `aria-pressed`.
Graph controls remain 44px; node cards remain larger than 44px. Decorative
miniature marks are not controls: their artwork dimensions do not imply hit
areas. Their state labels increase from 8.96px to 12px. Unfocused node text
remains readable; a dashed outline distinguishes it without reducing all text
opacity. Edge text remains opaque when its path is deemphasized.

The diagram theme retains the property series API and distinct hues. LTD uses
the owning foreground rather than literal white. Colored series mix their
existing hue with the owning foreground so light work surfaces do not inherit
pale dark-mode graphics. Explicit caller-supplied `DataPoint.color` values
remain caller-owned. Color is never the only available category: chart labels
and fixture property names remain present.

## Evidence and limits

`evidence/maps/before-dark.png` preserves the actual pre-change rendering after
loading Canon's canonical stylesheet. Browser measurement found a white ledger
surface with inherited RGB(242,242,242) foreground and 8.96px mini state labels.
`evidence/maps/regression.json` records the LTD theme regression against HEAD:
literal white before, owning foreground after. Focused Svelte compiler parsing
passes with no warnings; focused theme, headless, handoff and typography tests
pass (4 files, 12 tests). The offline series calculation records at least 3.52:1
on the light white canvas and 11.36:1 on black; this is a graphics calculation,
not a text contrast claim or rendered acceptance. Rendered `/next/maps` validation is complete for 320, 390, 768, 1024, 1025
and 1440px: final full-page screenshots were directly viewed, with no document
horizontal overflow. Every graph control measures 44×44px. The miniature state
labels measure 12px. `responsive.json` records these actual browser measures.

`rendered-contrast.json` measures each sampled text color against its actual
opaque owning surface: minimum 5.80:1 for mini states in light, 7.57:1 in dark,
6.77:1 for light edge labels and 12.42:1 for dark edge labels. Ledger secondary
text measures 7.21:1 light and 11.17:1 dark. Actual inspection discovered that
this XYFlow version renders edge labels as HTML divs, so inline color and
background pairs supplement SVG fill/stroke roles.

Node click updates the selected name. Native Zoom In changes viewport scale;
pointer drag changes viewport translation. Enter selects story chapter 2,
updates `aria-pressed`, and shows a visible 2px focus outline on a target over
44px. `interactions.json` records the viewport transforms and keyboard result.
The reduced-motion media query matches and node transition duration resolves
to 0.00001s through the shared reduced-motion foundation. No-JavaScript was
actually loaded and viewed: the fixture hides empty interactive maps while
retaining the server-rendered ledger, chart, state text and explanation.

Small maps deliberately retain a pannable viewport rather than shrinking the
entire graph to fit a phone. Fit View is an overview, not a promise that every
label is readable at any zoom. The diagram artwork itself scales down on a
phone; full detail may require zoom. These results cover the fictional fixture,
not live production Atlas or every consumer overlay. Package checks and the
fresh independent integrated re-test remain parent-owned.

Functional correctness: passed for this bounded local fixture and focused
regressions. Perceptual/product quality: passed for owning palettes, readable
state pairs, solid materials and responsive layout, with the graph/diagram
zoom limits above. Release readiness: not applicable to publishing; the local
artifact is reviewable, and no shipping destination is authorized. No production or external write was performed.
