# Agents: Guard Performance Lab

## Product boundary

This is a private-first player-development app. The app-owned local datastore is authoritative; browser storage is draft/recovery cache. Keep UI, HTTP API, and MCP on the same domain contracts. Do not add analytics, external writes, medical conclusions, rankings, or recruiting predictions.

The `LabService` command interface owns all mutations. UI and MCP callers must not perform whole-workspace read–modify–write operations. `JsonFileLabStore.mutate` supplies the cross-process lock and revision increment.

The operator MCP profile may manage the full workspace. Player MCP mode requires `GUARD_LAB_ROLE=player` and `GUARD_LAB_PLAYER_ID`; never expose operator reset/create-player capabilities, another player’s records, or an unscoped mutation response in that mode. Player engagement writes are always attributed to `player` — enforced on both the MCP surface and `POST /api/workspace/command`, not just one of them. Any new surface that accepts engagement must enforce the same override.

## Evidence provenance

`reviewer: 'codex'` is a valid `source-review` reviewer. Agent review is real evidence, so the obligation is transparency, not abstention: never collapse user-confirmed and agent-reviewed evidence into one "reviewed" count, and never present identity precision without the coverage and review split beside it (`summarizeFilmTargetCoverage`). Rendered positions synthesized between captured frames must stay distinguishable from captured ones (`isInterpolatedPlayer`); the captured revision never stores a synthesized coordinate.

Four validity rules are enforced in code, not convention. A benchmark must be able to fail: declare tracker seed frames to `verifyFilmIdentityCandidate` and satisfy `assessFilmIdentityIndependence` (non-seed positives, a directly readable jersey per segment, same-team confusable negatives). A rate must travel with its denominator (`positiveDecisionCount` and siblings). Zone has exactly one taxonomy, derived from `court` via `filmZone` — never stored as a second opinion, never a camera-band vocabulary. Projection labels state what happened: `estimated`, `operator-stated`, or `calibrated`, and only the last means a validated held-out homography. Above `MOVEMENT_CLAIM_MAX_INTERVAL_MS` between samples, no surface may present the wake as an observed path.

## Design authority

Consume Canon Performance tokens and components. Satoshi is the display/body face; IBM Plex Mono is the evidence/instrumentation face. Preserve hard geometry, decisive contrast, semantic rails, and visible receipts.

## Validation

```bash
pnpm --filter @create-something/guard-performance-lab check
pnpm --filter @create-something/guard-performance-lab test
pnpm --filter @create-something/guard-performance-lab build
pnpm --filter @create-something/guard-performance-lab mcp:smoke
```

Interactive changes also require the clean-state browser workflow recorded under `Primary verifier` in `.codex/guard-performance-lab-viewing-room/goal.md`. Assert any rendering invariant that does not need a real browser as an SSR component test (`src/lib/FilmTrafficCourt.test.ts`).
