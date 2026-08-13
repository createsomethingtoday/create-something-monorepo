# Threshold Dwelling Material and Assembly Schedule

**Status:** Rev 0.8 design-intent material contract. It is not a product schedule, specification, estimate, permit document, or construction authorization.

## What this makes exact

`THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE` is the canonical material/assembly contract for the current deterministic massing guide. It binds every Rev 0.8 plan zone and both rendered wall classes to a stable material number and a conceptual assembly.

The exported GLB and local browser massing guide read these bindings directly. They do not assign colors from room type or a separate rendering palette. The browser guide is a Three.js mesh built directly from the current inch-coordinate plan, converted to meter render space only for viewing; it does not import a decorative mesh as an alternate source of dimensions. Its material-study mode generates four procedural client-side recipes for the roles presently bound to geometry: polished concrete, porcelain, architectural concrete, and gypsum/mineral finish. It uses no external image or manufacturer asset. The design hierarchy is concrete as the primary mass, restrained cedar as the protected/tactile accent, and coated steel localized only where engineered glass support and the frame require it. The project continues to maximize useful glazing, but glass and steel remain deferred from this viewer until exact opening and support geometry is issued. The render receipt and client-safe spatial package record the schedule ID and the material IDs actually present in the asset.

| Exact in the current package | Meaning |
| --- | --- |
| Horizontal plan basis | 780 × 504 in; individual Rev 0.8 zones retain their Canon IDs, origins, widths, and depths |
| Render-material identity | Every rendered floor/wall surface resolves to an `M-*` schedule ID |
| Material role and visual token | The GLB's material name, color, and metadata come from the schedule and the Canon palette source |
| Scope quantities | Zone areas and exterior perimeter are arithmetic from the plan only; they are explicitly not procurement quantities |

## What remains deliberately unissued

No material currently has a manufacturer, product, model number, nominal thickness, R-value, U-factor, SHGC, slip-resistance value, or fire rating. A material number such as `M-INT-001` is therefore a stable **role identity**, not a claim that a selected physical product has those properties.

The 9 ft vertical mass is still an illustrative viewer parameter. It is not a wall height, head height, glazing height, structural section, or quantity basis. Openings are linked to the glazing concept but are not yet modeled as panels, frames, sills, heads, or glass area.

## Current role codes

| Code | Design-intent material role | Current render use |
| --- | --- | --- |
| `M-INT-001` | Polished Concrete | Continuous conditioned floor datum outside wet areas |
| `M-INT-002` | Large-Format Porcelain | Laundry and guest-bath floor role |
| `M-ENV-002` | Architectural Concrete | Exterior massing walls / primary opaque mass |
| `M-INT-003` | Gypsum + Mineral Finish | Interior massing walls |
| `M-ENV-001` | Low-E Insulated Glass | Maximize-useful-glazing role linked to plan openings; not yet represented as 3D glazing |
| `M-STR-001`, `M-STR-002` | Reinforced Concrete; Coated Steel | Conceptual substrate and localized glass-support/structure roles; not geometry in the current massing guide |
| `M-ENV-003`, `M-ENV-004` | Formed Metal; Protected Cedar | Envelope/accent roles; not independently represented in the current massing guide |
| `M-INT-004`, `M-INT-005` | Cedar Accent; Durable Casework | Interior roles; not independently represented in the current massing guide |
| `M-EXT-001`, `M-EXT-002` | Concrete Terrace; Decomposed Granite | Site-material roles; not part of the enclosed massing guide |

## Assembly boundary

The schedule currently contains five conceptual assemblies: conditioned polished-concrete floor, wet-area porcelain finish, architectural-concrete exterior envelope, interior partition finish, and glazing concept. Their layer order communicates intent only. Thicknesses and unselected systems are intentionally `null`; the schedule never invents a wall section, waterproofing product, air/water control layer, frame, steel member, connection, insulation value, or glazing unit.

For example, `A-FLR-002` makes the wet-area logic explicit—substrate, unselected waterproofing system, and porcelain finish—while refusing to claim the waterproofing, slope, drain, transition, slip resistance, or maintenance solution is selected.

## Promotion to a physical one-to-one model

The model can claim a physical material is one-to-one only after the responsible project team attaches a revision-specific selected product and properties, maps it to actual geometry, and accepts the relevant professional determinations. At minimum that requires:

1. A coordinated architectural material/finish, wall, door, and window schedule with selected manufacturers, products, thicknesses, details, and locations.
2. Structural, MEP, and energy design that resolves the real wall, roof, slab, glazing, support, opening, and service assemblies.
3. Wet-area waterproofing/slip, glazing safety/egress, solar/shade, air/water, fire/acoustic, durability, and maintenance determinations as applicable.
4. Surveyed site orientation and jurisdictional review for the actual parcel.
5. A new immutable WorkWay revision, regenerated 2D/3D/GLB assets, and a receipt showing the selected schedule revision and asset hash.

Until those conditions are met, the approved uses remain spatial walkthroughs, program comparisons, proposed-change previews, and decision capture—not purchasing, permit submission, field layout, safety certification, or construction.
