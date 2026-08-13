# Threshold Dwelling Physical 1:1 Scene Issuance

**Status:** Rev 0.8 vertical-geometry gate is blocked. The current walkthrough may use the issued horizontal plan; it must not present a physical 1:1 building scene.

## The boundary

WorkWay separates a room chapter that is **dimensionally meaningful in the issued plan** from a **physical 1:1 scene**. The first can preserve a room's verified horizontal width and depth while rebasing the participant locally. The second additionally needs actual elevations, wall/roof assemblies, openings, support, services, and site thresholds.

The canonical `THRESHOLD_DWELLING_PHYSICAL_SCENE_ISSUANCE` record is the gate. In Rev 0.8 its coordinate truth is `revised-plan-horizontal-only`; every vertical fact is `missing`, its value is `null`, and physical-scene generation is false.

This is intentional. A 9 ft render mass, floor-to-ceiling visual preference, plan-only 36 in door symbol, or material role code is not evidence of a wall height, glazing head, clear opening, assembly thickness, or constructible detail.

## Fact sets required before a physical 1:1 scene

| Fact set | Why the renderer needs it | Responsible review inputs |
| --- | --- | --- |
| Finished-floor and site datum | Position room floors relative to surveyed grade, drainage, and thresholds | Survey; coordinated architecture |
| Exterior-wall assembly geometry | Model true offsets, thicknesses, facade depth, and weather protection | Architecture; energy |
| Interior-partition geometry | Model partition thicknesses, heights, backing, and ceiling relationships | Architecture; MEP |
| Roof and ceiling geometry | Model slopes, bearing, drainage, depth, and ceiling planes | Architecture; structural; energy |
| Door-opening geometry | Model frames, leaves, swings, thresholds, clear width, and hardware space | Architecture; jurisdiction |
| Window and glass-opening geometry | Model sill/head/panel geometry, operation, support, and performance | Architecture; structural; energy; jurisdiction |
| Structural support and lateral geometry | Model actual columns, beams, foundations, connections, and bracing | Structural/wind engineer |
| MEP coordination geometry | Model equipment, ducts, piping, electrical zones, penetrations, and service clearances | MEP; energy |
| Exterior grade and threshold geometry | Model grade, paths, ramps/stairs, drainage, and envelope transitions | Survey; architecture; jurisdiction |

## How the gate clears

For each fact, a future project revision must attach all of the following:

1. A revision-specific value from an issued project artifact.
2. The source document identifier.
3. A named reviewer who accepted that evidence for the scene scope.

Only when every fact is accepted and traceable may WorkWay mark the **visual** physical-scene gate eligible. This still leaves `constructionReady: false`; the professional-review and jurisdictional workflows remain independent. The product must never turn an eligible visual scene into a permit, a safety certification, procurement quantities, field layout, or authority to construct.

## Delivery behavior

The TypeScript, Rust, and Swift spatial-package contracts carry the same `physicalSceneContract`. Native preflight can still permit a primitive plan-based room guide, but reports `physicalOneToOneSceneEligible: false` for Rev 0.8. The local browser labels the 3D massing and chapter views accordingly.

When the evidence gate is actually clear, create a new immutable WorkWay revision, regenerate all affected 2D/3D/USD assets from those issued values, revalidate hashes and client packages, then retain the source/reviewer receipts in the private project graph.
