# Metal Water Workflow Simulator

A native Apple Silicon workflow simulator that uses an 8,192-particle Metal
water field to make operating pressure visible and a governed hydraulic gate to
make authority visible. It replays the canonical Webflow Marketplace template
lifecycle as Signal / Decision / Action / Proof without making production
writes.

The interface follows the CREATE SOMETHING Performance Lab contract: dark
control chrome, a light measurement surface, blue/cyan water, and restrained
semantic receipts. `RUN` tilts both gate leaves clear at Action, drains the
complete upstream reservoir, and closes the boundary before Proof; `WAIT` and
`STOP` keep the water contained. A replay or case change admits the next
8,192-particle reservoir only behind that closed boundary. Renderer health
remains a separate surface and never decides workflow authority.

The native workspace mirrors Canon's Performance primitives: neutral panel and
ink structure, square lifecycle markers and 44-point actions, 28-point receipt
stamps, four-point semantic rails, and a two-point neutral physical gate. Run,
Wait, Stop, pressure, and renderer colors identify state without becoming the
resting surface of the component itself.

## Safety boundary

- `SHADOW ONLY`: replay reads compiled local fixtures.
- `WRITES NONE`: no approval, publishing, credential, deployment, or
  third-party mutation path exists.
- Proof export writes only to the current user's Application Support directory.
- The app is an inspectable projection over the workflow compiler, not a new
  workflow source of truth.

## Run

```bash
swift run --package-path apps/metal-water-simulator MetalWaterSimulator
```

Use the optimized executable for native performance verification:

```bash
swift build --package-path apps/metal-water-simulator -c release
apps/metal-water-simulator/.build/release/MetalWaterSimulator
```

The default native window is 980 x 760.

## Replay and controls

Select one of the five canonical pressure cases, then use `Replay case` or
`Return` to advance through Signal / Decision / Action / Proof.

- Passing: `RUN / ACTION_ALLOWED`; the gate tilts open at Action, drains for
  the verified 1.5-second hydraulic interval, then closes before Proof.
- Approval required: `WAIT / APPROVAL_REQUIRED`; the named approval owner must
  recover the workflow.
- Policy blocked: `STOP / POLICY_BLOCKED`; the policy boundary contains the
  action.
- Insufficient evidence: `STOP / INSUFFICIENT_EVIDENCE`; missing evidence and
  recovery are explicit in the inspector.
- Unknown action: `STOP / UNKNOWN_ACTION`; undefined authority fails closed.

Additional controls:

- Click inside the water field to inject representative pressure.
- `Space` pauses or resumes renderer execution.
- `R` resets the selected fixture, stage, particles, and closed gate.
- `E` exports proof after the case reaches Proof, the gate is closed, the
  artifact tour is 15/15, and the renderer has a verified ten-second window.

The app follows the macOS Reduce Motion accessibility setting. Native verifier
runs can exercise the same replay branch without changing the machine-wide
preference by launching with `METAL_WATER_REDUCE_MOTION=1`.

The inspector exposes Source, Decision, Action, Result, Owner, Authority,
Version, Evidence, Missing evidence, Receipt, and Recovery. The renderer footer
reports GPU-completed median FPS over the latest ten unpaused seconds, requested
solver substeps, grid overflow, and particle count. Paused frames are excluded
from the performance window.

## Guided artifact atlas

Switch the inspector from `WORKFLOW` to `ARTIFACT TOUR` to walk the complete
compiler bundle. The atlas derives artifact identity and SHA-256 provenance from
the verified manifest, then explains all 15 files inside six chapters:

1. Topology
2. Data contracts
3. Execution contracts
4. Governance
5. Evaluation and evidence
6. Presentation and provenance

Every artifact is individually addressable and includes its purpose, owner,
inputs, outputs, downstream relationship, and water-physics teaching cue. `Back`,
`Next`, direct artifact selection, chapter selection, and `Replay` support a
self-guided walkthrough. Loading the bundle does not count as a visit: coverage
reaches 15/15 only after every artifact has been explicitly visited. The active
teaching cue remains visible over the hydraulic field without gaining workflow
authority.

## Physical rendering semantics

The renderer and neutral overlay distinguish stages and outcomes with geometry,
motion, and labels rather than color alone:

- Signal introduces a visible pressure pulse into the reservoir.
- Decision brackets the governed boundary and applies a pressure impulse.
- RUN opens a marked release channel and draws the reservoir downstream.
- WAIT adds an approval lock; policy refusal adds diagonal braces; insufficient
  evidence shows interrupted measurement marks; unknown action uses a crossed
  boundary.
- Proof closes the gate and leaves a downstream wake while the semantic receipt
  remains inspectable.

The composite shader adds restrained, time-varying micro-ripples and surface
variation after the four-pass thickness reconstruction. Those effects improve
legibility without changing workflow authority or the SPH stability contract.

## Artifact provenance

The owning inputs are:

```text
packages/workflow-compiler/fixtures/marketplace/workflow.json
packages/workflow-compiler/fixtures/marketplace/cases.json
```

Regenerate the bundled runtime package from those inputs:

```bash
apps/metal-water-simulator/scripts/generate-workflow-artifacts.sh
```

The generator builds `@create-something/workflow-compiler` and emits 15
content-hashed files plus `manifest.json` into
`Sources/WaterSimulationCore/WorkflowArtifacts`. At app load, every workflow,
version, and definition header must agree, acceptance must be complete, and the
SHA-256 of every bundled file must match the manifest. A missing, inconsistent,
unaccepted, or modified package fails closed.

`Sources/WaterSimulationCore/SimulatorArtifacts` contains the simulator-owned
hydraulic projection and visual semantics. Those files map canonical reason
codes onto the gate; they do not redefine the decisions.

## Proof export

After a case reaches Proof, select `Export proof`. The app writes to:

```text
~/Library/Application Support/CREATE SOMETHING/
  Metal Water Workflow Simulator/receipts/<case-id>/
```

Each case directory contains:

- `proof-receipt.json`: deterministic canonical input, decision, ownership,
  authority, evidence, recovery, receipt, and four-stage semantic trace.
- `event-trace.jsonl`: one ordered Signal / Decision / Action / Proof event per
  line.
- `render-receipt.json`: timestamped local renderer state, gate state, device,
  particle count, substeps, FPS, and grid overflow.
- `artifact-tour.json`: deterministic six-chapter metadata, ordered explicit
  visits, 15/15 coverage, manifest hashes, and teaching cues.
- `capture-manifest.json`: workflow identity and the native-window captures
  required by a verification run. Capture hashes are finalized by the external
  native verifier because the app cannot truthfully attest to pixels it did not
  capture.

Proof export fails closed before Proof, while the gate is open, before 15/15
artifact coverage, or without a verified ten-second renderer window. A valid
render receipt therefore records a closed gate, at least 8,192 particles, two
substeps, zero grid overflow, and at least 45 median FPS.

The app writes an empty observational capture manifest because it cannot
truthfully attest to pixels it did not capture. After placing these clean native
captures in the proof directory—`native-window.png`,
`workflow-inspector.png`, `renderer-health.png`, and `artifact-tour.png`—finalize
and independently read them back:

```bash
swift run --package-path apps/metal-water-simulator \
  MetalWaterProofVerifier finalize "/absolute/path/to/proof-directory"

swift run --package-path apps/metal-water-simulator \
  MetalWaterProofVerifier verify "/absolute/path/to/proof-directory"
```

Finalization records each absolute path, byte count, and SHA-256. Verification
fails on a missing file, incomplete manifest, changed byte count, or changed
hash.

Semantic proof is deterministic and hashable. Render timestamps, GPU timing,
and screenshots are observational evidence and are not expected to be
byte-identical across runs.

## Architecture

1. The workflow catalog loads compiler artifacts, validates acceptance, checks
   all 15 content hashes, and derives five typed replay scenarios.
2. The controller advances a deterministic Signal / Decision / Action / Proof
   playback. Run holds Action while the full reservoir drains, closes the gate,
   then advances to Proof; reset and case selection load the next reservoir
   behind the closed boundary.
3. `clearSpatialGrid` and `populateSpatialGrid` build a bounded 64 x 64 GPU grid
   with 512 index slots per cell.
4. `calculateDensityPressure` visits only cells inside the smoothing radius; a
   capped negative-pressure term keeps the free surface cohesive.
5. `integrateSPH` applies pressure, viscosity, gravity, damping, velocity
   bounds, and collision against the domain and governed gate. The closed gate
   contains every particle; its tilted state clears the complete collision
   boundary. Each of two displayed-frame substeps uses four stability
   microsteps.
6. Particles accumulate thickness, velocity, and foam seeds into an RGBA16Float
   target. Four separable Gaussian passes create a continuous scalar field.
7. A fullscreen composite reconstructs normals, refracts the Performance paper
   grid, and adds thickness, edge light, pressure trace, and transient foam.
8. Proof export combines the canonical semantic bundle with observed renderer
   state while preserving their different truth boundaries.

## Verification

```bash
swift test --package-path apps/metal-water-simulator
swift build --package-path apps/metal-water-simulator -c release
pnpm --filter @create-something/workflow-compiler test:acceptance
```

The test suite covers all five decisions, deterministic proof encoding, exact
six-chapter/15-artifact tour coverage, explicit visit accounting, capture hash
drift, all 15 artifact hashes, the 8,192-particle projection, zero-leak containment and full
reservoir release on the real Metal integration kernel, proof-time closure,
reset, grid occupancy, stability, impulse, gravity, and Canon Performance token
parity.

Release completion also requires native pointer or keyboard replay of all five
cases three consecutive times, proof-file readback, reset/relaunch proof, clean
window-level captures, and a ten-second unpaused Run with at least 8,192
particles, two substeps, zero grid overflow, and 45 median FPS.

## Scope and limits

This is a visually plausible two-dimensional local simulator, not a validated
CFD package or a production workflow executor. It uses bounded numerical
damping and a speed limit to keep the interactive free surface stable at display
rates. It does not model three-dimensional volume, air pressure, phase changes,
rigid-body coupling, scientifically calibrated material parameters, live
approvals, or production state transitions.
