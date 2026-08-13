# WorkWay Core

`workway-core` is the Rust kernel for deterministic WorkWay project state. It owns integer-inch geometry arithmetic, versioned project decisions, evidence-status evaluation, and the construction-readiness guard.

It does not render a scene, import CAD/BIM, call an AI model, decide code compliance, or issue a permit. Swift/RealityKit remains the Apple client layer; TypeScript remains the present prototype/control surface. Those surfaces should communicate with the core through versioned JSON contracts and contract tests.

## Current proof

The v0.5 Threshold Dwelling fixture proves that a complete, non-overlapping 2,730 sq ft design-intent baseline can be represented with integer inches and that six required professional-review disciplines remain explicit:

1. licensed site survey;
2. coordinated architectural package;
3. structural and wind design;
4. mechanical, electrical, and plumbing design;
5. energy compliance package; and
6. jurisdictional determination.

Every requirement must carry reviewer-attested accepted evidence before the core permits a request for a professional determination. The core itself always returns `construction_ready = false`.

## Commands

```bash
cargo fmt --check
cargo test
cargo clippy --all-targets -- -D warnings
```
