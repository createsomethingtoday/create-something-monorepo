# CREATE SOMETHING Performance Lab Design Language

> Date: July 9, 2026
> Scope: Cross-surface CREATE SOMETHING UI, UX, image, and experience direction

## Decision

CREATE SOMETHING should use **Performance Lab** as the house design language.

The public experience should make delegated work feel trained, tested,
governed, and proven before it runs. The internal reference is elite
performance-product discipline: research, prototypes, pressure testing,
measurable readiness, field evidence, and flagship proof. The external language
is CREATE SOMETHING-owned: AI workflow systems, Performance Lab, Signal ->
Decision -> Proof, Policy OS, Skills + MCP, and governed workflow proof.

Do not use Nike, NikeLab, or any third-party brand as public positioning. Do not
copy third-party marks, assets, campaign language, layouts, CSS, or font files.

## Relationship To Existing Canon

Performance Lab does not replace the operating thesis. It gives the thesis a
stronger visual and experiential identity.

| Existing layer | Performance Lab interpretation |
| --- | --- |
| Delegated Work Control | The category: what can run, what waits, what stops, who owns it, and what proves it. |
| Signal -> Decision -> Proof | The core operating loop and page rhythm. |
| Canon Clear | The light proof/readability substrate for public and operator-facing communication. |
| Canon performance tokens | The higher-pressure layer for labs, dashboards, maps, readiness, and proof rooms. |
| Atlas / Signal / Decision / Proof products | The product objects shown as mapped, governed, tested, and handed off. |

The practical rule:

> Performance Lab is the identity. External references are inputs, not the operating center.

## Experience Principles

1. **Performance before autonomy**
   - Show readiness, constraints, and verification before claiming AI can run.
   - Treat every workflow as something trained and tested, not merely automated.

2. **Proof over atmosphere**
   - Lead with maps, state rows, policy gates, receipts, owners, tests, and
     recoveries.
   - Avoid generic AI visuals, decorative gradients, and simulated proof objects.

3. **Pressure states are visible**
   - Run, wait, stop, blocked, reviewed, shipped, and recovered states must be
     easy to scan.
   - Color appears as semantic signal, not decoration.

4. **Artifacts are the brand**
   - Atlas maps, proof receipts, policy cards, runbooks, source records, and
     readiness checks should be recurring visual objects.
   - The system mark stays small; the operating artifact carries the identity.

5. **Labs are useful, not theatrical**
   - A lab surface should help a buyer or operator inspect a workflow boundary.
   - Product demos should feel like controlled workbenches: filter, select,
     inspect, approve, stop, and receipt.

## Typography Direction

Use the Canon-owned local/system typography stack:

- `--font-sans` and `--font-display` use Arial/Helvetica/system fallbacks for
  product and public-page type.
- `--font-mono` carries workflow state, IDs, files, policies, receipts, and
  timestamps through the platform mono stack.
- `--font-serif` uses Georgia/Times fallbacks when an editorial voice is useful.
- Display scale should feel confident and direct, but not campaign-like.
- Do not introduce font hotlinks, new font files, or paid font dependencies
  without explicit licensing and implementation approval.

The July 9 system review removed the former third-party font hotlinks. The
stable token API remains the identity contract; a future licensed family can
replace the fallback values without rewriting consuming components.

## Color Direction

Use existing token families before inventing new palettes:

- `--color-performance-*` for public proof surfaces, articles, service pages,
  labs, readiness surfaces, proof rooms, maps, dashboards, and high-stakes
  decision environments.
- `--color-clear-*` exists only as a compatibility alias for older consumers.
- `--color-shell-*`, `--color-bg-*`, `--color-fg-*`, and semantic state tokens
  for dense operator cockpits and database surfaces.

Performance Lab should not become an orange/brown/court palette. The
performance tokens are accents and material cues; the dominant system remains
near-black, white, porcelain, precise borders, and semantic state.

## Public Copy Rules

Use public language like:

- AI workflow systems
- Performance Lab
- mapped, tested, governed, proven
- signal, decision, proof
- workflow boundary
- policy gate
- readiness
- receipt
- run, wait, stop
- owner

Avoid public language like:

- Nike of AI governance
- NikeLab for agents
- inspired by Nike
- hype lab
- autonomous workforce without proof
- generic AI governance platform

## Surface Rules

### Performance And Safety

Every signature surface should express both qualities:

1. **Performance:** direct hierarchy, stable dimensions, square action
   geometry, visible pressure/readiness rails, and no decorative shadow or
   gradient treatment on controls.
2. **Safety:** explicit `controlled`, `ready`, `review`, and `stop` states;
   named ownership; bounded permissions; and receipt or evidence references.
3. **State contract:** controlled is signal blue, ready is growth green,
   review is gold, and stop is risk red. Pressure orange is reserved for test
   intensity and decisive emphasis, not approval.
4. **Redundancy:** never communicate safety with color alone. Include a state
   word, icon, decision reason, or receipt.
5. **Material signature:** use near-black, white, paper, court, precise lines,
   mono record labels, and semantic rails. Avoid pill controls, soft candy
   palettes, floating shadows, and ornamental gradients.

Canon exposes this through the Performance state tokens,
`.performance-control-rail`, and `.performance-receipt-stamp`.

| Surface | Direction |
| --- | --- |
| Homepage | Keep the plain offer, but add tested/governed/proven language. |
| Products | Present Atlas, Signal, Decision, and Proof as a performance system for delegated work. |
| Articles | Use high-fidelity operating artifacts, not lesson diagrams or AI atmospherics. |
| Dashboards | Use dense records, status rails, source bindings, and semantic state. |
| Sales decks | Show workflow readiness and proof objects before stack diagrams. |
| Social | Use bold evidence crops, lab-note framing, and receipt/state language. |

## Canon Component Rule

Use `PerformanceLabBand` for cross-property readiness summaries. It is a
continuous operating rail, not a row of independent marketing cards: one dark
identity field, one large readiness statement, and semantic metric columns for
signal, pressure, growth, or risk.

Do not recreate this structure in route CSS. Property routes provide the
readiness content; Canon owns the responsive layout, typography, borders, and
state accents.

## Review Gate

Before broad rollout, complete:

1. Font review: source, license, fallback, load behavior, and replacement path.
2. Color review: token ownership, contrast, semantic state, and palette risk.
3. Public-route check: no third-party brand reference leaks into visible public
   copy.
4. Browser verification: homepage and one product/proof surface render with no
   layout overlap and with the intended hierarchy.
5. Canon check: new UI uses tokens and shared primitives instead of local
   one-off styling.

## First Implementation Slice

The first slice is intentionally small:

1. Document this direction in Canon and `.agency`.
2. Add a dated font/color review.
3. Update the homepage description so the public promise includes mapped,
   tested, governed, and proven work.
4. Run copy/token checks and capture a browser screenshot.

Larger redesign work should come after the font/color decision is approved.
