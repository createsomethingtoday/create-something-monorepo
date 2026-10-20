# Implementation notes

Use one model of stable assemblies, coordinates, ports, typed directed edges, evidence IDs, and reveal state. Derive projections and connector endpoints from it; avoid four separately authored illustrations. Labels stay upright. Use screen-space annotations with consistent IDs and a readable HTML legend when small projections cannot accommodate prose.

The included demo is a seven-cartridge console. Its four cameras share scale and state. In cutaway mode the positive-x half of the enclosure is omitted. Exploded spacing is illustrative; edges remain attached. Selection only highlights a cartridge and its adjacent edges; “Trace all” exposes the entire illustrative handoff route. There is no simulated approval or tool execution. A dashed connection indicates a schematic dependency, never data velocity.

Build: `node scripts/build-demo.mjs`. This creates a complete static SVG and text fallback before enhancement. The same original renderer is embedded for interactive updates. Source files stay separate for review; output is self-contained and works with file://.

Targets for a small explainer: standalone HTML <= 150 KiB uncompressed; <= 1,500 SVG elements; zero runtime network requests; zero idle animation frames; interaction update < 100 ms on the tested desktop. Record actual device/browser when measuring; desktop timings do not establish mobile speed. If larger content breaks these budgets, explain and simplify or split views.

Use native buttons/selects, >=44 px controls, visible focus, and a prose/table equivalent. No hover-only discovery. At narrow widths stack panels; don't shrink the page until labels become illegible. Check at 390 and 320 CSS pixels, 200% zoom, keyboard, touch, JS disabled, reduced motion, and print. Static output must remain useful if enhancement fails.

Depth extensions: add WebGL only if spatial occlusion or volumetric behavior cannot be explained with SVG. Keep the same model and camera, a static SVG fallback, capped pixel ratio, paused offscreen rendering, and measured frame/memory budget. Never add glow or animated scan noise to imply a sensor measurement. Request approval where installing or executing external scripts requires it.
