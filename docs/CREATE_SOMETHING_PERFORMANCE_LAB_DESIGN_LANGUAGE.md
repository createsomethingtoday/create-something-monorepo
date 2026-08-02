# CREATE SOMETHING Performance Lab Design Language

> Date: July 9, 2026
> Scope: Cross-surface CREATE SOMETHING UI, UX, image, and experience direction

## Decision

CREATE SOMETHING should use **Performance Lab** as the house design language.

The operative definition is:

> Performance Lab is the visual language of intelligent systems trained for
> pressure: engineered in the lab, tested under load, and proven in the field.

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
| Readable Control | The calm proof/readability substrate inside Performance Lab, not a competing brand identity. |
| Canon Clear | A legacy compatibility API that resolves to the Performance Lab readability substrate. |
| Canon performance tokens | The higher-pressure layer for labs, dashboards, maps, readiness, and proof rooms. |
| Atlas / Signal / Decision / Proof products | The product objects shown as mapped, governed, tested, and handed off. |

The practical rule:

> Performance Lab is the identity. External references are inputs, not the operating center.

## Performance And Lab

The name carries two different jobs that must remain visible together:

- **Performance** contributes speed, exertion, stakes, decisive typography,
  aggressive crops, temporal imagery, and vivid signal color.
- **Lab** contributes instrumentation, prototypes, material studies, technical
  notation, measurement, repeated trials, exploded views, versioning, and
  evidence.
- **The hybrid** pairs visceral campaign energy with rigorous operating proof.
  A surface fails when it becomes only a calm dashboard or only a sports image.

The primary material is working paper: source sheets, folds, scored boundaries,
evidence stacks, and attached receipts. Paper is useful because it makes
provenance, transformation, control, and proof physical. It must never collapse
into decorative stationery, random crumpling, or texture behind type.

Translate the private performance reference into owned workflow meaning:

| Performance reference | CREATE SOMETHING translation |
| --- | --- |
| Athlete under load | Workflow, agent, and operator under operational pressure |
| Engineered performance product | MCP, policy, agent, or workflow as an engineered object |
| Training and testing | Mapping, simulation, evals, dry runs, and gated releases |
| Race or field conditions | Live production work |
| Speed, gait, and material data | Traces, latency, readiness, permissions, and stops |
| Campaign result | Receipt, outcome, recovery, and proof |

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

6. **Campaign energy belongs on campaign surfaces**
   - Homepage, services, editorial, case-study, and social surfaces may use
     original human motion, material studies, kinetic sequences, and hard crops.
   - Product, Atlas, proof, booking, and operator surfaces remain workflow-native:
     maps, traces, policy, readiness, owners, receipts, and recovery.

## Typography Direction

Use the Canon-owned local/system typography stack:

- `--font-performance-sans` and `--font-performance-display` use Arial/Helvetica/system fallbacks for
  product and public-page type.
- `--font-performance-mono` carries workflow state, IDs, files, policies, receipts, and
  timestamps through the platform mono stack.
- `--font-performance-serif` uses Georgia/Times fallbacks when an editorial voice is useful.
- Display scale should feel decisive and campaign-capable on public editorial
  surfaces, while product and operator surfaces stay readable under pressure.
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
5. **Material signature:** use near-black, white, working paper, precise lines,
   mono record labels, and semantic rails. Avoid pill controls, soft candy
   palettes, floating shadows, and ornamental gradients.

Canon exposes this through the Performance state tokens,
`.performance-control-rail`, and `.performance-receipt-stamp`.

| Surface | Direction |
| --- | --- |
| Homepage | Combine the plain offer with one property-specific working-paper state, decisive scale, technical annotation, and integrated proof. |
| Services | Show the workflow as a training and pressure sequence, not only a list of steps. |
| Products | Present Atlas, Signal, Decision, and Proof as a performance system for delegated work. |
| Articles | Combine high-fidelity operating artifacts with an original editorial field or material study when it clarifies pressure, testing, or proof. |
| Atlas and booking | Keep workflow evidence primary; use hierarchy, state, annotation, and motion rather than athlete imagery. |
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
state accents. It is not the entire visual identity: campaign routes also need
shared media, annotation, measurement, and motion primitives rather than a
readiness band repeated between text sections.

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

## Hybrid Rollout

The first implementation slice established the definition, tokens, readiness
band, and representative property rollout. The active hybrid rollout adds:

1. Original, non-branded human-motion and material imagery for campaign routes.
2. Shared Canon compositions for media, annotation, measurement, and semantic motion.
3. A campaign-versus-product boundary verified across homepage, services,
   editorial, products, Atlas, and booking.
4. Desktop, mobile, keyboard, and reduced-motion Browser evidence.

The detailed visual rubric and asset provenance contract live in
`docs/PERFORMANCE_LAB_VISUAL_GRAMMAR.md`.

Whole-page communication follows the separate, executable
[`Performance Page Sharpness`](./PERFORMANCE_PAGE_SHARPNESS.md) contract. The visual
grammar determines how Performance Lab feels; the sharpness contract determines
what each page must communicate, how many top-level roles it may carry, where
proof belongs, and what counts as a complete handoff.
