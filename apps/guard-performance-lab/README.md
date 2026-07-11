# Guard Performance Lab

A standalone, private-first coaching system for developing guards. Version 0.2 turns the Session 01 packet into a court-side workflow: prepare, run the session, align language, read the help, save a receipt, record engagement, and review progression.

## Privacy model

- Player profiles, receipts, evidence, and engagement state use a versioned app-owned local datastore at `.data/workspace.json` relative to the app process working directory (gitignored). Set `GUARD_LAB_DATA_PATH` to use an explicit private path.
- Every mutation goes through one typed command service. An atomic cross-process lock prevents browser and Codex writes from overwriting one another; the visible workspace revision increments after each accepted command.
- Browser `localStorage` is only a recoverable draft/cache layer.
- The app has no analytics or external network writes.
- The starter profile is generic and contains no child-identifying information.
- Resetting local data restores the generic profile and removes saved receipts, evidence, and engagement events.

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

## AI-native contract

One typed guidance engine owns program stage, requested coach context, safety state, evidence separation, and the next interaction. It is used by:

- the in-app Agent + Evidence workspace;
- `POST /api/guide`;
- the local stdio MCP server.

Browser mutations use `POST /api/workspace/command` with one of five typed actions: select player, create player, save receipt, register evidence, or record engagement. Whole-workspace `PUT` replacement is intentionally unsupported.

The coach supplies short observations only when requested. The agent/program owns the sequence and receipt cues.

## Codex / MCP

Operator mode exposes full local workspace management:

```bash
pnpm --filter @create-something/guard-performance-lab mcp
```

Player mode registers only player-safe capabilities and filters every read/write to one player:

```bash
GUARD_LAB_ROLE=player \
GUARD_LAB_PLAYER_ID=developing-guard \
pnpm --filter @create-something/guard-performance-lab mcp
```

The MCP surface provides program/workspace resources plus guidance, evidence review, artifact-search preparation, evidence registration, receipt, and engagement tools. Operator-only create-player and reset tools are absent in player mode. Every player mutation response is filtered back to that one profile, and player engagement is attributed to the player even if a caller supplies another source. Codex may locate collegiate/professional sources using its own web tools, but saved evidence must carry provenance; video is linked, not copied.

## Fonts and network boundary

Satoshi and IBM Plex Mono are self-hosted under `static/fonts/`. The app consumes Canon’s Performance color tokens without importing Canon’s remote Fontshare stylesheet or its all-language font bundle. Runtime network activity is limited to the local app/API unless a person explicitly opens a saved evidence link.

Verify both MCP profiles:

```bash
pnpm --filter @create-something/guard-performance-lab mcp:smoke
```

For a local end-to-end proof, `mcp:parity` intentionally resets the development datastore, writes a generic player, receipt, and reviewed source links through MCP, then verifies the player-scoped read. Reload the browser afterward to confirm it reads the same records:

```bash
pnpm --filter @create-something/guard-performance-lab mcp:parity
```

## Deployment boundary

The package is production-buildable, but public deployment, analytics, remote accounts, external persistence, licensed feeds, and provider credentials are approval-gated. The v0.2 completion target is a verified local production build.
