# Agency Performance Lab — Bench Water

> Asset ID: `brand.agency-performance-lab-bench-water.v20260725`
> Owner: CREATE SOMETHING
> Brief written: 2026-07-25
> Status: **brief only — not yet generated, not yet reviewed, not yet in production**
> Supersedes scale direction in: `brand.agency-performance-lab-natural-water.v20260710`

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

## Planned exports

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

Hashes, final dimensions, and file paths are recorded after generation and inspection. They are
deliberately absent from this record because no asset exists yet.

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

Pending generation. Before any asset here enters production it must satisfy:

- [ ] Original 1536 x 1024 output inspected at original resolution.
- [ ] Mobile 819 x 1024 hard crop inspected individually.
- [ ] Measuring apparatus legible in both crops.
- [ ] No typography, logo, watermark, interface overlay, or third-party mark.
- [ ] No people, hands, or likeness in frame.
- [ ] No blue or cyan anywhere except the applied dye filament on `trace-dye-injection`.
- [ ] Dye reads as a contained filament, not a wash, tint, glow, or background.
- [ ] Physical water behavior reads naturally at both crops.
- [ ] The named condition is the subject and is legible without a caption.
- [ ] Assigned to at most one public surface family.
- [ ] Desktop crop preserves negative space for campaign copy.

## Rights and use

Original generated work. No third-party mark, athlete likeness, sportswear silhouette, trade dress,
campaign language, layout, or font is copied or approximated. No reference image is copied into any
asset. Water photography is never presented as evidence of a real workflow run; it is an
explanatory material study.

## Refresh condition

Replace when either the water grammar changes a device definition, or a production surface needs a
condition none of the eight devices covers. Do not refresh for visual novelty alone.
