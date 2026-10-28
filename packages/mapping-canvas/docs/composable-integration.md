# Local composable Draw integration

Candidate branch: `codex/draw-composable-integration`, based on `c96e5fef12363367bf5e1077b8451ff30b28bd8b`.

The independent composable proof was copied from the preserved task-7 checkout. `output/integration/proof-input-manifest.json` records the input hashes. The source proof, original Draw checkout, prior native candidates and approved isometric D assets remain untouched.

Canvas now exposes Compose. Navigation flushes edits and refuses to hide native conflict recovery. The composition is a separate versioned local document; it does not silently migrate Canvas data or change the native database. JSON import/export preserves nested instance identity, validates the Canon source lock, and rejects tampered render handoffs. Existing DOM-only handoffs remain readable.

Context and Detail exports package scripted Canon DOM snapshots, a finite paused GSAP timeline, the original validated handoff and the local vendored GSAP runtime in a ZIP. Extract the ZIP and point HyperFrames at the directory. These are deterministic camera cuts, not interpolated camera motion or encoded video. Live interactive form entries are excluded. Assets use fixed paths and no remote dependencies. Canon component sources and branding are unchanged; a scoped form rule uses Canon ink for alert titles to meet contrast requirements.

## Evidence

- Package: 414 tests pass; Svelte check reports zero errors/warnings.
- Composition browser: 16 assertions, 14 screenshots; keyboard validation, retained inputs, JSON round trips, local restore, camera tracks, responsive form and rejection cases.
- Export browser: both actual ZIP downloads, synthetic live-entry sentinel exclusion, one visible form and matching state/caption at forward/reverse seek positions.
- HyperFrames 0.8.64 strict checks: both 18-second sequences at 0, 4.1, 8.1 and 13.1 seconds; zero lint/runtime/layout/contrast errors or warnings; 61 Context and 58 Detail contrast checks. Motion analysis reports zero samples and is not counted as passed motion acceptance.
- Independent source/pixel review found and verified fixes for native conflict navigation and overlapping snapshot descendants. The final snapshots show the correct distinct states and camera framing.
- Native frontend and executable compile offline. Native test/bundle receipts are in the local output directory.

Reproduce browser checks against a loopback Vite server with `DRAW_COMPOSITION_URL`, using `verify:composition` and `verify:hyperframes`. The latter writes extracted bundles under `output/integration/hyperframes`. HyperFrames is installed only in the ignored local evidence/tool directory, not added as a product runtime dependency.

## Remaining gates

The local desktop inventory exposes no Draw window. This candidate is not installed or natively accepted. Verify native Compose navigation, persistent local restore, ZIP download and return to Canvas in an isolated profile before promotion. Human continuous playback and encoded video qualification remain separate. No provider turn, grant, registration, deployment, public download copy or signing/notarization claim is part of this change. Historical provider attempts remain unaccepted.
