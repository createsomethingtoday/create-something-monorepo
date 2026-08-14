# WorkWay Core

`workway-core` is the Rust kernel for deterministic WorkWay project state. It owns integer-inch geometry arithmetic, versioned project decisions, evidence-status evaluation, client-safe spatial-package validation, and the construction-readiness guard.

It does not render a scene, import CAD/BIM, call an AI model, decide code compliance, or issue a permit. Swift/RealityKit remains the Apple client layer; TypeScript remains the present prototype/control surface. Those surfaces should communicate with the core through versioned JSON contracts and contract tests.

`schemas/spatial-package.v1.schema.json` specifies the derived package a client may receive: revision identity, content-addressed assets, scene-representation availability, semantic-to-render mappings, one-to-one room chapters, explicit portals, and validation receipts. It rejects private-source paths and `constructionReady: true`. The initial Threshold Dwelling Rev 0.8 fixture delivers content-addressed 2D assets plus a deterministic browser GLB massing guide; it intentionally declares USD/USDZ as `unissued`. The browser representation is a product proof, not a native spatial delivery or construction model.

`apps/workway-visionos` is the companion Swift/RealityKit validation package. It checks the same client-safe fixture, converts integer inches to meters only at the native rendering edge, and exposes a visionOS-only `RealityView` adapter for a primitive room guide. Its portable verifier must pass before a native client can be considered contract-aligned. A full Xcode visionOS build, Simulator run, and physical Vision Pro review remain separate evidence gates.

## Current proof

The v0.5 Threshold Dwelling fixture proves that a complete, non-overlapping 2,730 sq ft design-intent baseline can be represented with integer inches and that six required professional-review disciplines remain explicit:

1. licensed site survey;
2. coordinated architectural package;
3. structural and wind design;
4. mechanical, electrical, and plumbing design;
5. energy compliance package; and
6. jurisdictional determination.

Every requirement must carry reviewer-attested accepted evidence before the core permits a request for a professional determination. The core itself always returns `construction_ready = false`.

`schemas/professional-determination-register.v1.schema.json` is the client-safe contract for the separate determination register. It preserves an unissued/requested/issued trail and requires a named, revision-specific external artifact when a row is `issued`; it cannot express construction authorization.

## Secure evidence handoff

`threshold_dwelling_evidence_intake_packet_v08()` derives a client-safe,
revision-bound checklist for the nine currently unissued evidence gates. Each
request says what a future approved intake service must capture—an opaque vault
record, content SHA-256, source-class confirmation, and a qualified-review
request—without exposing a vault locator, source filename/path, document bytes,
extracted text, reviewer identity, upload URL, or acceptance control.

The checked-in Space projection is emitted with:

```bash
cargo run --bin emit_threshold_dwelling_evidence_intake_packet
```

Rust tests require semantic parity between that JSON packet and the kernel
projection. The local browser can display the checklist, but it cannot upload,
parse, store, or accept a document. Any such intake path needs explicit user
approval plus its own storage, authentication, retention, audit, and qualified
review design.

## Commands

```bash
cargo fmt --check
cargo test
cargo clippy --all-targets -- -D warnings
```
