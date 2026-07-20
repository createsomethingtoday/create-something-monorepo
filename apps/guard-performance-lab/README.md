# Guard Performance Lab

A standalone, private-first coaching system for developing guards. Version 0.5 adds an immutable film-trace workflow: a supplied game is analyzed once, the derived player traffic is stored privately, and the operator can scrub, correct, reload, and export the captured revision without rerunning inference. Identity-only revision 3 preserves the revision-2 player field and associates #13 from direct jersey evidence plus bounded continuity; verified substitutions are stored as `inactive`, while ambiguous spans fail closed as `unresolved`.

## Privacy model

- Player profiles, receipts, evidence, engagement state, derived film coordinates, and correction provenance use a versioned app-owned local datastore at `.data/workspace.json` relative to the app process working directory (gitignored). Set `GUARD_LAB_DATA_PATH` to use an explicit private path.
- Production uses the private `GUARD_LAB_DB` Cloudflare D1 binding. The runtime fails closed when `ENVIRONMENT=production` and that durable binding is absent; the JSON file store remains development-only.
- D1 stores immutable film frames in ordered chunks so large captured traces do not exceed SQLite row-value limits. Corrections remain a small append-only overlay and do not rewrite or increment the analysis revision.
- Every mutation goes through one typed command service. An atomic cross-process lock prevents browser and Codex writes from overwriting one another; the visible workspace revision increments after each accepted command.
- Protected workspace data is never restored from browser storage; the server-scoped response is authoritative for every identity.
- The app has no analytics or domain-external data writes. Network access is limited to first-party identity verification/login and operator-requested source links.
- The starter profile is generic and contains no child-identifying information.
- Resetting local data restores the generic profile and removes saved receipts, evidence, and engagement events.
- Source-video bytes and detector weights are never written to the application datastore or committed. Only hashes, model provenance, derived coordinates, unresolved intervals, and correction receipts persist.

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

The production preview runs at `http://127.0.0.1:4173` and is the owning surface for the Playwright workflow recorded in `.codex/guard-performance-lab-app/goal.md`.

## One-run film trace

The analyzer requires an operator-supplied source video and YOLOX ONNX model. Both remain outside version control. It decodes the complete source sequentially, captures one immutable analysis revision, and records unresolved target intervals rather than inventing positions. Revision 2 first rejects detections outside the foreground court closest to the camera, then classifies central-torso evidence using this game's white-jersey teammate / other-colored opponent rule. Opposite-court, official, and sideline detections stay in the audit receipt but never render as traffic. A deterministic full-track vote stabilizes team roles without another inference execution.

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

pnpm --filter @create-something/guard-performance-lab film:import:http \
  --analysis /private/path/full-analysis-r2.json \
  --corrections /private/path/benchmark-corrections.json
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
  --output /private/path/full-analysis-r3.json \
  --analyzed-at <fixed-receipt-time>
```

`Film trace` then replays the captured top-down traffic. The slider works in both directions, #13 carries an adjustable wake that breaks across unresolved gaps and inactive substitutions, and JSON/SVG exports are derived from the persisted revision. Operator corrections require direct-evidence text and append provenance; player-scoped identities cannot attach or correct analyses and can read only their assigned player.

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
  --reviewer user \
  --output /private/path/on-court-17m40-mask.json \
  --device mps
```

`--seed-box` uses the extracted-frame coordinate space; the receipt scales every box and foot point back to the declared source dimensions. The script records the exact model SHA-256, device, seed, samples, and evidence. A mask receipt is a private candidate, not a promotable film revision by itself; benchmark and court-calibration gates still apply.

Combine reviewed stint receipts and fuse them against the reprocessed detector field. Same-state overlaps are merged so a direct-number reseed can safely bridge a chunk boundary; conflicting participation states, mixed sources, coordinate spaces, or model receipts are rejected. Fusion also rejects raw opponent evidence and terminates a seed after more than 3.5 seconds without an accepted target, even if SAM2 later attaches to another player. The command writes both the combined audit receipt and a non-promotable candidate for held-out review:

```bash
pnpm --filter @create-something/guard-performance-lab film:fuse:mask-tracks \
  --analysis /private/path/full-analysis-r2-reprocessed.json \
  --mask-track /private/path/stint-1-mask.json \
  --mask-track /private/path/stint-2-mask.json \
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

## First-party identity and production

Guard Lab accepts only exact server-side subject bindings:

- `GUARD_LAB_OPERATOR_SUBJECTS`: comma-separated operator subjects.
- `GUARD_LAB_PLAYER_BINDINGS`: JSON object mapping identity subject to assigned player ID.
- `CS_IDENTITY_AUDIENCE=guard-performance-lab` with the standard CREATE SOMETHING issuer/JWKS variables.
- `ALLOW_CS_AUTH_PREVIEW=true` requires an explicit non-production `GUARD_LAB_DEV_SCOPE=operator` or `player:<id>` and is rejected in production.

Every layout and `/api/*` data route resolves Canon access. Player HTTP and MCP calls are scoped from the binding; a caller-supplied different player ID is denied. Stdio MCP requires `GUARD_LAB_MCP_LAUNCHER=trusted` and an explicit `GUARD_LAB_MCP_SCOPE`; remote MCP callers must pass bearer verification before a tool server is constructed.

Production hosting is Cloudflare Pages plus D1. Apply migrations before deploying. Keep a D1 export and the previous Pages deployment ID before promotion; rollback the Pages deployment first, then restore the corresponding D1 export only if the schema/data change requires it. Private player records are retained until an operator explicitly deletes or resets them; exports and rollback artifacts must remain private and follow the same deletion decision.

The MCP surface provides program/workspace resources plus guidance, evidence review, artifact-search preparation, evidence registration, receipt, and engagement tools. Operator-only create-player and reset tools are absent in player mode. Every player mutation response is filtered back to that one profile, and player engagement is attributed to the player even if a caller supplies another source. Codex may locate collegiate/professional sources using its own web tools, but saved evidence must carry provenance; video is linked, not copied.

## Fonts and network boundary

Satoshi and IBM Plex Mono are self-hosted under `static/fonts/`. The app consumes Canon’s Performance color tokens without importing Canon’s remote Fontshare stylesheet or its all-language font bundle. Runtime network activity is limited to the app, CREATE SOMETHING Identity endpoints, the configured remote MCP boundary, and evidence links a person explicitly opens.

Verify both MCP profiles:

```bash
pnpm --filter @create-something/guard-performance-lab mcp:smoke
```

For a local end-to-end proof, `mcp:parity` intentionally resets the development datastore, writes a generic player, receipt, and reviewed source links through MCP, then verifies the player-scoped read. Reload the browser afterward to confirm it reads the same records:

```bash
pnpm --filter @create-something/guard-performance-lab mcp:parity
```

## Deployment boundary

The package now has an approved Cloudflare Pages and D1 production path. Production remains fail-closed until exact legitimate subject bindings are supplied. New credentials, real-user assignments, retention-policy changes, licensed feeds, and future production promotions remain separately approval-gated; no source change by itself grants those permissions.
