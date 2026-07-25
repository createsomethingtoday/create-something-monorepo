# System Context Operating Artifact

> Asset ID: `brand.system-context-operating-artifact.v20260722`
> Owner: CREATE SOMETHING
> Tracking issue: CRE-1393
> Created: 2026-07-22
> Refresh due: 2026-08-21

## Purpose

Editable source briefs for the client-safe system-context experience used inside the existing Map, Control, and Field Report surfaces. These artifacts communicate dependencies, authority, freshness/change, and proof without exposing internal architecture vocabulary.

They are design inputs, not screenshots of a live customer system and not runtime evidence.

## Source contract

- Experience brief: `docs/design/TOPOLOGY_SYSTEM_CONTEXT_EXPERIENCE_V1.md`
- Redacted operating slice: `docs/design/artifacts/template-review-operating-slice.v1.json`
- Public evidence source: `/field-reports/template-review`
- Source status: public worked example
- Private data: none

## Editable source artifacts

| File | Surface | Size | Review status | Notes |
| --- | --- | --- | --- | --- |
| `source/control-system-context--desktop--v20260722.svg` | `/control` | 1440 x 900 | implementation brief | Complete interactive artifact at desktop width. |
| `source/control-system-context--mobile--v20260722.svg` | `/control` | 390 x 844 | implementation brief | Stacked graph, inspector, and receipt rail. |
| `source/map-system-context-rail--v20260722.svg` | `/map` | 1200 x 420 | implementation brief | Context inside the editor; no second graph. |
| `source/field-report-system-context-delta--v20260722.svg` | `/field-reports/template-review` | 1200 x 520 | implementation brief | Read-only change and proof adaptation. |

## Visual rules

- Light workspace canvas, layered panels, thin rules, compact metadata.
- Exact DOM text remains editable; no generated text is baked into campaign imagery.
- Red is reserved for stop; green is reserved for explicit verified/run; blue indicates focus/review.
- Dotted relationships mean derived or advisory; solid relationships mean declared workflow handoff.
- Every state includes a text label; color is never the only signal.
- No glowing AI atmosphere, decorative circuits, fake telemetry, or private system labels.

## Rights and provenance

- Authored by CREATE SOMETHING as deterministic SVG source briefs.
- Based on the public Template Review Field Report and repo-owned visual language.
- No third-party screenshot, mark, private client record, credential, or proprietary interface is included.
- The SVG files may be used for design review and implementation comparison. They are not automatically approved publication exports.

## Review gate

- [x] Map -> Build -> Control remains the public product family.
- [x] Public labels avoid internal architecture vocabulary.
- [x] Dependencies, authority, freshness/change, proof, owner, and recovery are visible.
- [x] Run, wait, and stop have explicit text labels.
- [x] Desktop and mobile information hierarchy is defined.
- [x] Empty, stale, unknown, error, and redacted behavior is specified in the experience brief.
- [x] Source and refresh dates are recorded.
- [ ] Final implementation compared against browser screenshots.
- [ ] Live production readback approved after deployment.
