# Implementation notes

Use one model of stable assemblies, coordinates, ports, typed directed edges, evidence IDs, and reveal state. Derive projections and connector endpoints from it; avoid four separately authored illustrations. Labels stay upright. Use screen-space annotations with consistent IDs and a readable HTML legend when small projections cannot accommodate prose.

The included demo is a coherent faceted enclosure with seven assemblies in three spatial dimensions: intake capsule, contract board, coordination core, authority gate, tool adapters, verification core, and receipt board. Surface shading, translucent front walls, rear edges, occlusion, and routed terminals communicate authored depth. They do not encode a numerical dataset. The default is an assembled XRay view; explosion is secondary. In cutaway mode front-right panels are removed. Connectors remain attached in all modes.

Use one primary inspection view and reduced orthographic overviews, explicitly marked as smaller displays. A uniform zoom/pan state is applied to every camera; labels are rendered outside the transformed group. Mobile shows one selected label at a readable size plus full HTML part controls and provenance immediately below the primary view. Fit restores 100%; Reset also restores selection and reveal mode.

Navigation: buttons support 100–400% zoom and panning. Focus a view and use +/−, arrows, 0 to fit, Escape to exit inspection. Alt+wheel zooms; ordinary wheel and browser pinch/zoom remain untouched by default. The Pan & pinch toggle enables captured pointer drag and two-touch pinch only inside the viewport. Touch users can always use buttons. Clamp zoom/pan, release capture on pointer cancellation, coalesce gesture rendering to one scheduled frame, and avoid idle animation. Print temporarily fits transparent geometry then restores the prior inspection state. No-JS output remains fitted and readable.

Selection highlights a part and adjacent routed handoffs, and displays spatial compartment, incoming/outgoing relationships, source and uncertainty. Trace all reveals all illustrative dependencies. These gestures do not execute approvals or tools.
Build: `node scripts/build-demo.mjs`. This creates a complete static SVG and text fallback before enhancement. The same original renderer is embedded for interactive updates. Source files stay separate for review; output is self-contained and works with file://.

Targets for a small explainer: standalone HTML <= 150 KiB uncompressed; <= 1,500 SVG elements; zero runtime network requests; zero idle animation frames; interaction update < 100 ms on the tested desktop. Record actual device/browser when measuring; desktop timings do not establish mobile speed. If larger content breaks these budgets, explain and simplify or split views.

Use native buttons/selects, >=44 px controls, visible focus, and a prose/table equivalent. No hover-only discovery. At narrow widths stack panels; don't shrink the page until labels become illegible. Check at 390 and 320 CSS pixels, 200% zoom, keyboard, touch, JS disabled, reduced motion, and print. Static output must remain useful if enhancement fails.

Depth extensions: add WebGL only if spatial occlusion or volumetric behavior cannot be explained with SVG. Keep the same model and camera, a static SVG fallback, capped pixel ratio, paused offscreen rendering, and measured frame/memory budget. Never add glow or animated scan noise to imply a sensor measurement. Request approval where installing or executing external scripts requires it.
