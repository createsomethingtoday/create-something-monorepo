# Selective context: reproduction package

This synthetic experiment accompanies the paper **A Fresh Index Can Still Carry Old Facts**. No client data, private transcripts, credentials, model calls, or live-service checks are used.

Use Node 22.21.1 from a checkout containing the article:

```sh
node packages/io/static/research/selective-context/run.mjs --output /tmp/selective-context-results.json
```

The runner imports `searchContext` from `packages/database-layer/scripts/atlas-context.mjs`, the implementation behind the local CLI, rather than a standalone demonstration engine. Its twenty queries use a temporary synthetic corpus and `refresh: 'off'`. Recovery tests exercise the actual refresh module with a fixture renderer, not the full topology generator. No production Atlas/Substrate endpoint or real inventory is exercised, and the locally replayed implementation is not asserted to be deployed. Downloading `run.mjs` alone is insufficient; it needs the checkout. No dependency installation is needed. All synthetic workspace changes occur in temporary directories that are removed on completion. The optional output path is the only durable write.

## Frozen inputs

- [Workshop index](corpus/README.md)
- [Record ownership](corpus/operating-loop.md)
- [Delivery planning](corpus/business-recommendations.md)
- [Workshop components](corpus/topology-inventory.md)
- [Operation boundaries](corpus/management-surface.md)
- [Acceptance checkpoints](corpus/operating-slices.md)
- [Finding evidence](corpus/agent-routes.md)
- [20 questions and expected headings](queries.json)
- [Input hashes](freeze.json)

The same author wrote the corpus and questions. They were frozen before scoring and held out from implementation tuning, not independently authored or blindly judged. There was no post-score corpus, query, or retriever tuning. Gates: top module at least 90%; exact citations; respected byte caps; honest freshness/authority fields; passing selected controls. Passage-level scores are also reported.

## Results and controls

[Primary receipt](results.json): Node 22.21.1, macOS arm64. [First-run receipt](results-node26-first-run.json): Node 26.11.0. Both selected the expected module and passage for 19 of 20 queries. Q05 missed its intended authority distinction even within the top five. All 60 byte checks, 193 returned citation checks, and seven selected Node tests passed. These are repeated contract checks, not independent statistical samples.

The runner records source hashes for `atlas-context.mjs`, `atlas-context-refresh.mjs`, and `agent-wiki-passages.mjs`. Retrieval runs with refresh off against this synthetic corpus. Recovery coverage comes from these existing suites, selected by explicit test-name patterns in the receipt:

- `packages/database-layer/test/atlas-context-refresh.test.mjs`: changed inputs, concurrent reads, retained last-good results, renderer failure and timeout, input race, unavailable cache, dead-lock recovery.
- `packages/database-layer/test/atlas-context.test.mjs`: changed documents, corrupt parsed index, unknown dates, missing modules, hard byte limits and invalid arguments.

These fixture tests exercise the actual implementation. They do not establish live-service freshness, production uptime, general retrieval quality, token savings, or latency superiority. Source age uses a fixed October 15 fixture clock against October 1 observations. No CTX comparison was possible or attempted.

Expected output is JSON with summary, per-query outcomes, control-suite results and gate booleans. A nonzero exit means an input hash mismatch or a failed gate; inspect the receipt and named test before interpreting the result. Never silently rewrite expected answers after a failed run.
