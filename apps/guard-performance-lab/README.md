# Guard Performance Lab

A standalone, private-first coaching system for developing guards. Version 0.5 adds an immutable film-trace workflow: a supplied game is analyzed once, the derived player traffic is stored privately, and the operator can scrub, correct, reload, and export the captured revision without rerunning inference. Identity-only revision 3 preserves the revision-2 player field and associates #13 from direct jersey evidence plus bounded continuity; verified substitutions are stored as `inactive`, while ambiguous spans fail closed as `unresolved`. A separate reviewed play-state ledger labels live offense, live defense, transitions, dead balls, free throws, substitutions, and unknown spans without rewriting frames or running detection again.

## Privacy model

- Player profiles, receipts, evidence, engagement state, derived film coordinates, and correction provenance use a versioned app-owned local datastore at `.data/workspace.json` relative to the app process working directory (gitignored). Set `GUARD_LAB_DATA_PATH` to use an explicit private path.
- Production uses the private `GUARD_LAB_DB` Cloudflare D1 binding. The runtime fails closed when `ENVIRONMENT=production` and that durable binding is absent; the JSON file store remains development-only.
- D1 stores immutable film frames in ordered chunks so large captured traces do not exceed SQLite row-value limits. Corrections remain a small append-only overlay and do not rewrite or increment the analysis revision.
- Every mutation goes through one typed command service. An atomic cross-process lock prevents browser and Codex writes from overwriting one another; the visible workspace revision increments after each accepted command.
- Protected workspace data is never restored from browser storage; the player-scoped server response is authoritative for every shared session.
- The app has no analytics or domain-external data writes. Network access is limited to the app and operator-requested source links.
- The starter profile is generic and contains no child-identifying information.
- Resetting local data restores the generic profile and removes saved receipts, evidence, and engagement events.
- Source-video bytes and detector weights are never written to the application datastore or committed. Only hashes, model provenance, derived coordinates, unresolved intervals, correction receipts, and explicitly anonymized review derivatives persist.
- Play-review images are never public static assets. The builder reduces the complete 1920×1080 frame to a 160×90 pixel grid before upscaling, then adds a synthetic orange `13` marker. The stored packet contains no sharp frame, face crop, original jersey crop, or reversible layer and is returned only through the authenticated, player-scoped workspace.

This is a development aid, not medical guidance, a talent ranking, or a recruiting projection.

## Run

```bash
pnpm --filter @create-something/guard-performance-lab dev
```

## Validate

```bash
pnpm --filter @create-something/guard-performance-lab check
pnpm --filter @create-something/guard-performance-lab test
pnpm --filter @create-something/guard-performance-lab build
pnpm --filter @create-something/guard-performance-lab preview
```

The production preview runs at `http://127.0.0.1:4173` and is the owning surface for the shared-password browser fixture + Playwright workflow. Rendering invariants that can be asserted without a browser belong in `src/lib/FilmTrafficCourt.test.ts` instead, so they stay in the suite.

## One-run film trace

The analyzer requires an operator-supplied source video and YOLOX ONNX model. Both remain outside version control. It decodes the complete source sequentially, captures one immutable analysis revision, and records unresolved target intervals rather than inventing positions. Revision 2 first rejects detections outside the foreground court closest to the camera, then classifies central-torso evidence using this game's white-jersey teammate / other-colored opponent rule. Opposite-court, official, and sideline detections stay in the audit receipt but never render as traffic. A deterministic full-track vote stabilizes team roles without another inference execution.

### Local detector bake-off

`film:bakeoff:tracking` compares a complete, source-bound candidate prediction set with the locked #13 identity and team fixtures. With no `--candidate-predictions`, it runs the Apache-2.0 RF-DETR Small COCO model locally on every locked source timestamp. Source frames and annotated evidence stay in the operator-selected private directory. The detector has no #13 identity authority: direct-number review, bounded continuity, reviewed SAM2 evidence, substitutions, and foreground-court rules remain fixed.

The receipt fails closed when timestamps or source/model fingerprints differ, a hard negative is accepted, an inactive interval is bridged, opposite-court traffic becomes active, team accuracy regresses, or source-backed held-out court-line evidence is absent. A candidate is adopted only when every safety floor passes and target coverage, foreground-player coverage, or court error materially improves. A losing candidate leaves the production analyzer unchanged.

```bash
pnpm --filter @create-something/guard-performance-lab film:bakeoff:tracking \
  --source /private/path/game.mp4 \
  --source-sha256 <verified-source-sha256> \
  --output /private/path/tracking-bakeoff-receipt.json \
  --evidence-dir /private/path/tracking-bakeoff-evidence
```

To evaluate another local provider without changing the verifier, supply its `guard-film-player-detections-v1` JSON with `--candidate-predictions`. A source-backed court report may be supplied with `--court-report`; it must contain the source SHA plus held-out `medianErrorFeet` and `p95ErrorFeet` values.

With explicit approval to send bounded frames to Roboflow, generate that court report separately. Inject the private inference key from a secret manager; never pass it as an argument or commit it. This adapter sends only the comma-delimited timestamps (seven representative frames by default), records competing court-hypothesis ambiguity, and evaluates held-out canonical landmarks. Its output can then be passed to the provider-neutral verifier with `--court-report`.

```bash
infisical run -- pnpm --filter @create-something/guard-performance-lab film:bakeoff:court:roboflow \
  --source /private/path/game.mp4 \
  --source-sha256 <verified-source-sha256> \
  --output /private/path/roboflow-court-report.json \
  --raw-output /private/path/roboflow-court-raw.json
```

Run the locked real-source team benchmark before the one authorized full revision. Its predictions must contain no correction overlays. Revision 1 remains auditable; the app selects the highest compatible revision for replay.

```bash
pnpm --filter @create-something/guard-performance-lab film:classify:team \
  --source /private/path/game.mp4 \
  --source-sha256 <verified-source-sha256> \
  --fixture fixtures/film/player-team-benchmark.json \
  --output /private/path/team-predictions.json

pnpm --filter @create-something/guard-performance-lab film:verify:team \
  fixtures/film/player-team-benchmark.json \
  /private/path/team-predictions.json \
  /private/path/team-report.json

pnpm --filter @create-something/guard-performance-lab film:analyze \
  --source /private/path/game.mp4 \
  --source-sha256 <verified-source-sha256> \
  --model /private/path/yolox_s.onnx \
  --target-seed <timeMs:footX:footY> \
  --output /private/path/full-analysis-r2.json

pnpm --filter @create-something/guard-performance-lab film:verify \
  --analysis /private/path/full-analysis-r2.json \
  --benchmark fixtures/film/player-13-golden.json \
  --report /private/path/benchmark-report.json \
  --corrections /private/path/benchmark-corrections.json \
  --svg /private/path/benchmark-evidence.svg \
  --expected-revision 2

pnpm --filter @create-something/guard-performance-lab film:verify:import -- \
  --analysis /private/path/full-analysis-r2.json \
  --corrections /private/path/benchmark-corrections.json \
  --benchmark-report /private/path/benchmark-report.json \
  --output /private/path/import-gate-r2.json

pnpm --filter @create-something/guard-performance-lab film:import:http \
  --analysis /private/path/full-analysis-r2.json \
  --corrections /private/path/benchmark-corrections.json \
  --gate /private/path/import-gate-r2.json
```

Repairing identity does not rerun person detection or team classification. The locked #13 fixture contains readable positives across four live-play segments plus #5, #11, #15, unreadable, tracker-handoff, and substitution negatives. Create a candidate, verify it, and only then finalize the one identity receipt:

```bash
pnpm --filter @create-something/guard-performance-lab film:derive:identity -- \
  --revision2 /private/path/full-analysis-r2.json \
  --assignments fixtures/film/player-13-identity-assignments.json \
  --output /private/path/full-analysis-r3-candidate.json

pnpm --filter @create-something/guard-performance-lab film:verify:identity -- \
  --analysis /private/path/full-analysis-r2.json \
  --candidate /private/path/full-analysis-r3-candidate.json \
  --fixture fixtures/film/player-13-identity-benchmark.json \
  --report /private/path/identity-verifier-r3-candidate.json

pnpm --filter @create-something/guard-performance-lab film:finalize:identity -- \
  --revision2 /private/path/full-analysis-r2.json \
  --candidate /private/path/full-analysis-r3-candidate.json \
  --receipt /private/path/identity-verifier-r3-candidate.json \
  --full-flow-receipt /private/path/full-flow-receipt.json \
  --migration-trace-receipt /private/path/migration-trace-receipt.json \
  --output /private/path/full-analysis-r3.json \
  --analyzed-at <fixed-receipt-time>
```

For a dense migration trace, verify at least 90% of the source-reviewed active-visible samples before finalization. The verifier also records every unresolved path break and rejects any coordinate labeled calibrated unless its timestamp belongs to a passing source-bound camera state with held-out median error at or below 2 feet and p95 error at or below 4 feet.

```bash
pnpm --filter @create-something/guard-performance-lab film:verify:migration-trace -- \
  --candidate /private/path/full-analysis-r3-candidate.json \
  --participation /private/path/player-13-participation.json \
  --full-flow-receipt /private/path/full-flow-receipt.json \
  --camera-states /private/path/passing-camera-states.json \
  --output /private/path/migration-trace-receipt.json
```

Omit `--camera-states` when the source cannot support an independently reviewed calibration. In that case every accepted coordinate must remain explicitly estimated.

### FieldhouseUSA Mansfield foot-level geometry

Mansfield footage uses the explicit `fieldhouseusa-mansfield-high-school-84x50-v1` profile: an 84-by-50-foot floor, 12-foot-wide lanes, free-throw lines 19 feet from each baseline, and half court at 42 feet. The black basketball markings are authoritative; overlapping red volleyball markings and the visible background court are distractors. Legacy revisions retain their original 94-by-50 estimated coordinate system and are never silently rescaled.

A revision 4 court-only successor can be created from immutable revision 3 without rerunning person detection. Each camera-state manifest supplies at least four reviewed line intersections plus at least two independent held-out intersections. Every state must pass p95 error at or below one foot. Calibrated target and context-player floor contacts receive three named marking distances, their camera-state ID, the floor-contact method, and the measured uncertainty. Missing, overlapping, out-of-court, or failing states remain estimated.

```bash
pnpm --filter @create-something/guard-performance-lab film:apply:court-calibration \
  --source-revision /private/path/full-analysis-r3.json \
  --manifest /private/path/mansfield-camera-states.json \
  --output /private/path/full-analysis-r4.json \
  --analyzed-at <fixed-receipt-time>
```

Roboflow court keypoints may seed a review, but they are never self-promoting. The benchmark remaps model landmarks to the Mansfield floor, reserves held-out points, rejects ambiguous court hypotheses, and supports offline rescoring of immutable raw predictions. A failed receipt is evidence to retain estimates, not permission to lower the one-foot gate.

Attach reviewed play context to that same immutable revision with a complete, non-overlapping ledger. `unknown` intervals require explicit unreviewed provenance and fail closed; every other state requires source-review evidence. The command verifies source identity and complete duration coverage, then writes a new artifact with the original frames, players, identity fingerprint, revision, and execution count intact.

```bash
pnpm --filter @create-something/guard-performance-lab film:apply:play-state -- \
  --analysis /private/path/full-analysis-r3.json \
  --ledger fixtures/film/player-13-play-state-ledger.json \
  --output /private/path/full-analysis-r3-play-state.json \
  --receipt /private/path/play-state-receipt.json

pnpm --filter @create-something/guard-performance-lab film:verify:import -- \
  --analysis /private/path/full-analysis-r3-play-state.json \
  --corrections /private/path/empty-corrections.json \
  --output /private/path/import-gate-r3-play-state.json

pnpm --filter @create-something/guard-performance-lab film:import:http -- \
  --analysis /private/path/full-analysis-r3-play-state.json \
  --corrections /private/path/empty-corrections.json \
  --gate /private/path/import-gate-r3-play-state.json
```

Both local and HTTP imports reject analyses that are not bound to an exact SHA-256 import gate. Revision 1/2 gates consume the passing fixed benchmark report and its exact correction overlay; revision 3 gates require the embedded locked identity benchmark; revision 4 also requires its embedded passing Mansfield court-calibration receipt. Play-state receipt counts are recomputed from the captured frames before a gate can be issued. The analyzer also hashes the linked video bytes itself and rejects a mismatched supplied source receipt before inference starts.

`Film trace` then replays the captured top-down traffic. The slider works in both directions. `All verified #13 positions` is the default and keeps every identity-resolved position visible as a gray dashed context wake even when play state is unreviewed; `Reviewed live basketball only` draws an orange wake only for verified live offense, live defense, and transition states. `All verified history` shows the complete trace up to the current scrub time with older segments faded and each segment endpoint marked. Wake segments break across state changes, unresolved gaps, and inactive substitutions. JSON/SVG exports carry the persisted identity and migration fingerprints. Operator corrections require direct-evidence text and append provenance; player-scoped identities cannot attach or correct analyses and can read only their assigned player.

### Anonymized possession review

An operator can pair direct source-review notes with compact, anonymized evidence stills without another inference execution. Definitions contain the exact play range, representative frame, possession, phase, observable position, basketball interpretation, and an explicit `not proven` boundary. The builder resolves the already-verified #13 image point, pixelates the whole frame, and adds `13` synthetically after anonymization. It never persists the temporary sharp extraction.

```bash
pnpm --filter @create-something/guard-performance-lab film:build:play-review -- \
  --analysis /private/path/full-analysis-r3.json \
  --source /private/path/game.mp4 \
  --definitions /private/path/player-13-review-definitions.json \
  --output /private/path/player-13-play-review.json \
  --image-dir /private/path/anonymized-review-stills

pnpm --filter @create-something/guard-performance-lab film:attach:play-review -- \
  --data /private/path/workspace.json \
  --review /private/path/player-13-play-review.json \
  --player developing-guard
```

The attach command fails closed when the source hash, analysis revision, one-run receipt, time domain, image media, pixelation receipt, or synthetic marker contract does not match. Player-scoped callers may read their assigned review cards but cannot attach or replace them. Selecting a card seeks the existing scrubber to the evidence frame; reload and export reuse the same private packet.

### Review provenance

`reviewer: 'codex'` is an accepted `source-review` reviewer. Agent review counts as real evidence rather than a placeholder, and the trade is that no surface may present one blended "reviewed" number. `summarizeFilmTargetCoverage` reports `userReviewedFrames`, `agentReviewedFrames`, and `unreviewedFrames`; the film legend prints that split beside the precision receipt. Identity, team, mask, and play-state fixtures all carry `reviewer`, so an agent-authored benchmark stays auditable instead of invisible. Use the `guard-film-reviewer` agent (`.claude/agents/guard-film-reviewer.md`) to produce reviewed ledgers and fixtures under that policy.

**Precision is not coverage.** The current #13 revision reports 100% identity precision across 117 resolved frames of 3,396 captured frames (3.4%), with 27 live-basketball frames and 3,306 unknown play-state frames. Read the coverage and review lines before quoting a precision number.

A dashed ring on the #13 token means that rendered position was interpolated between two captured frames (`isInterpolatedPlayer`). The captured revision never stores a synthesized coordinate, and a request landing exactly on a captured frame is never rendered as interpolated.

### Data validity invariants

These four rules exist because a receipt that cannot fail is not evidence.

**A benchmark must be able to fail.** `assessFilmIdentityIndependence` requires positive decisions at frames that were **not** tracker seeds, at least one directly readable jersey per on-court segment, and same-team confusable negatives (#5/#11/#15). Without them, positive recall re-reads its own seed frames and hard-negative precision is guaranteed by the fail-closed default rather than earned. Pass the seed frame times to `verifyFilmIdentityCandidate(..., seedTimesMs)`; `finalizeFilmIdentityRevision` refuses a receipt whose independence block is absent or failing. The locked #13 fixture **fails** this gate once its seeds are declared — that is the honest state, and `film.test.ts` asserts it.

**A rate travels with its denominator.** The identity receipt now carries `positiveDecisionCount`, `negativeDecisionCount`, `substitutionDecisionCount`, and `independentPositiveDecisionCount`. The film legend prints the positive-decision count next to the percentage, or `DECISION COUNT NOT RECORDED` for revisions imported before this rule.

**One zone taxonomy.** Zone is always derived from `court` through `filmZone`/`courtZone` (basketball geography: paint, slot, wing, corner, restricted area, center circle). The analyzer no longer writes its own `{side}-{near|middle|far}` camera-band vocabulary, and a stored `zone` on an older revision is ignored rather than trusted. Corrections no longer write a zone at all.

**Projection labels state what happened.** `estimated` is an image-space approximation, `operator-stated` is a typed-in court position, and only `calibrated` means the point came through a validated held-out homography (see the Mansfield calibration path). An operator correction is `operator-stated`; it used to claim `calibrated`, which made one typed coordinate flip the whole view's projection badge.

**Sampling bounds movement claims.** The analyzer defaults to `--sample-fps 5.0`. A guard covers roughly 20 ft/s, so at 200 ms between samples unobserved travel stays near the 4 ft position tolerance; above that (`MOVEMENT_CLAIM_MAX_INTERVAL_MS`), `resolveFilmTrafficAt` and `summarizeFilmTargetCoverage` report `movementClaimSupported: false` and the film legend states that the wake is connect-the-dots rather than an observed path. The current 1 fps revision is in that state.

### Local segmentation-mask tracking

Color histograms and detector track IDs are discovery signals, not sufficient #13 identity evidence: a track ID can transfer at a player crossing. For a substantially stronger local pass, use a reviewed #13 box to initialize SAM 2.1 on each verified active stint. The resulting silhouette receipt is fused back onto the person field only when all of these gates agree:

- the source hash and full-resolution coordinate space match;
- the mask overlaps exactly one foreground-court player with a safe margin;
- that player is classified as a white-jersey teammate, never an opponent;
- mask confidence remains above the acceptance floor;
- a user-reviewed participation ledger marks the interval active.

Ambiguous overlaps, substitutions, long gaps, and off-screen exits break the wake. They never trigger appearance-only re-identification. Re-seed from another frame where `13` is directly readable.

The official SAM 2 notebook includes an Apple MPS path with CPU fallback. MPS support is preliminary, so every stint still needs held-out visual review. On an M2 Pro proof, `sam2.1_hiera_small` processed a 960×540 sequence locally; source bytes were not uploaded. Set up the ignored local runtime and checkpoint outside the application datastore, extract a bounded frame sequence, and run:

```bash
PYTORCH_ENABLE_MPS_FALLBACK=1 \
/private/path/sam2-env/bin/python scripts/track-player-mask-sam2.py \
  --frames /private/path/stint-frames \
  --checkpoint /private/path/sam2.1_hiera_small.pt \
  --source-sha256 <verified-source-sha256> \
  --source-width 1920 \
  --source-height 1080 \
  --segment-id on-court-17m40 \
  --start-ms 1060000 \
  --sample-fps 5 \
  --seed-frame 0 \
  --seed-box 326,261,30,96 \
  --reseed 30:352,258,31,94 \
  --reviewer user \
  --output /private/path/on-court-17m40-mask.json \
  --device mps
```

`--seed-box` and each repeatable `--reseed frameIndex:x,y,width,height` use the extracted-frame coordinate space; the receipt scales every box and foot point back to the declared source dimensions. Reseeds require direct source review and become explicit reviewed anchors, never automatic appearance re-identification. The script records the exact model SHA-256, device, seed, reseeds, samples, and evidence. A mask receipt is a private candidate, not a promotable film revision by itself; benchmark and court-calibration gates still apply.

Combine reviewed stint receipts and fuse them against the reprocessed detector field. Same-state overlaps are merged so a direct-number reseed can safely bridge a chunk boundary; conflicting participation states, mixed sources, coordinate spaces, or model receipts are rejected. Fusion also rejects raw opponent evidence and terminates a seed after more than 3.5 seconds without an accepted target, even if SAM2 later attaches to another player. The command writes both the combined audit receipt and a non-promotable candidate for held-out review:

```bash
pnpm --filter @create-something/guard-performance-lab film:fuse:mask-tracks \
  --analysis /private/path/full-analysis-r2-reprocessed.json \
  --mask-track /private/path/stint-1-mask.json \
  --mask-track /private/path/stint-2-mask.json \
  --participation-ledger /private/path/player-13-participation.json \
  --receipt-output /private/path/player-13-mask-track.json \
  --candidate-output /private/path/player-13-mask-candidate.json
```

## AI-native contract

One typed guidance engine owns program stage, requested coach context, safety state, evidence separation, and the next interaction. It is used by:

- the in-app Agent + Evidence workspace;
- `POST /api/guide`;
- the local stdio MCP server.

Browser mutations use `POST /api/workspace/command` with typed actions for selecting or creating a player, updating one player-owned profile, saving a receipt, registering evidence, recording engagement, attaching one completed film revision, or appending a correction. Whole-workspace `PUT` replacement is intentionally unsupported.

The coach supplies short observations only when requested. The agent/program owns the sequence and receipt cues.

## Codex / MCP

Operator mode exposes full workspace management only when a trusted launcher assigns the scope explicitly:

```bash
GUARD_LAB_MCP_LAUNCHER=trusted \
GUARD_LAB_MCP_SCOPE=operator \
pnpm --filter @create-something/guard-performance-lab mcp
```

Player mode registers only player-safe capabilities and filters every read/write to one player:

```bash
GUARD_LAB_MCP_LAUNCHER=trusted \
GUARD_LAB_MCP_SCOPE=player:developing-guard \
pnpm --filter @create-something/guard-performance-lab mcp
```

## Shared project password and production

Guard Lab uses one email-free project credential for the player and family. Every password holder receives the same player-scoped workspace; the browser credential never grants operator access.

- `GUARD_LAB_SHARED_PLAYER_ID` selects the one player profile exposed to the shared session.
- `GUARD_LAB_PROJECT_PASSWORD_HASH` is a secret PBKDF2-SHA256 verifier. The plaintext family password is never stored in Cloudflare or the repository.
- `GUARD_LAB_SESSION_SECRET` is a separate random deployment secret with at least 32 characters.
- `GUARD_LAB_PROJECT_SIGN_IN_URL` optionally overrides the same-origin `/sign-in` route.

Generate the verifier without placing the password in shell history:

```bash
pnpm --filter @create-something/guard-performance-lab auth:hash-project-password
```

Store both secret values with Cloudflare Pages secret management. A signed session is HTTP-only, Secure in production, SameSite=Lax, limited to the root path, and expires after 14 days. The current password verifier is part of the signing key derivation, so rotating the password verifier invalidates all existing sessions.

Every layout and `/api/*` data route resolves the signed project session. A caller-supplied different player ID is denied, and a player-scoped engagement write is attributed to `player` on both the HTTP and MCP surfaces even when the caller supplies another source. Stdio MCP remains a separate trusted-operator boundary: it requires `GUARD_LAB_MCP_LAUNCHER=trusted` and an explicit `GUARD_LAB_MCP_SCOPE`. There is no remote MCP transport; adding one is a separately approval-gated network-boundary change.

Production hosting is Cloudflare Pages plus D1. Apply migrations before deploying. Keep a D1 export and the previous Pages deployment ID before promotion; rollback the Pages deployment first, then restore the corresponding D1 export only if the schema/data change requires it. Private player records are retained until an operator explicitly deletes or resets them; exports and rollback artifacts must remain private and follow the same deletion decision.

The MCP surface provides program/workspace resources plus guidance, evidence review, artifact-search preparation, evidence registration, receipt, and engagement tools. Operator-only create-player and reset tools are absent in player mode. Every player mutation response is filtered back to that one profile, and player engagement is attributed to the player even if a caller supplies another source. Codex may locate collegiate/professional sources using its own web tools, but saved evidence must carry provenance; video is linked, not copied.

## Fonts and network boundary

Satoshi and IBM Plex Mono are self-hosted under `static/fonts/`. The app consumes Canon’s Performance color tokens without importing Canon’s remote Fontshare stylesheet or its all-language font bundle. Runtime network activity is limited to the app and evidence links a person explicitly opens.

Verify both MCP profiles:

```bash
pnpm --filter @create-something/guard-performance-lab mcp:smoke
```

For a local end-to-end proof, `mcp:parity` intentionally resets the development datastore, writes a generic player, receipt, and reviewed source links through MCP, then verifies the player-scoped read. Reload the browser afterward to confirm it reads the same records:

```bash
pnpm --filter @create-something/guard-performance-lab mcp:parity
```

## Deployment boundary

The package has an approved Cloudflare Pages and D1 production path. Production remains fail-closed until the shared player ID, password verifier, and session secret are configured. Password creation or rotation, player reassignment, retention-policy changes, licensed feeds, and future production promotions remain explicit operational actions; no source change by itself grants those permissions.
