# Performance Lab Water Asset Briefs

> Status: active brief; assets not yet generated
> Written: 2026-07-25
> Owner: CREATE SOMETHING
> Asset package: `packages/agency/content/assets/brand/agency-performance-lab-bench-water.v20260725/`

## Why this exists

A 2026-07-25 review of the shipped water library found the material identity is sound but
under-built and repetitive. The metaphor is not the problem. Coverage and camera distance are.

Two defects:

1. **Scale.** Every production water image is aerial or landscape. Seven of thirteen alt strings
   begin with "Aerial". This carries the Performance half of Performance Lab and none of the Lab
   half, and it cannot depict accountability.
2. **Coverage.** The grammar defines eight devices; four are built. The missing four — clarity,
   turbulence, settlement, dye trace — are precisely the devices that carry inspection, exception,
   resolution, and provenance. They are the Judgment tier, which is the product.

A third finding is a usage problem rather than an asset gap: `trace-wake-natural` appears in seven
`.agency` routes plus a shared Canon overlay. The audit requires water photography to "describe a
condition, never as a generic environmental backdrop." One photograph cannot describe a specific
condition on seven unrelated pages. Reuse is the main reason the imagery currently reads as
decoration.

## Direction

Shoot water as an experiment, not as landscape. The measuring apparatus must be visible in frame.

Bench scale also closes the operator gap without breaking a boundary. Water has no intent and
cannot show a decision, an approver, or an owner. Putting a person in frame would reintroduce the
likeness exposure that water was chosen to avoid. A graduated tank wall, datum line, gauge, or dye
port implies an operator by inference — the instrument is the human.

Full scale rule and the dye-trace signature device are now contracted in
`docs/PERFORMANCE_LAB_VISUAL_GRAMMAR.md` under *Material identity: controlled water*.

## The four briefs

| Asset | Device | Condition | Proof requirement |
| --- | --- | --- | --- |
| `trace-dye-injection` | Dye trace | CORRELATION / PROVENANCE | Injection point, marker, persistence downstream |
| `turbulence-exception` | Turbulence | EXCEPTION / AMBIGUITY | Bounded disturbance read against a gauge |
| `clarity-inspection` | Clarity | INSPECTABLE CONDITIONS | Scale legible through the water column |
| `settlement-resolved` | Settlement | RESOLVED STATE | Level line at datum plus residue mark of prior height |

Visual family: `material-prototype-study`. Structured prompts, palette constraints, negatives, and
sizes are in `source/generation-prompts--v20260725.jsonl`, validated against the v20260710 schema.

Build `trace-dye-injection` first. It is the signature device, it absorbs the most misused existing
asset, and it is the only one with a post-production step to prove out.

## Dye and the color doctrine

The palette bans blue and cyan. Dye appears to conflict with that; it does not, if produced
correctly.

Generate monochrome with a *tonally* distinct dye — dark dye in bright water — keeping the no-blue
constraint intact. Apply signal cobalt `#0048ff` to the filament only, as a controlled spot, in
export. Image models bleed a requested hue across the whole frame; a generated single blue filament
in a black-and-white scene will not hold.

The outcome is stronger than the shortcut. The only color in the frame is the injected marker, in
the same value used for controlled state. Color becomes diegetic — present because the experiment
put it there, not because the layout wanted an accent.

Hard limit: a filament, not a wash. If the cobalt reads as gradient, tint, glow, or background, the
export is rejected.

## Reuse retirement plan

Apply only after each asset is generated, inspected, and approved. Shared Canon overlays must be
updated atomically with their `.agency` callers.

| Route | Current | Target | Reason |
| --- | --- | --- | --- |
| `/proof/marketplace-workflow` | `trace-wake-natural` | `trace-dye-injection` | Claim is provenance |
| `/delivery` | `trace-wake-natural` | `settlement-resolved` | Claim is a closed handoff |
| `/products/loom` | `trace-wake-natural` | `trace-dye-injection` | Claim is correlation across agents |
| `/map` | `trace-wake-natural` | `clarity-inspection` | Claim is legibility |
| `/field-reports/template-review` | `trace-wake-natural` | keep | Genuine trace-after-action claim |
| `/services` | `trace-wake-natural` | `turbulence-exception` | Claim is handling real conditions |
| `/dify/mcp-control-plane` | `trace-wake-natural` | keep | Page copy is literally about wake |
| `/control` | `product-system-natural` | `turbulence-exception` | Page now leads on the exception condition |

`canon/.../media/trace-control-plane.ts` is the shared overlay for `.io` and `.learn`. Leave it on
`trace-wake-natural` until those properties are reviewed separately; changing it silently changes
two other properties.

After this plan lands, no water asset should appear in more than two public surface families.

## Acceptance

An asset enters production only when the inspection record in the package metadata is fully
checked, including: apparatus legible at both crops, no people or hands, no readable numerals, no
blue outside the dye filament, and the named condition legible without a caption.

Nothing ships because it looks technical or fluid. Every element must signal a condition, support a
decision, direct flow, or leave proof.
