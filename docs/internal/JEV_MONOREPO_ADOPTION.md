# TypeSafe / Jev monorepo adoption

Tracking: CRE-2022. Tier: Judgment. Date: 2026-09-17.

## Delivered for review

A private, server-side `@create-something/jev-client` package provides Choice/Noul validation, explicit credentials, bounded payloads, timeout, no retries, served model identity, and reservation-before-network behavior. `choose`, `selectCandidate`, and `reviewEvidence` add reusable abstention and evidence-preserving recommendations. Thresholds are provisional, not measured accuracy guarantees.

Two existing application functions accept explicit Jev options:

- `webflow-apps-admin/workers/audit-agent/src/categorizer.ts`: `categorizeApp(env, app, jev)` sends only name/slug and returns `other` on uncertainty or provider failure. Existing Workers AI behavior remains the default. Jev supplies no generated explanation; the reason string describes host handling.
- `webflow-site-analyzer-mcp/src/url-classifier.ts`: `classifyUrls(urls, startUrl, { jev })` sends only ambiguous URL paths. Exact homepage and recognized pattern classifications remain deterministic. No URLs are discarded, and model judgments do not certify required-page compliance. `useLLM: false` disables Jev too.

The local `ops/jev-runbooks/review.mjs` command supports diagnostic routing, selection among supplied candidates (files, documents, runbooks, handlers), and evidence review. It records the input hash and recommendation in a new output file. The single-host ledger reserves before sending, retains reservations after failed calls, refuses a raised existing limit, and abstains on concurrent lock contention. It is not a distributed Worker ledger or provider billing reconciliation.

These are opt-in library integrations and an executable local command. Production endpoints do not yet supply Jev options. No production rollout is claimed.

## Source-grounded rollout inventory

| Existing surface | Fit | Current disposition / promotion requirement |
| --- | --- | --- |
| Audit app categorizer | Choice over existing categories | Adapter tested; Worker needs server-side credential, atomic shared budget binding, labeled category cases and canary |
| Site analyzer URL classifier | Choice on ambiguous paths | Adapter tested; owning host needs explicit configuration and labeled non-English/ambiguous URL corpus |
| Coding failure triage | Choice of known diagnostic runbook | Local command tested with one synthetic live call; guidance only |
| Search (`packages/search/src/index.ts`) | Candidate selection or Score reranking after Vectorize retrieval | Candidate primitive available; endpoint wiring awaits relevance corpus and latency comparison; embeddings stay unchanged |
| Hub (`packages/cs-mcp-hub/src/problem-routing.ts`) | Recommend a known routing profile | Candidate primitive available; preserve deterministic risk/human gates; no exposure or authorization changes |
| Agent SDK (`packages/agent-sdk/agents/response_classifier.py`) | Creator-response intent Choice plus independent Noul labels | Deferred: Python adapter and multilingual labels needed; readiness recommendation can change review status, so evaluate before switching |
| Ground (`packages/ground`) | Annotate findings for review | Existing separate CRE-2019 pilot remains preserved; independent labels still needed; never suppress findings |
| Workflow receipts/evidence | Compare claims with observed evidence | Review primitive available; reconciler gates and provenance remain authoritative; compiler stays provider-free |
| Orchestration postmortem analyzer | Semantic category recommendation | Deferred until incident corpus; current output drives proposed safeguards, requiring reviewed adoption |
| Clearway SMS parser | Intent routing plus candidate-based entity selection | Deferred: booking/cancellation side effects and date/entity resolution need dedicated tests; a Choice alone cannot replace extraction |
| Concierge next-step | Optional interpretation before deterministic next-step rules | Deferred: patient/recruiter workflow policy and data minimization must be specified per host |
| Authorization, identity, billing, policy enforcement | No model substitution for exact rules | Excluded; Jev confidence never grants permission |
| Generative copy, code, images, embeddings | Wrong primitive for replacement | Excluded; retain generative/embedding models |

This is an initial reviewed inventory, not a claim that every package was audited or integrated. Expand by named owning workflow with source evidence, not blanket provider replacement.

## Promotion boundary

For each runtime consumer: freeze representative cases; have independent reviewers label outcomes; compare existing behavior, abstention burden, latency and cost; provision an atomic aggregate budget and server-side secret; expose an operator-controlled enable/disable switch; canary through the owning PR/deployment workflow; verify live results; record rollback and production readback in Linear. Shared thresholds must not silently become universal policy.

Rollback for this change is to omit `jev` options (current default) or disable LLM classification. No schema migration or data rewrite is involved. The local CLI creates recommendation artifacts only.

## Provenance and evidence

CTX Codex session `3c1cd2ff`, event `d2ed1f48` (provider session `01a0ab3f-991d-71c2-a66f-714c93516424`) located the earlier architecture review and client/runbook prototype in the preserved CRE-2019 checkout. Shared client and failure routing were reused; this branch does not copy the entire pilot or its private evidence.

Current API contract checked against https://docs.typesafe.ai/api.md and the documentation index; Choice design checked against the current primitive and hierarchical classification cookbook.

Validation: shared client/decision/runbook tests and application adapter tests; both affected TypeScript packages typecheck after building observability. A real CLI call on the committed synthetic missing-compiler fixture returned `dependency` from `jev-1.13.0`, with `canExecute:false` and `mayEditCode:false`. This proves connectivity and composition only, not production accuracy or calibration. A $0.01 ledger reservation bounded this one-call smoke; actual billing was not reconciled.

Worktree disposition: preserved at `/private/tmp/cre-2022-jev-integration`, branch `codex/CRE-2022-agent-worktree`, until review and per-workflow promotion.
