# System Context Experience v1

Status: implementation brief
Owner: CREATE SOMETHING
Linear: CRE-1393
Last reviewed: 2026-07-23
Refresh due: 2026-08-21

## Decision

Keep `Map -> Build -> Control` as the public product structure. Improve the internal Topology contract, but present its client-safe consequence as **system context** inside Map, Control, and evidence surfaces.

Do not create a Topology product, route, navigation item, CTA, or public technical explainer. Internal names are useful to operators and agents; they are not required for a visitor to trust the system.

## Experience outcome

A visitor should answer five questions without understanding the implementation:

1. What workflow am I looking at?
2. What does it depend on?
3. What can run, what waits for a person, and what must stop?
4. What changed and when was this context last checked?
5. What evidence proves the current state?

The artifact should feel like an issued operating object: calm, exact, source-bound, and useful under pressure. It is not a decorative network diagram or an abstract claim of AI sophistication.

## Public information hierarchy

1. **Workflow** — plain-language workflow name and boundary.
2. **Current state** — one short sentence describing the operating consequence.
3. **Lens** — Dependencies, Authority, Change, or Proof.
4. **Operating slice** — a bounded six-to-twelve-record projection.
5. **Inspector** — selected record meaning, state, owner, freshness, and evidence.
6. **Receipt rail** — source, last checked, change summary, and recovery.

The graph is subordinate to the questions. The inspector and receipt rail must remain useful when the graph is unavailable or motion is disabled.

## Public vocabulary

Use:

- system context
- workflow
- dependency
- owner
- run / wait / stop
- last checked
- current / stale / unknown
- changed since
- evidence
- proof
- recovery

Keep out of visitor-facing copy when it adds cognitive load:

- Topology
- Atlas
- Substrate
- canvas kernel or renderer backend
- node and edge counts as marketing proof
- graph compute weights
- package paths, internal IDs, issue IDs, worker names, or private client labels

These terms may remain in source, authenticated operator tooling, diagnostics, tests, and evidence packets.

## Contract semantics

| Dimension | Public question | Values | Rule |
| --- | --- | --- | --- |
| Coverage | Is the record represented? | mapped, partial, missing | Coverage never grants authority. |
| Verification | Was the claim checked? | verified, declared, unverified | Only explicit evidence can produce verified. |
| Health | Is the dependency operating? | healthy, degraded, unavailable, unknown | Unknown must not look healthy. |
| Authority | May work proceed? | run, wait, stop, unknown | Derived from an explicit policy or owner decision, never coverage. |
| Proof | Is supporting evidence attached? | attached, missing, not-required, unknown | Proof includes a public-safe source label and checked time. |
| Provenance | Where did the claim come from? | observed, derived, declared | Derived claims must explain the derivation. |
| Freshness | How current is it? | current, stale, unknown | Freshness carries checked and review-by times. |
| Change | What differs from the approved comparison? | added, changed, removed, unchanged, unknown | Change requires a comparison reference. |

Heuristic cost, latency, trust, confidence, reliability, and impact weights are internal estimates. They must be labeled `derived` and remain outside client-safe projections unless a public explanation and source are explicitly approved.

## Shared operating slice

The design source is `docs/design/artifacts/template-review-operating-slice.v1.json`. It is based on the public Template Review Field Report and contains no private client or account data.

The first slice contains:

- review queue owner
- submitted asset packet
- validation checks
- reviewer brief
- reviewer decision
- no ungrounded approval stop
- evidence packet
- recovery path

This is a worked example, not a live customer workspace. The UI must say so.

## Route placement

### Control

Control receives the complete interactive artifact in its existing Foundation scene. The current internal foundation receipt is replaced by a visitor-facing operating proof object.

Headline: **See what live operation depends on.**

Supporting line: **Follow the source, the decision boundary, the latest change, and the evidence that remains.**

Default lens: Authority. The first read should make the human decision and stop condition obvious.

### Map

Map must not add another graph-reading moment. Remove the separate story-before-editor chapter. Reuse the operating-slice contract as context inside the existing editable experience:

- a compact context rail above the editor;
- a worked-example starter loaded only when the visitor chooses it;
- the prospect boundary stays `no production tools`;
- selected integration context may update the rail without claiming a live connection.

The public editor remains the only graph on the route.

### Template Review Field Report

Use a read-only Change/Proof adaptation after the Result/Boundary section. It should show the evidence-preparation lane moving from an unstructured handoff to a bounded packet while official judgment remains human.

The artifact supports the report; it does not turn the report into a product demo.

### Homepage

No new component in v1. The existing homepage proof object remains unchanged until the shared projection is proven on Control, Map, and the field report. A later migration may replace its hand-authored data without changing the public story.

## Desktop anatomy

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ SYSTEM CONTEXT         Template review       Last checked Jul 22 · current │
│ Evidence can move. Official judgment remains with the reviewer.             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Dependencies     [Authority]     Change     Proof                            │
├──────────────────────────────────────────────┬──────────────────────────────┤
│                                              │ REVIEWER DECISION            │
│  Source → Checks → Brief ─┐                  │ State      WAIT              │
│                           ├→ Decision         │ Owner      Human reviewer    │
│                 Stop ─────┘    ↓              │ Freshness  Current           │
│                               Evidence       │ Evidence   Dated report       │
│                                  ↓           │ Why        Judgment retained │
│                               Recovery       │                              │
├──────────────────────────────────────────────┴──────────────────────────────┤
│ Source: public field report · Changed: packet preparation bounded · Recover │
└─────────────────────────────────────────────────────────────────────────────┘
```

The graph and inspector use a `minmax(0, 1.65fr) minmax(18rem, .75fr)` split. The graph surface remains at least 30rem tall. Controls use real buttons with selected state, not clickable text.

## Mobile anatomy

```text
┌──────────────────────────────────┐
│ SYSTEM CONTEXT                   │
│ Template review                  │
│ Last checked Jul 22 · current    │
├──────────────────────────────────┤
│ [Dependencies] [Authority]       │
│ [Change]       [Proof]           │
├──────────────────────────────────┤
│ bounded graph / focused slice    │
├──────────────────────────────────┤
│ selected record inspector        │
│ state · owner · freshness        │
│ evidence · explanation           │
├──────────────────────────────────┤
│ source · change · recovery       │
└──────────────────────────────────┘
```

The inspector moves below the graph. Lens buttons form a two-column grid. The graph uses the mobile projection rather than horizontal scrolling. The receipt rail becomes a vertical definition list.

The existing editable Map remains the one exception because it is the working canvas, not a second system-context graph. At the mobile verifier width, `Fit view` must zoom far enough to show the complete bounded workflow inside the canvas without creating horizontal page overflow. That fitted state is an overview; the existing zoom controls return the canvas to a readable editing scale.

## Interaction states

### Dependencies

Show the full bounded slice and directional handoffs. Inspector explains what the selected record needs upstream and enables downstream.

### Authority

Emphasize run, wait, and stop records. De-emphasize neutral context but keep it visible. Default selection is the human decision record.

### Change

Emphasize added, changed, and removed records. Unchanged context remains visible at reduced emphasis. Inspector names the approved comparison and plain-language change.

### Proof

Emphasize evidence, receipts, and recovery. Selecting `Trace proof` focuses the source-to-evidence path; it does not imply that a workflow action ran in the browser.

### Selection and reset

- Selecting a record updates the inspector and preserves the active lens.
- `Fit view` restores the bounded slice.
- `Reset focus` returns to the lens default.
- The URL does not change for visual focus state.

## Empty, stale, unknown, and error states

| State | Required copy | Behavior |
| --- | --- | --- |
| Empty | No system context yet. Map the owner, boundary, and proof first. | Show CTA to the existing Map surface; no empty graph chrome. |
| Stale | Last checked on {date}. Review before relying on this context. | Amber/review treatment; authority remains explicit but not promoted as current. |
| Unknown | Current state has not been verified. | Neutral treatment; never substitute run or healthy. |
| Error | System context could not be loaded. The workflow definition is still available. | Preserve route content and recovery link; no blank section. |
| Redacted | Some implementation details are hidden in this public example. | Keep relationships and public labels; omit identifiers rather than masking with fake data. |

## Accessibility

- Wrap the component in a labelled `section` with a concise description.
- Lens controls use buttons and `aria-pressed`.
- The graph has a text alternative listing records and relationships.
- Every selectable record has an accessible name including label and authority.
- Inspector updates use `aria-live="polite"` without moving focus.
- Keyboard: Tab enters controls and records; Enter/Space selects; Escape resets record focus.
- Do not encode run/wait/stop, freshness, or change by color alone.
- Respect `prefers-reduced-motion`; focus changes use opacity and stroke without camera animation.
- Preserve a logical mobile DOM order: heading, controls, graph alternative, inspector, receipts.

## Visual language

- Light workspace canvas and layered white panels.
- Subtle line grid, restrained shadow, compact mono metadata.
- Black/ink for structure, blue for focus/review, red only for stop, green only for explicit verified/run evidence.
- Dotted connectors for derived or advisory relationships; solid connectors for declared workflow handoffs.
- Status rings and labels remain quiet. No glowing AI atmosphere, decorative circuitry, or fake monitoring data.

Editable visual briefs live under `packages/agency/content/assets/brand/system-context-operating-artifact.v20260722/source/`. They are design inputs, not production screenshots or runtime proof.

## Analogy-to-visual rule

Written operating analogies should resolve into one reusable visual grammar instead of separate decorative illustrations:

- `Map -> Build -> Control` is the outer journey and remains the only product structure.
- Map owns the one editable workflow canvas.
- Control owns the `Signal -> Decision -> Proof` operating loop and the shared system-context artifact.
- Dependencies, Authority, Change, and Proof are views over that artifact, not new products or additional graphs.
- Owner, evidence, freshness, and recovery remain attached to the selected operating record.

The v1 route work keeps this grammar inside the existing Map canvas, Control artifact, and field-report adaptation. Moving a compact schematic earlier in the wider `.agency` story is a follow-on design decision after this exact experience is promoted; it must reuse the grammar above and must not introduce internal architecture vocabulary or decorative AI imagery.

## Redaction policy

Public projection removes:

- internal paths and package names
- database, account, environment, and tenant identifiers
- private client labels
- secret or credential references
- Linear or deployment identifiers
- raw policy text that exposes internal controls

Public projection retains:

- safe workflow labels
- relationship meaning
- authority and owner role
- public evidence title and date
- current/stale/unknown state
- public recovery description

If a safe label cannot be derived without inventing meaning, omit the record.

## Deep-module review

Concept: Client-safe operating slice

Current interface: Database Layer exposes generated topology and Atlas artifacts; `.agency` separately authors public graph fixtures and route copy.

Problem: Callers must know how `mapped` becomes presentation status, which internal fields are safe, how freshness is inferred, and how a route should explain the graph. The result is semantic leakage and repeated route-level judgment.

Proposed interface: `projectOperatingSlice(source, options)` returns a renderer-neutral, audience-aware contract with explicit semantics, bounded lenses, redacted labels, and public receipts.

Tier ownership: Database owns records/provenance; Automation owns deterministic projection; Judgment owns audience/redaction policy and authority interpretation.

Leverage: One interface feeds Control, Map context, field-report evidence, browser readback, and future client overlays.

Locality: Semantic or redaction fixes occur in the projection module rather than every route and component.

Test surface: Contract tests invoke `projectOperatingSlice`; Agency tests render its result through the shared component; browser checks exercise the same public output.

Migration: Keep internal topology and Atlas compatibility artifacts. Migrate the three reviewed `.agency` surfaces. Roll back by restoring the previous route artifacts without changing source records.

### Deletion test

Deleting the proposed projection would force each caller to reconstruct redaction, freshness, authority, lenses, and proof semantics. The module therefore concentrates real complexity and earns its boundary.

## Review and promotion

1. Approve this brief and its visual/source artifacts as the implementation baseline.
2. Implement semantic separation and contract tests in Database Layer.
3. Implement the shared renderer adapter in Agency using the existing canvas kernel.
4. Compare local desktop/mobile route captures to the source briefs.
5. Promote only after exact-head review, CI, production deploy, and live browser proof.

Rollback restores the prior route components and leaves additive contract types unused. No source data or customer state is destroyed.
