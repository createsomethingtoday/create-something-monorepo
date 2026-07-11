# Guard Performance Lab

A standalone, private-first coaching system for developing guards. Version 0.2 turns the Session 01 packet into a court-side workflow: prepare, run the session, align language, read the help, save a receipt, record engagement, and review progression.

## Privacy model

- Player profiles, receipts, evidence, and engagement state use a versioned app-owned local datastore at `.data/workspace.json` relative to the app process working directory (gitignored). Set `GUARD_LAB_DATA_PATH` to use an explicit private path.
- Production uses the private `GUARD_LAB_DB` Cloudflare D1 binding. The runtime fails closed when `ENVIRONMENT=production` and that durable binding is absent; the JSON file store remains development-only.
- Every mutation goes through one typed command service. An atomic cross-process lock prevents browser and Codex writes from overwriting one another; the visible workspace revision increments after each accepted command.
- Protected workspace data is never restored from browser storage; the server-scoped response is authoritative for every identity.
- The app has no analytics or domain-external data writes. Network access is limited to first-party identity verification/login and operator-requested source links.
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
