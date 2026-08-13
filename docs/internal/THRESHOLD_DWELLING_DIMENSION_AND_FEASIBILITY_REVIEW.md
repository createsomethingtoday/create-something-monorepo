# Threshold Dwelling: Dimension and Feasibility Review

**Status:** design-intent candidate only — blocked from construction, code, survey, permit, or safety certification.

**Purpose:** establish a deterministic baseline from the existing rendered concept so WorkWay can reason about the project without inventing geometry. This is a review of what the rendering does and does not prove; it is not architectural, engineering, legal, or code advice.

## What is exact in this candidate

The source of truth is `THRESHOLD_DWELLING_DIMENSION_CANDIDATE` in Canon. It uses inches with the northwest exterior plan datum as `(0, 0)`. The existing rendered floor plan is the visual source for this baseline.

| Measure | Candidate value | Confidence |
| --- | ---: | --- |
| Enclosed rectangle | 65 ft × 42 ft | Exact within the rendered coordinate system |
| Enclosed geometric area | 2,730 sq ft | Derived: 65 × 42 |
| Exterior geometric perimeter | 214 ft | Derived: 2 × (65 + 42) |
| Named plan zones | 2,660 sq ft | Exact arithmetic; not a net-area schedule |
| Unclassified enclosed band | 70 sq ft | Exact arithmetic; east 10 ft × 7 ft band |
| Plan doors | 13, all drawn as 36 in openings | Plan opening only, not a measured clear opening |
| Plan windows | 9 | Width and position only; no sill, head, operation, glass, or performance data |
| East projection | dog kennel 10 × 6 ft; carport 10 × 7 ft; covered entry 10 × 14 ft | Approved as one 10 × 27 ft projection |

No wall thickness, finish buildup, survey datum, structural grid, elevation benchmark, or site boundary is present. Accordingly, `65 ft × 42 ft` is a **concept-envelope dimension**, not a field, permitting, or construction dimension.

## Approved decision

The project owner selected the **10 ft × 27 ft east projection** as the current design-intent envelope. Its dog-kennel, carport, and covered-entry segments are respectively 10 × 6 ft, 10 × 7 ft, and 10 × 14 ft. The floor plan, light study, section/roof/site geometry, cost allowance, and render pipeline now use that envelope. This is revision 0.4 of the concept baseline.

## Remaining blockers

1. **A 70 sq ft enclosed space is unnamed.** The zone rectangles leave the 10 ft × 7 ft band at `x=55–65 ft`, `y=13–20 ft` semantically undefined. It may be an entry, hall, vestibule, or service zone, but that cannot be inferred safely.
2. **Other render sources are stale or divergent.** The historical render-pipeline data described a different column/overhang arrangement. It has been removed from the active pipeline and remains historical idea evidence, not corroboration of the candidate.

## Practicality review

The program is coherent at a concept level: three labeled sleeping suites, four labeled baths, laundry, pantry, dog utility, and a large central kitchen/dining/living zone. A 7 ft deep hall band is generous as drawn, and the 36 in plan door openings make the intent legible.

That is not enough to establish day-to-day functionality. The rendering lacks door swings, furniture and appliance layouts, fixture locations, counter depths, closet layouts, turning spaces, storage, window operation, thresholds, and exact ceiling/elevation coordination. In particular, a nominal 36 in plan opening cannot be treated as a verified clear width after the selected door, frame, swing, hardware, and wall assembly are known.

Before a practical-layout approval, add a dimensioned room/fixture plan, door schedule with swings and clear openings, appliance and cabinetry schedule, and a named entry/hall solution for the 70 sq ft gap.

## Safety and permitting review

Grandview’s current new-residential-construction guidance requires a final plat, a site plan identifying zoning/setbacks/lot coverage, engineered stamped foundation/shear/framing/roof documents, mechanical/electrical/plumbing layouts, a dimensioned architectural floor plan, wind-bracing material, and an energy letter. The city says its adopted residential code is the 2015 IRC with regional amendments, and it specifically requires wind-bracing information such as braced wall lines, wind speed/exposure, and connection details. [City of Grandview: Building & Construction Information](https://www.cityofgrandview.org/611/Building-Construction-Information)

None of that evidence is in the rendering. The following checks are therefore **not performed**:

- life-safety egress route and exterior door clearances;
- emergency-escape-and-rescue window attributes for sleeping rooms;
- natural-light, ventilation, smoke/CO alarm, electrical, plumbing, or mechanical design;
- foundation, roof, glass, lateral/wind, connection, and load-path engineering;
- site elevation, drainage, driveway, fire access, utility, easement, setback, lot-coverage, or flood/geotechnical review;
- energy-envelope and condensation control, including glass U-factor/SHGC, shading, air sealing, insulation, and HVAC sizing.

The City also requires site-plan dimensions to accurately relate the proposed work to property boundaries and existing structures for applicable residential permits. [City of Grandview: Residential Permit](https://www.cityofgrandview.org/446/Residential-Permit) The illustration’s site boundary and setback lines consequently cannot be treated as survey or zoning proof.

## Longevity and aging-in-place review

The single-story concept, broad rendered hall band, and in-law suite are promising starting moves. They do not establish an accessible or age-ready home. A durable brief should decide, before layout hardens:

- a continuous no-step route from parking to a primary entrance, including weather-protected landing and threshold details;
- a bedroom and full bath that remain usable on the entry level, with verified approach/turning/transfer clearances;
- door clear-width and maneuvering requirements based on actual selected assemblies, not plan strokes;
- reinforced blocking and adaptable bath/shower locations;
- protected drainage, roof runoff, wall flashing, durable exterior finishes, accessible maintenance routes, and service clearances;
- climate-, orientation-, and manufacturer-specific glazing/shading/energy selections for the high-glass pavilion intent.

These are performance and resilience objectives to give the architect and engineers, not claims that the current drawing already meets them.

## Promotion gate for WorkWay

WorkWay may ingest this model now as `candidate-design-intent`. It must remain read-only for authoritative construction operations until all gates below pass:

1. Owner/designer names and bounds the 70 sq ft zone.
2. A licensed survey establishes the parcel, setbacks, easements, utilities, grades, and a project datum.
3. Architect publishes coordinated dimensioned plan, elevations, sections, door/window/finish schedules, and room/fixture clearances.
4. Structural and MEP professionals supply jurisdiction-appropriate calculations and drawings.
5. The local authority having jurisdiction confirms the current permit/code path; the facts above are a dated screen of city guidance, not a code determination.
6. The approved package is ingested as a new immutable revision, with its source documents and reviewer decisions attached.

Until then, the candidate is useful for visual walkthroughs, rough program comparisons, proposed-change previews, and decision capture only. It must not output field staking, quantities for procurement, permit documents, or safety/compliance assertions.
