# Agency Performance Lab — Natural Water

> Asset ID: `brand.agency-performance-lab-natural-water.v20260710`
> Owner: CREATE SOMETHING
> Generated: 2026-07-10
> Tracking issue: CRE-1183

## Direction

This library replaces the staged acrylic-apparatus photography with natural, full-scale water
events. Water remains the kinetic campaign material, but the operating condition is the subject:
flow is routed, pressure meets a boundary, and action leaves a trace.

The user-supplied water-system board was used only to articulate general traits. It was not passed
to the image model, copied, traced, or used as an image input.

## Selected originals

| File | Condition | Model | Review status |
| --- | --- | --- | --- |
| `exports/performance-lab-controlled-flow-natural--v20260710.png` | FLOW / DIRECTION | `gpt-image-1.5` | approved after original-resolution inspection |
| `exports/performance-lab-pressure-boundary-natural--v20260710.png` | PRESSURE / BOUNDARY | `gpt-image-1.5` | approved after original-resolution inspection |
| `exports/performance-lab-trace-wake-natural--v20260710.png` | TRACE / PROOF | `gpt-image-1.5` | approved after original-resolution inspection |

Exact structured prompts and generation flags are preserved in
`source/generation-prompts--v20260710.jsonl`.

## Responsive exports

| File | Crop | Size | Recommended role |
| --- | --- | --- | --- |
| `static/images/performance-lab/controlled-flow-natural.webp` | Full 3:2 | 1536 x 1024 | Controlled flow desktop |
| `static/images/performance-lab/controlled-flow-natural-mobile.webp` | Right 4:5 | 819 x 1024 | Controlled flow mobile |
| `static/images/performance-lab/pressure-boundary-natural.webp` | Full 3:2 | 1536 x 1024 | Pressure/boundary desktop |
| `static/images/performance-lab/pressure-boundary-natural-mobile.webp` | Center-right 4:5 | 819 x 1024 | Pressure/boundary mobile |
| `static/images/performance-lab/trace-wake-natural.webp` | Full 3:2 | 1536 x 1024 | Trace/wake desktop |
| `static/images/performance-lab/trace-wake-natural-mobile.webp` | Center 4:5 | 819 x 1024 | Trace/wake mobile |

## Production slot mapping

| Existing role | Recommended replacement | Current `.agency` consumers | Shared Canon overlay |
| --- | --- | --- | --- |
| `controlled-flow` | `controlled-flow-natural` | `/products`, `/dify/mcp-control-plane` field study | `.space` opening via `controlledFlowMedia` |
| `pressure-boundary` | `pressure-boundary-natural` | `/`, `/services`, `/book` | `.ltd` opening via `pressureBoundaryMedia` |
| `trace-control-plane` | `trace-wake-natural` | `/services`, `/atlas`, `/dify/mcp-control-plane` | `.io` and `.learn` openings via `traceControlPlaneMedia` |

The static assets use new cache-safe names. Integration should update each role atomically across
the `.agency` callers and the corresponding Canon media overlay rather than allowing properties to
drift onto different generations.

## Inspection record

- [x] Original 1536 x 1024 outputs inspected at original resolution.
- [x] Mobile 819 x 1024 hard crops inspected individually.
- [x] Physical water behavior reads naturally at both crops.
- [x] No blue/cyan cast, typography, logo, watermark, interface overlay, or third-party mark.
- [x] Controlled flow retains the concrete lane and directional turbulence.
- [x] Pressure boundary retains the impact, visible boundary, and protected downstream side.
- [x] Trace retains the source craft, direction, and persistent wake.

## Rights and use

- Generated from CREATE SOMETHING-authored prompts with the bundled OpenAI Imagegen workflow.
- No external image was uploaded as a generation or editing input.
- The imagery is illustrative campaign material, not documentary evidence of a CREATE SOMETHING
  system run.
- Exact copy, state labels, and proof data must remain in the editable design layer, not inside the
  photographs.
