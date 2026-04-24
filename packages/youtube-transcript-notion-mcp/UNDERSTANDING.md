# Understanding: @create-something/youtube-transcript-notion-mcp

> **An operational MCP that turns Supadata or YouTube transcript surfaces into normalized transcript records, enriches existing Notion pages in place, and can optionally poll a playlist on a schedule without relying on agent memory.**

## Ontological Position

**Mode of Being**: Operational MCP package

This package sits between volatile external sources (Supadata, YouTube transcript surfaces, and the YouTube Data API playlist surface) and a structured operator-owned sink (Notion). Its main burden is reliability under extraction and polling failure: transcript provider selection, page-source resolution, playlist state, normalization, and write safety all need to line up so the model can read first and write only when the operator has configured the target correctly.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| Supadata transcript + YouTube video metadata APIs | Primary production transcript path when configured |
| YouTube Data API playlist surface | Exact playlist membership and `date added to playlist` for scalable polling |
| YouTube mobile watch pages + caption tracks, then legacy Innertube transcript endpoint | Fallback transcript source and remaining failure mode |
| Steel + Puppeteer + a trusted Steel profile | Browser fallback when direct extraction is blocked, especially when YouTube starts trust-gating anonymous sessions |
| Notion API | Single-video persistence, playlist upsert, schema inspection, and search/fetch compatibility |
| `@create-something/mcp-core` | Worker telemetry wiring |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| operators | How to enrich an existing Notion item with transcript data, or optionally ingest one video or a playlist with deterministic dedup and durable polling state |
| MCP clients | How to read transcripts and fetch synced transcript documents through a ChatGPT-compatible MCP surface |
| future MCP authors | A pattern for combining read-first extraction, playlist polling, optional write-capable sync, and public-auth risk signaling in one remote MCP |

## Internal Structure

```text
src/
├── youtube.ts              → URL canonicalization and watch-page metadata parsing
├── playlist-state.ts       → playlist sync state primitives and in-memory store
├── playlist-service.ts     → YouTube Data API playlist reader + playlist→transcript→Notion pipeline
├── transcript.ts           → transcript cleanup, timestamp formatting, Notion-safe chunking
├── transcript-page.ts      → transcript header/body formatting shared by Notion-first and playlist workflows
├── transcript-service.ts   → Supadata provider, direct provider, browser fallback provider, provider chain
├── supadata.ts             → hosted transcript provider client, polling, metadata normalization
├── notion.ts               → Notion schema resolution, page source detection, dedup, page sync, transcript-body replacement, search/fetch
├── tools.ts                → MCP tool registration for transcript extraction, Notion page enrichment, and optional playlist surfaces
├── resources.ts            → status + transcript resources
├── prompts.ts              → transcript analysis prompt
├── stdio.ts                → local stdio MCP entrypoint for non-Cloudflare runtimes
└── config.ts               → runtime constants and env-derived defaults

worker/
├── index.ts                → Cloudflare Worker + Durable Object MCP entrypoint + scheduled playlist polling
├── package.json            → Worker runtime dependencies
└── wrangler.toml           → Cloudflare deployment config
```

## To Understand This Package, Read

1. **`README.md`** — operational scope, runtime assumptions, and validation path
2. **`src/transcript-service.ts`** — provider chain, error policy, and browser fallback behavior
3. **`src/notion.ts`** — page source detection, dedup, schema inference, transcript block persistence, and transcript replacement
4. **`src/tools.ts`** — public MCP/API surface and wrapper behavior
5. **`src/playlist-service.ts`** — optional playlist listing, durable polling logic, and per-item orchestration
6. **`worker/index.ts`** — remote transport, durable playlist state, scheduled polling, and auth boundary

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/transcript-service.ts`, `worker/index.ts` |
| Boot command | `pnpm --filter youtube-transcript-notion-mcp-worker dev` |
| Smoke command | `pnpm --filter @create-something/youtube-transcript-notion-mcp test && pnpm --filter @create-something/youtube-transcript-notion-mcp typecheck` |
| Validation surfaces | vitest output, typecheck output, `/` health JSON, `/mcp` Inspector session, Worker logs, telemetry rows |
| UI validation path | none |
| Escalation rule | Stop if the server needs live YouTube/Steel/Notion credentials that are not present, or if browser fallback reports `BOT_CHALLENGE`/`BOT_CHALLENGE_SUSPECTED` and the operator has not configured a trusted `STEEL_PROFILE_ID`. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| canonical video / playlist URL | Stable YouTube URL forms used for dedup and polling | `src/youtube.ts` |
| provider chain | Supadata first when configured, then direct transcript attempt, then Steel browser fallback | `src/transcript-service.ts`, `src/supadata.ts` |
| Notion-first enrichment | Resolve a YouTube URL from an existing Notion page, extract transcript/metadata, and update that same page in place | `src/notion.ts`, `src/tools.ts` |
| playlist sync state | Durable store of recent playlist-item signatures, last run, active lease, and last error/summary | `src/playlist-state.ts`, `worker/index.ts` |
| playlist-added timestamp | The exact YouTube playlist item timestamp used for Notion `Date` mapping and polling order | `src/playlist-service.ts` |
| public auth posture | Runtime warnings and security status that tell the operator when billable transcript providers or Notion tools are exposed without bearer protection | `src/config.ts`, `worker/index.ts` |
| trusted Steel profile guidance | Runtime status and bot-challenge diagnostics that tell the operator whether `STEEL_PROFILE_ID` is configured and what to do next | `src/transcript-service.ts`, `src/config.ts` |
| transcript chunking | Sentence-aware 1900-character chunks grouped into Notion-safe append batches | `src/transcript.ts` |
| schema-aware mapping | Runtime merge of env defaults, per-call overrides, and database heuristics | `src/notion.ts` |

## This Package Helps You Understand

- how to build a read-first MCP that still supports controlled write actions
- how to make an existing Notion item the source of truth instead of forcing every workflow through a new-row sync
- how to move polling state into durable storage instead of prompt-space agent memory
- how to keep search/fetch compatibility without giving up richer Apps SDK tool results
- how to normalize multiple transcript sources into one internal transcript shape

## Common Tasks

| Task | Start Here |
|------|------------|
| change transcript extraction behavior | `src/transcript-service.ts` |
| change playlist polling, cursor behavior, or replay rules | `src/playlist-service.ts`, `src/playlist-state.ts` |
| change Notion property inference or dedup | `src/notion.ts` |
| change public tool payloads | `src/tools.ts` |
| change remote auth, durable playlist state, or Worker scheduling | `worker/index.ts` |
| reproduce the production-backed local smoke | `pnpm mcp:youtube-transcript-notion:smoke:auto:infisical` |

---

*Last validated: 2026-04-24*
