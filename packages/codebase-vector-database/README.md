# @create-something/codebase-vector-database

Cloudflare Worker for code similarity over uploaded code bundles.

This is the upload-first implementation of the code-bundle vector database. The same ingestion path can later be called by an AWS S3 puller after it retrieves a ZIP bundle.

## Tier Mapping

- Database: D1 stores bundle and chunk metadata; Vectorize stores code embeddings.
- Automation: Worker endpoints extract ZIPs, chunk code, generate Workers AI embeddings, and upsert vectors.
- Judgment: source metadata, ingest runs, and policy/evidence fields are persisted so review policy can be layered on later.

## Endpoints

- `GET /health`
- `GET /dashboard`
- `GET /share`
- `GET /api/share/summary`
- `GET /api/share/bundles`
- `GET /api/share/languages`
- `GET /api/share/overlaps`
- `POST /api/code-bundles/upload`
- `POST /api/code-bundles/ingest-url`
- `POST /api/code-bundles/query`
- `GET /api/code-bundles/:bundleId`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/bundles`
- `GET /api/dashboard/languages`
- `GET /api/dashboard/overlaps`
- `GET /api/dashboard/semantic-neighbors`

Uploads, code reads, similarity queries, and dashboard data APIs require
`Authorization: Bearer $CODE_INDEX_ADMIN_TOKEN` or `X-API-Key:
$CODE_INDEX_ADMIN_TOKEN`. `/health` and the static `/dashboard` shell are public;
the dashboard asks for the API key before loading corpus data.

`/share` is the PM-safe public visualization. It loads only aggregate corpus
counts, bundle names, language summaries, and exact overlap edges from
`/api/share/*`. The share APIs redact local source paths, repositories, bundle
hashes, content hashes, source code, and semantic probe results.

`/api/code-bundles/upload` accepts `multipart/form-data` with a `bundle` ZIP file and optional fields:

- `bundleId`
- `sourceUri`
- `repository`
- `ref`
- `commitSha`
- `metadata`

`/api/code-bundles/ingest-url` accepts JSON:

```json
{
  "bundleUrl": "https://example.com/code.zip",
  "repository": "owner/repo",
  "ref": "main",
  "commitSha": "abc123",
  "metadata": { "source": "manual-presigned-url" }
}
```

Similarity query:

```json
{
  "query": "worker endpoint that validates bearer auth before writing to D1",
  "limit": 10,
  "repository": "owner/repo"
}
```

Dashboard:

- `/dashboard` serves a read-only browser dashboard.
- `/share` serves a no-key aggregate visualization for sharing progress.
- `/api/dashboard/overlaps?minSize=200&limit=80` returns bundle-to-bundle exact chunk overlap edges from D1.
- `/api/dashboard/semantic-neighbors?bundleId=<id>&samples=3&limit=8` samples representative chunks from one bundle and queries Vectorize live to find semantically close bundles.

The dashboard does not export vectors. It visualizes D1 metadata, exact overlap edges, live semantic searches, and per-bundle Vectorize probes directly from the Worker.

## Setup

```bash
wrangler d1 create codebase-vector-database
wrangler vectorize create codebase-code-similarity --dimensions 768 --metric cosine
wrangler secret put CODE_INDEX_ADMIN_TOKEN
pnpm --filter @create-something/codebase-vector-database check
```

## Embedding Coverage

Production ingestion uses the configured Workers AI binding. Local unit tests may mock
the binding, but similarity evidence should come from a real Worker/Workers AI run.

All text/code content is embedded by splitting files into chunks. The caps are still
needed because embedding models have per-request input limits; the pipeline handles
that by making smaller chunks, not by silently dropping code.

Relevant vars:

- `CODE_CHUNK_MAX_CHARS`: requested max code characters per chunk.
- `CODE_EMBEDDING_MAX_CHARS`: max full embedding input, including metadata headers.
- `CODE_EMBEDDING_CONTEXT_RESERVE_CHARS`: reserved budget for repository/path/language/line metadata.

The effective chunk size is:

```text
min(CODE_CHUNK_MAX_CHARS, CODE_EMBEDDING_MAX_CHARS - CODE_EMBEDDING_CONTEXT_RESERVE_CHARS)
```

Chunk embeddings fail loudly if the final embedding input still exceeds the budget.
That means code is not silently truncated; lower `CODE_CHUNK_MAX_CHARS` or increase
`CODE_EMBEDDING_MAX_CHARS` for the selected embedding model.

If Workers AI rejects a batch or generated/minified slice, ingestion retries with
smaller real embedding calls. A tiny slice that still fails is embedded as a
reversible codepoint-escaped representation of that exact code slice, then averaged
back into the parent chunk vector. This keeps one vector per code chunk without
mock vectors or silent code drops.

## Bundle Identity

Each ingest stores two hashes:

- `bundleHash`: SHA-256 of the uploaded archive bytes. Use this for artifact provenance.
- `contentManifestHash`: SHA-256 of the normalized, indexed text-file manifest. Use this for code identity.

When `bundleId` is omitted, the Worker now reuses an existing bundle with the same
`contentManifestHash`, or creates `code_bundle_<contentManifestHash prefix>`. This
means a ZIP that is repackaged with different archive metadata but identical code
does not create a second set of vectors by default. Supplying `bundleId` remains an
explicit override when separate records are desired.
