# @create-something/webflow-docs-index

Cloudflare Worker that indexes the Webflow developer docs (developers.webflow.com) and
returns exact passages for a question. The App Review MCP calls it through a service
binding (`app_review_search_developer_docs`, mode `passages`), so a reviewer can check an
app against the docs and quote the rule as the docs state it.

Status: built and tested locally. Not deployed (see First deploy).

## Tier Mapping

- Database: D1 holds pages and passages (with an FTS5 keyword index); Vectorize holds one
  vector per passage.
- Automation: a cron reads the docs' `llms.txt` tree, fetches the Markdown of each page,
  and indexes the pages whose body changed.
- Judgment: none here. The Worker returns docs text; the reviewer decides.

## How it works

1. **Discover** (daily): read `https://developers.webflow.com/llms.txt` and the section
   indexes it links. Pages of the deprecated v1 docs are not indexed. v2 beta pages are
   indexed as version `beta` and are searched only on request.
2. **Check** (hourly, 50 pages): fetch the pages that were checked longest ago. A page is
   indexed again only when the hash of its body changed. The docs repeat many pages under
   several URLs; one copy holds the passages and the others point at it.
3. **Chunk**: one passage per heading (H1 to H4), cut at paragraph or line ends above
   1,200 characters. The text is not rewritten. On API endpoint pages the `Errors`,
   `Examples` and `Types` sections are left out: they are 88% of the reference text and
   repeat on every endpoint.
4. **Search**: a keyword leg (FTS5 bm25, identifiers such as `custom_code:write` kept as a
   phrase) and a vector leg (`@cf/baai/bge-base-en-v1.5`) run at the same time. A reranker
   (`@cf/baai/bge-reranker-base`) orders the candidates of both legs. When a stage fails,
   the result comes from the stages that worked and names the failed one in `degraded`.

## Interface

- RPC, through a service binding: `search({ query, topK?, includeBeta? })` returns
  `{ passages, degraded }`. Each passage has `url` (with the section fragment),
  `headingPath`, `text`, `version`, `checkedAt` and `score`.
- `GET /health`: page and passage counts, pages never checked, oldest check.
- `POST /search`, `POST /admin/discover`, `POST /admin/ingest` (`{ "limit": 1-60 }`):
  need `Authorization: Bearer $DOCS_INDEX_ADMIN_TOKEN`. With the secret unset they
  answer 503.

## Measured result (2026-11-27)

`eval/questions.json` has 30 review questions, each with the docs page and the fact a
correct result must show. The questions come from recurring App Review finding types.
They are not exported from Airtable rejection records, and the search settings were
chosen on this same set, so read the numbers as a first check, not as a benchmark.

| | Docs site search (`searchDocs`) | This index |
|---|---|---|
| Correct fact from an expected page | 28 of 30 (in the generated answer) | 28 of 30 in the top 5; 27 in the top 3; 22 first |
| Result text | generated summary | exact docs text |
| Cites a v2 beta or v1 URL | 21 of 30 answers | 0 |
| Refused to answer | 1 (password fields on a user's site) | 0 |
| Median time | 7.3 s | 0.9 s (local run, see limits) |

Without the reranker the index scored 24 of 30 in the top 5 and 15 first.

The docs site search also showed a conflict in the docs: it gave 2,000 characters as the
inline script limit (the `register-inline` reference), and the Custom Code guide states
10,000.

Limits of the local run: SQLite in memory stands in for D1, and exact nearest-neighbour
search stands in for Vectorize (which is approximate). The embedding and rerank models
are the real ones. The time includes a local proxy to Workers AI and no Vectorize call.

Run it again:

```bash
pnpm eval:docs-site            # the docs site search
pnpm eval:embed-proxy          # second terminal: local Worker with the AI binding
pnpm eval:local                # this index, real crawl + chunk + search code
EVAL_SHOW=misses pnpm eval:local   # print the top results of each miss
```

## First deploy

Each step changes the Cloudflare account. Get approval before you run them.

```bash
wrangler d1 create webflow-docs-index          # put the ID in wrangler.toml
wrangler d1 migrations apply webflow-docs-index --remote
wrangler vectorize create webflow-docs --dimensions=768 --metric=cosine
# Before any vector is written: the search filters on `version`.
wrangler vectorize create-metadata-index webflow-docs --property-name=version --type=string
wrangler secret put DOCS_INDEX_ADMIN_TOKEN
pnpm deploy
```

Then load the index (about 1,100 pages; the cron would take about a day):

```bash
curl -X POST "$URL/admin/discover" -H "Authorization: Bearer $TOKEN"
# Repeat until "neverChecked" is 0.
curl -X POST "$URL/admin/ingest" -H "Authorization: Bearer $TOKEN" -d '{"limit":40}'
```

Deploy `packages/webflow-app-review-mcp/worker` after this Worker: its `DOCS_INDEX`
binding needs this service to exist.

## Changing the chunk rules or the embedding model

Bump `INDEX_VERSION` in `src/ingest.ts`. Every page is then indexed again as the cron
reaches it, or at once with the `/admin/ingest` loop. A model with another vector size
needs a new Vectorize index.
