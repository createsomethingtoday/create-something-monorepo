# Jev URL classification rollout — CRE-2060

## Why this workflow first

Source-backed ranking, not a claim of measured organization-wide traffic:

| Rank | Area | Repeated work replaced | Evidence / disposition |
| --- | --- | --- | --- |
| 1 | Site analyzer URL classification | Generative JSON classification for each discovered URL batch, up to two phases per review | Existing production Worker and clear path-role contract; live comparison below; selected for bounded rollout |
| 2 | App audit categorization | One Llama generation per app in batches of five | `webflow-apps-admin/workers/audit-agent/src/categorizer.ts`; excellent typed-choice fit, but only app name/slug are available and some category definitions overlap. Needs product-description evidence and labeled app corpus before replacement |
| 3 | Creator-response triage | Sonnet generation to classify readiness for re-review | `agent-sdk/agents/response_classifier.py`; potentially larger per-call savings, but results can change review status. Needs independently reviewed multilingual cases and ambiguous/negated-readiness coverage |
| 4 | Search reranking | Relevance decisions after vector retrieval | `search/src/index.ts`; plausible quality improvement, but adds latency and API spend rather than replacing a generation. Needs representative relevance labels and observed search traffic |
| 5 | Failure/evidence triage | Repeated selection among incident categories/runbooks | Prior CRE-2022 adapters remain draft; only advisory routing qualifies. Earlier evidence tests confused absent proof with contradiction, so no automatic approval/suppression rollout |

Existing retrieval/regex, authorization, billing, and review pass/fail gates remain code-owned. No inference is added where exact rules settle the answer. Jev is used through direct HTTP inside the automation; the host constructs receipts instead of asking Astra to serialize them.

CTX grounding: Codex session `0a93b163`, event `01307972`, provider session `01a0addb-9b89-7912-9972-cd47cad16e58`: first-wave PR #1687 supplied draft opt-in adapters, not production activation. Current GitHub readback confirmed it remained a draft. This focused change is independent of that unmerged PR.

## Frozen evaluation

`protocol.json` SHA-256: `bb53e17312c9727cdd314647d87b0c5dc77b26227eb27b067d5a15a344970b07`.
38 distinct cases: 22 paths from the existing Meetup W live smoke and 16 synthetic multilingual/opaque/instruction-like cases. Three repetitions per arm. Labels were written before calls by the operator; they are **path-role expectations**, not independent human judgments or page-content verification. No prompts/thresholds were tuned after observing results.

- Configured Groq `llama-3.3-70b-versatile`: HTTP 404 on all six batch calls, deterministic fallback 69/114 agreement. This does not establish the provider's cause of failure or a speed comparison against working inference. Original output retained in `results.json`.
- A separately labeled reference used the already-supported OpenAI `gpt-4o-mini`, same frozen cases. All HTTP requests succeeded. Median batch time **6,283ms**, 102/114 agreement (89.5%). Alternate home pages, opaque paths, and instruction-like paths accounted for differences; labels intentionally reserve homepage for the supplied start URL.
- Jev `jev-1.13.0` against that working reference: median batch **466ms**, 114/114 agreement, about **13.5x faster** at this classification step. Every URL retained in original order and all exact deterministic matches preserved. Two opaque/control paths fall back rather than being dropped or treated as homepage/error-page.

The sample establishes a promising bounded classifier improvement, not a 13.5x improvement in complete reviews, production traffic, general accuracy, or calibrated confidence. The 0.75 confidence gate is provisional; low confidence, malformed output, timeout, missing credentials and provider failure retain deterministic labels. No retries. Up to 32 ambiguous paths, four parallel batches of eight, 20KB per batch, and a two-second deadline per request. Batches with more than 32 ambiguous paths retain incumbent routing as a whole. Overlong paths inside an eligible batch remain deterministic.

Run offline behavior tests: `pnpm run test:classifier:offline`.
Run the live comparison with existing server-side credentials: `pnpm exec tsx evaluation/jev/run.ts`; use `EVAL_BASELINE=openai` for the reference. This invokes billed APIs. Never commit credentials. `openai-reference-results.json` includes status codes and automatic request-hash/model/usage receipts. Tests inject the HTTP boundary, not model correctness.

API and question contract checked against https://docs.typesafe.ai/api.md and https://docs.typesafe.ai/primitives/choice.md. These external docs do not establish this workflow's effectiveness; retained results do.

## Production activation and verification

`JEV_URL_CLASSIFIER_MODE` is server-owned: `off`, `canary`, or `active`. `TYPESAFE_API_KEY` is a Worker secret. Missing credentials always leave incumbent routing available. `useLLM:false` disables all inference.

- `off`: existing crawl classification remains unchanged.
- `canary`: existing crawls remain unchanged; authenticated `POST /classify-urls` exercises the new provider. Body: `{ "startUrl": "https://example.test/", "urls": ["https://example.test/", "https://example.test/manual-de-uso"] }`. It accepts at most 128 same-origin HTTP(S) URLs, only sends their paths, and returns results plus receipts. It never fetches the sites.
- `active`: both published-precheck classification call sites use Jev on ambiguous paths. The same authenticated endpoint remains available for automation/readback. Exact matches bypass inference. Jev cannot assign homepage/error-page, so it cannot remove a URL from the crawl queue.

`/health` reports mode, credential presence (never the secret), model, and path bound. Receipts log request hash, served model, elapsed time, accepted count, status, and provider token usage; they do not log URL paths or provider errors. Path labels and `requiredPages` discovery hints do not certify page contents. Existing review checks still inspect their own evidence.

Deploy the merged source disabled first using `--var JEV_URL_CLASSIFIER_MODE:off`; provision the secret through stdin; deploy canary with `--var JEV_URL_CLASSIFIER_MODE:canary`; verify authenticated output and unauthenticated denial before active deployment. Keep all other existing bindings/secrets and browser rollout configuration.

Rollback: deploy the same source with `--var JEV_URL_CLASSIFIER_MODE:off`, or use `wrangler rollback 2d292a2a-b4f3-4fbe-97c7-419413c43fbd` from this package for the recorded pre-rollout Worker. No schema migrations or data rewrites are introduced. Record the actual new deployment versions and live results in CRE-2060; source merge alone is not rollout proof.
