# Deterministic Metal gate release

An eight-second, 16:9 editorial benchmark for the CREATE SOMETHING Performance scene language. Apple Metal renders every pixel from an explicit frame-indexed state machine; FFmpeg only packages those frames as H.264.

The shot has one causal sentence:

1. Cobalt water is held behind an onyx gate.
2. The gate retracts completely.
3. Only then does the signal cross the threshold.
4. The signal reaches the existing receipt plate and leaves a proof trace.

There are no captions, cuts, generated continuations, or model-dependent decisions. The same specification, seed, and frame index produce the same RGBA bytes.

## Render

Requires macOS 14+, Metal, Swift, and FFmpeg. From this directory:

```bash
./scripts/render.sh v1
```

The script tests the causal contract, builds the production renderer, writes 192 PNG frames, encodes an eight-second H.264/AAC MP4, and saves machine-readable and visual receipts.

Key outputs:

- `exports/create-something--metal-gate-release--8s--16x9--<version>.mp4`
- `receipts/render-receipt--<version>.json`
- `receipts/ffprobe--<version>.json`
- `receipts/contact-sheet--250ms--<version>.jpg`

## Ownership boundaries

- `GateReleaseTimeline.swift` owns story timing and causal state.
- `GateRelease.metal` owns composition, tokens, water field, gate, receipt, and grain.
- `MetalGateReleaseRenderer.swift` owns deterministic GPU execution and byte readback.
- `GateReleaseFilmExporter.swift` owns lossless frame export and checkpoint receipts.
- `scripts/render.sh` owns packaging and codec verification.

This benchmark uses a deterministic analytic water field. It does not yet consume the SPH state from `apps/metal-water-simulator`; keeping that boundary explicit lets the simulator improve independently before its field data replaces this controlled reference.

## SPH-to-Blender backend

The second backend consumes the public 8,192-particle `WaterSimulationCore`,
freezes its compact 96 x 96 field interchange, and lets Blender own the scene,
materials, gate mechanism, receipt, 100 mm-equivalent camera, and final pixels.
It remains one eight-second shot with no captions or generated continuation.

```bash
./scripts/render_blender.sh v1
```

For an encode/verification-only replay from an already verified 192-frame
render, use `REUSE_BLENDER_FRAMES=1 ./scripts/render_blender.sh v1`. The command
still tests the Swift contracts, verifies the immutable field SHA, checks every
frame, fully decodes the MP4, and fails on codec, timing, audio, or caption drift.

The accepted field is not claimed to be byte-identical across new GPU captures.
`verify_field_replay.py` enforces the measured replay envelope while every
Blender production render consumes the frozen accepted SHA. This separates
probabilistic GPU accumulation from deterministic art direction and delivery.

Key Blender outputs:

- `output/sph-field--v1.json` — immutable Metal-derived field input
- `output/blender-gate-release--v1.blend` — inspectable scene source
- `exports/create-something--sph-blender-gate-release--8s--16x9--v1.mp4`
- `receipts/blender-video-verification--v1.json`
- `receipts/blender-contact-sheet--250ms--v1.jpg`

## Cycles hero-v2 profile

The named `hero-v2` profile preserves the accepted field and causal timeline but
uses a field-derived adaptive surface instead of the fixed full-channel sheet.
It also owns the dark Performance studio, machined gate detail, low continuous
100 mm macro camera, physical receipt trace, and Cycles/Metal final-pixel path.
The profile is fail-closed in `blender/render_profile.py`; it rejects field-hash,
resolution, frame-range, caption, water-source, and camera-cut drift.

Render the quality gate before committing the full film:

```bash
./scripts/render_hero_v2.sh checkpoints
./scripts/render_hero_v2.sh wedge
./scripts/render_hero_v2.sh full
```

These commands default to Blender Cycles on Metal with 16 denoised samples at
1280 x 720. `ENGINE=eevee` is available only for cheaper punch-list renders;
the verified v2 final uses Cycles. `WIDTH`, `HEIGHT`, and `SAMPLES` may be
overridden for experiments, but those outputs do not satisfy the final profile
until the full-resolution verifier passes.

Key v2 outputs:

- `output/blender-gate-release--hero-v2.blend` — inspectable generated scene
- `exports/create-something--sph-blender-gate-release--hero-wedge--v2.mp4`
- `exports/create-something--sph-blender-gate-release--8s--16x9--v2.mp4`
- `receipts/blender-hero-wedge-video--v2.json`
- `receipts/blender-video-verification--v2.json`
