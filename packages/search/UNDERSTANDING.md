# Understanding: @create-something/search

> **The cross-property semantic search worker that lets users and agents trace concepts across CREATE SOMETHING modes of being.**

## Ontological Position

**Mode of Being**: Operational search package

This package is a retrieval surface over the broader CREATE SOMETHING corpus. It is operational because the runtime depends on live embeddings, indexes, and endpoint behavior, but its user-facing value is epistemic: it reveals the connections between canon, research, experiments, services, and lessons.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| Vectorize | Stores semantic embeddings for retrieval |
| Workers AI | Generates embeddings for search and related-content flows |
| property content manifests and D1 sources | Provide the underlying searchable corpus |
| Cloudflare Worker runtime | Hosts `/search`, `/related`, `/story`, and `/health` endpoints |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| end users | How one concept appears across `.ltd`, `.io`, `.space`, `.agency`, and LMS |
| agents | Which related documents and content paths should be considered together |
| platform work | How live retrieval depends on manifests, indexes, and Worker runtime behavior |

## Internal Structure

```text
src/
├── index.ts                  → Worker/server entry point
├── cli/                      → indexing helpers and operational scripts
├── ...                       → retrieval, ranking, and endpoint logic
wrangler.toml                 → Worker runtime and binding configuration
```

## To Understand This Package, Read

1. **`README.md`** — endpoints, content sources, and runtime model
2. **`src/index.ts`** — request handling and search endpoint wiring
3. **`src/cli/index-content.ts`** — indexing path for search content
4. **manifest/content source code in dependent properties** — what actually enters the index

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `README.md`, `UNDERSTANDING.md`, `src/index.ts`, `wrangler.toml` |
| Boot command | `cd packages/search && pnpm dev` |
| Smoke command | `cd packages/search && curl http://localhost:8787/health` |
| Validation surfaces | `/health`, Worker logs, endpoint responses for `/search`, `/related/:id`, and `/story/:concept`, indexing output |
| UI validation path | none |
| Escalation rule | Stop if `/health` is green but semantic results are inconsistent with indexed content, or if Vectorize or Workers AI dependencies cannot be reproduced locally. |

## Key Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| story mode | concept journey grouped across properties | `/story/:concept` endpoint |
| related content | semantic adjacency lookup for one item | `/related/:id` endpoint |
| content manifest | metadata source for content that cannot live directly in D1 | README content-source sections |
| unified search | one retrieval surface across all CREATE SOMETHING properties | `/search` endpoint |

## This Package Helps You Understand

- how semantic retrieval stitches together the repo’s different modes of being
- where runtime search quality depends on indexing and embedding infrastructure
- how content-source heterogeneity is normalized into one search surface

## Common Tasks

| Task | Start Here |
|------|------------|
| inspect endpoint behavior | `README.md` and `src/index.ts` |
| rebuild or update the index | `src/cli/index-content.ts` |
| debug retrieval quality | Worker logs plus `/search` and `/story` responses |
| inspect content sources | README content-source sections |

---

*Last validated: 2026-03-09*
