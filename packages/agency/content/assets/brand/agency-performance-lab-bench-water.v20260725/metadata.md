# Agency Performance Lab — Bench Water

> Asset ID: `brand.agency-performance-lab-bench-water.v20260725`
> Owner: CREATE SOMETHING
> Brief written: 2026-07-25
> Status: **published on assigned public surfaces**
> Supersedes scale direction in: `brand.agency-performance-lab-natural-water.v20260710`
> Generated and inspected: 2026-07-30
> Tracking: `CRE-1514`, `CRE-1526`

## Direction

The v20260710 library established natural, full-scale water events shot from high oblique aerial
angles. That library is approved and stays in production. This package corrects two defects it
exposed.

**Defect 1 — scale.** Every shipped water image is aerial or landscape scale: rivers, dam
structures, survey craft, sluices seen from above. Seven of thirteen production alt strings begin
with "Aerial". Aerial water carries the Performance half of the identity and none of the Lab half,
and it cannot show that anyone is accountable for the flow. Water at landscape distance is nature
spectacle; the design language fails a surface that becomes "only a calm dashboard or only a sports
image."

**Defect 2 — coverage.** The water grammar defines eight devices. Four are built. The four missing
ones — clarity, turbulence, settlement, and dye trace — are the devices that carry inspection,
exception, resolution, and provenance. They are the Judgment tier. Their absence is why campaign
sequences currently end on evidence-of-what-happened rather than on a resolved state.

This package briefs the four missing devices at bench scale, with the measuring apparatus visible
in frame.

## The operator problem, and how bench scale solves it

Water has no intent. It cannot depict a decision, an approver, or an owner — and the offer is
governed delegation. The foundation audit treats non-anthropomorphism as a feature, and it is one,
but it left the material layer unable to show authority at all.

Putting a person in frame would break the boundary and reintroduce the likeness exposure that water
was chosen to avoid. Bench scale solves it without a person: a graduated tank wall, a datum line, a
gauge, a dye port, or a clamped rig implies an operator by inference. The instrument is the human.

This is not a new metaphor. It is the Lab half of Performance Lab, which the design language
already requires to remain visible alongside the Performance half.

## Briefs

| Asset | Device | Condition | Target surface family |
| --- | --- | --- | --- |
| `trace-dye-injection` | Dye trace | CORRELATION / PROVENANCE | Proof, delivery, field reports |
| `turbulence-exception` | Turbulence | EXCEPTION / AMBIGUITY | Control, decision |
| `clarity-inspection` | Clarity | INSPECTABLE CONDITIONS | Map, atlas |
| `settlement-resolved` | Settlement | RESOLVED STATE | Conversion handoff, proof close |

Visual family for all four: `material-prototype-study`.

Exact structured prompts and generation flags are in
`source/generation-prompts--v20260725.jsonl`, matching the v20260710 record format.

### `trace-dye-injection` — signature device

The primary device in the system. In hydraulic engineering, dye is injected to make invisible flow
observable and measurable. That is a literal statement of the product: inject an observable marker
so delegated work leaves an inspectable trace.

Proof requirement: correlation. The frame must show the injection point, the marker, and the
persistence of the marker downstream of it — origin, identity, and history in one image.

This asset takes priority over `trace-wake-natural` for any claim about evidence, correlation,
provenance, or run history. `trace-wake-natural` currently appears in ten files; this asset is
intended to absorb the majority of that usage so a single photograph stops standing in for
unrelated conditions.

### Dye and the color doctrine

The palette rule bans blue and cyan because AI-blue is a cliché and the semantic layer must stay
thin. Dye appears to conflict with that. It does not, if produced correctly.

**Generate monochrome. Apply the marker in post.** Image models bleed a requested hue across the
whole frame; a generated "single blue filament in a black-and-white scene" will not hold. The
generation prompt therefore specifies a *tonally* distinct dye — dark dye in bright water — with
the standard no-blue constraint intact. The signal cobalt `#0048ff` is then applied to that
filament only, as a controlled spot, during export.

The result is the intended outcome and a stronger one: the only color in the frame is the injected
marker, in the same value used for controlled state. Color becomes diegetic. It is present because
the experiment put it there, not because the layout wanted an accent.

Hard limit: a filament, not a wash. If the cobalt reads as a gradient, tint, glow, or background,
the export is rejected.

## Accepted exports

Dimensions match the v20260710 responsive contract.

| File | Crop | Size | Role |
| --- | --- | --- | --- |
| `static/images/performance-lab/trace-dye-injection.webp` | Full 3:2 | 1536 x 1024 | Desktop |
| `static/images/performance-lab/trace-dye-injection-mobile.webp` | 4:5 hard crop on injection point | 819 x 1024 | Mobile |
| `static/images/performance-lab/turbulence-exception.webp` | Full 3:2 | 1536 x 1024 | Desktop |
| `static/images/performance-lab/turbulence-exception-mobile.webp` | 4:5 hard crop on vortex | 819 x 1024 | Mobile |
| `static/images/performance-lab/clarity-inspection.webp` | Full 3:2 | 1536 x 1024 | Desktop |
| `static/images/performance-lab/clarity-inspection-mobile.webp` | 4:5 hard crop on datum line | 819 x 1024 | Mobile |
| `static/images/performance-lab/settlement-resolved.webp` | Full 3:2 | 1536 x 1024 | Desktop |
| `static/images/performance-lab/settlement-resolved-mobile.webp` | 4:5 hard crop on level line | 819 x 1024 | Mobile |

The PNG files under `exports/` are the accepted full-resolution generation masters. Responsive
WebP files under `packages/agency/static/images/performance-lab/` are the public-surface exports.

| Accepted master | Dimensions | SHA-256 |
| --- | --- | --- |
| `exports/trace-dye-injection.png` | 1536 x 1024 | `d5d6a773c6ad4b0292f6ffcb750c8fe86f1d3f72fd05fef7f41c2e86be840e78` |
| `exports/turbulence-exception.png` | 1536 x 1024 | `70e8303fa79e53bdf2da80e22996dfa5b93b24de4c2a00a5ee9b6d19835d38db` |
| `exports/clarity-inspection.png` | 1536 x 1024 | `b33812d935f44d52582676d979e30062a1fc097890ef0125d0f81f1e7cf8b8d0` |
| `exports/settlement-resolved.png` | 1536 x 1024 | `04674ef4ac4f736ea52f1fcc3a8ef2e3010102b4b16907a9ea3bbbe8d3f66672` |

| Responsive export | Dimensions | SHA-256 |
| --- | --- | --- |
| `static/images/performance-lab/trace-dye-injection.webp` | 1536 x 1024 | `eae7dd924d7e46edb6466bd6b284b71a726d191af26fcfb9199cb6c98e5708f9` |
| `static/images/performance-lab/trace-dye-injection-mobile.webp` | 819 x 1024 | `d1ca76bd5058e40ec09cc557930ab1fa6e315c6cc6a86f52230401a47f583a73` |
| `static/images/performance-lab/turbulence-exception.webp` | 1536 x 1024 | `34769875070521ab611425476ef2375a0d3dff8def34de2bfdbd684197f76447` |
| `static/images/performance-lab/turbulence-exception-mobile.webp` | 819 x 1024 | `64bf95b617c0eb3de912ef55364d921dd609fdcc13aaf312d58bd37c865130b1` |
| `static/images/performance-lab/clarity-inspection.webp` | 1536 x 1024 | `cc4cb69ac5e1e40850d50a9c2a493cff9dfa73065a209895f1042b2fe8272f93` |
| `static/images/performance-lab/clarity-inspection-mobile.webp` | 819 x 1024 | `2f411e97cc5076969cbb0b215d509f49cdb69d11c804eb6860281387d8003fad` |
| `static/images/performance-lab/settlement-resolved.webp` | 1536 x 1024 | `ba45de2aceaca54e14c5486c2ffe11db60a8c23fab726a6e16b70dc01b3990cf` |
| `static/images/performance-lab/settlement-resolved-mobile.webp` | 819 x 1024 | `ff248ca0c95a2b4af34543778016f5dee8fe24e3ebe58ae861e7a9d4a101e0ca` |

## Assignment and accessible descriptions

| Study | Condition | Public surface families | Alt text |
| --- | --- | --- | --- |
| `trace-dye-injection` | Provenance / correlation | `/proof/marketplace-workflow`, `/products/loom` | A cobalt tracer filament persisting downstream from an injection port in a measured glass water channel |
| `turbulence-exception` | Exception / ambiguity | `/services`, `/control` | A bounded laboratory vortex held beside a gauge rod and steel baffle for exception inspection |
| `clarity-inspection` | Inspectable conditions | `/map`, `/products` | A calibration scale and datum line remaining legible through still water in a glass inspection rig |
| `settlement-resolved` | Resolved state | `/delivery` | Still water settled at a datum line with a residue mark recording the basin's earlier level |

`/field-reports/template-review` and `/dify/mcp-control-plane` retain `trace-wake-natural` because
their claims are genuinely about a trace left after movement. Canon's shared control-plane study
also stays unchanged for the separately governed `.io` and `.learn` consumers.

## Reference packet

Adopt: the v20260710 monochrome documentary treatment, film grain, physical and unstaged framing,
graphite/silver tonality, and the discipline that the operating condition — not the water — is the
subject.

Change: camera distance and the presence of measuring apparatus. v20260710 explicitly negatived
"tabletop apparatus" and "acrylic boxes" in pursuit of full-scale realism. That negative is the
direct cause of the aerial-only library. This package permits and requires laboratory apparatus,
while keeping the "no miniature, no staged studio set" intent by specifying real, working,
weathered test facilities rather than clean product-shot rigs.

Do not copy: no reference image is passed to the model, traced, or used as an image input. The
private Nike reference packet is not an input to any brief in this package.

## Inspection record

- [x] Original 1536 x 1024 output inspected at original resolution.
- [x] Mobile 819 x 1024 hard crop inspected individually.
- [x] Measuring apparatus legible in both crops.
- [x] No typography, logo, watermark, interface overlay, or third-party mark.
- [x] No people, hands, or likeness in frame.
- [x] No blue or cyan anywhere except the applied dye filament on `trace-dye-injection`.
- [x] Dye reads as a contained filament, not a wash, tint, glow, or background.
- [x] Physical water behavior reads naturally at both crops.
- [x] The named condition is the subject and is legible without a caption.
- [x] Assigned to at most two public surface families.
- [x] Desktop crop preserves negative space for campaign copy.

Original and crop decisions:

- `trace-dye-injection`: injection port, machined scale, origin, and persistent downstream filament
  remain legible in both crops. The final cobalt pass confines `#0048ff` to the filament.
- `turbulence-exception`: the bounded vortex, baffle, and gauge remain together in both crops; the
  disturbance reads as measured rather than catastrophic.
- `clarity-inspection`: the datum, scale marks, refraction, and droplets remain legible without
  resolving into fake numerals or words.
- `settlement-resolved`: the full frame holds the closed gate; the mobile hard crop prioritizes the
  current datum and prior residue line, which are the named resolved-state proof.

Rejected and intermediate variants:

- The first dye-trace generation was rejected because warm brass remained visible outside the
  monochrome doctrine.
- A fully monochrome dye-trace edit was accepted as the color-safe master condition, then used only
  as an intermediate for the controlled cobalt filament pass.
- No rejected or intermediate variant was copied into `exports/` or `static/`.

## Rights and use

Original generated work. No third-party mark, athlete likeness, sportswear silhouette, trade dress,
campaign language, layout, or font is copied or approximated. No reference image is copied into any
asset. Water photography is never presented as evidence of a real workflow run; it is an
explanatory material study.

## Refresh condition

Replace when either the water grammar changes a device definition, or a production surface needs a
condition none of the eight devices covers. Do not refresh for visual novelty alone.
