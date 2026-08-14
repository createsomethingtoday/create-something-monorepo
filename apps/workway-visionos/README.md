# WorkWay visionOS validation package

This is the native-client boundary for WorkWay’s Threshold Dwelling spatial package. It is deliberately a Swift package, not a claim that a Vision Pro client has shipped.

## What is proved locally

- Swift decodes a bundled `workway.spatial-package.v1` fixture with source documents excluded and `constructionReady: false`.
- The kitchen contract retains its exact 180 in × 156 in dimensions, converting to 4.572 m × 3.9624 m only at the Apple-rendering edge.
- A RealityKit primitive room guide can be eligible from that verified contract.
- A content-addressed USDZ of the same design-intent massing is issued after strict Apple RealityKit validation and a local macOS RealityKit load. Plain USD remains unissued.
- The issued USDZ does not alter the blocked physical-scene gate, the horizontal-only truth boundary, or `constructionReady: false`.

Run the portable contract proof:

```bash
cd apps/workway-visionos
swift run WorkWaySpatialContractVerifier
```

## RealityKit adapter

`WorkWayRealityKitAdapter` contains `WorkWayRoomChapterRealityView`, a visionOS-only `RealityView` adapter. It makes a thin floor footprint from the room’s deterministic dimensions in meters. It intentionally does not load an asset, track a room, or expose global free walking.

The intended Vision Pro launch sequence is:

1. Begin in a normal SwiftUI window with the tabletop/project controls.
2. Open one selected room chapter in a `RealityView` volume or immersive space.
3. Render the contract-driven primitive guide first.
4. Permit only the matching, explicitly issued USDZ design-intent asset to load.
5. Keep project decisions, proposals, and construction determinations in WorkWay’s revisioned graph, not in the headset.

Apple describes `RealityView` as the SwiftUI container for RealityKit content and supports adding entities directly to it. Apple also recommends starting with familiar windows and adding volumes or immersive spaces as the experience earns them. See [RealityView](https://developer.apple.com/documentation/realitykit/realityview) and [visionOS app construction](https://developer.apple.com/documentation/visionos).

## Current native-validation gate

This Mac has Xcode 26.6, the visionOS 26.5 Simulator runtime, and full local
Apple USD/RealityKit tooling. The issued USDZ passes `usdchecker --arkit
--strict` and loads through local macOS RealityKit.

Run the reproducible Simulator SDK compile check:

```bash
cd apps/workway-visionos
./scripts/check-visionos-simulator.sh
```

It compiles the public `WorkWayRealityKitAdapter` target against the installed
`xrsimulator` SDK. It deliberately does not cross-link the macOS-only
`WorkWaySpatialContractVerifier` as a visionOS executable. That verifier stays
the portable fixture/contract proof; a future app target owns simulator
rendering.

The remaining gates are intentionally **not claimed**:

| Gate | Evidence required |
| --- | --- |
| RealityKit compile | Passed locally: compile `WorkWayRealityKitAdapter` against the installed visionOS Simulator SDK. |
| Simulator render | A launchable Apple Vision Pro app target; verify the kitchen footprint, local-stage messaging, and that only the issued design-intent USDZ loads. |
| Device interaction | Physical Vision Pro: inspect scale, gestures, comfort, occlusion, and session recovery. |
| Shared spatial alignment | Two Vision Pros with the selected Apple collaboration approach; verify state/anchor consistency and failure recovery. |

When the visionOS platform is installed, add this package to a visionOS app target, run the three checks above, and record screenshots/video plus the exact Xcode and visionOS runtime versions. A simulator result remains separate from physical-device evidence.
