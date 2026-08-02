# Offer Resolution

`@create-something/offer-resolution` turns current public offer observations into deterministic, provenance-backed decisions. It owns the domain service for finding, evidence-verifying, and deadline-bounded offer watches. The repo-owned Skill, CLI, Agents SDK path, HTTP adapter, MCP server, and widget all consume this one policy surface.

## Public interface

```ts
import {
  createFileOfferWatchRepository,
  createOfferService
} from '@create-something/offer-resolution';

const service = createOfferService({
  discovery: { discover: async () => observations },
  watches: createFileOfferWatchRepository({ filePath: '/explicit/state/watches.json' })
});

const found = await service.findOffers(request);
const verified = await service.verifyOffer({ request, observation });
const watched = await service.watchOffers({ request, until, idempotencyKey });
```

The resolver owns every score, cap, ranking, status, and receipt hash. Public callers supply the shopping constraints but not `asOf`; the service records the observation time when each run begins. Discovery runs in two stages: public LTK first, then supplemental corroboration and merchant-gap filling. Exact merchant requests stay exact. LTK priority controls search order, not confidence. Search and deal sources remain leads, public LTK and creator sources remain corroboration, and official source claims are checked against a trusted merchant-domain registry.

Interactive ChatGPT and Codex hosts should perform bounded LTK-first public discovery, then call `resolveOffers` with the factual observations. The service records observation time and applies the same deterministic policy without invoking a nested agent. `findOffers` remains the server-side discovery path for scheduled watches and hosts without public-web capability.

Both paths return `ltkOffers` first, followed by `supplementalOffers`. Pages that contain no concrete coupon, numeric discount, or explicit shipping offer are isolated in `evidence` without copy/watch actions. Rejected observations remain in the deterministic resolution receipt but are not rendered as usable offers. `observedAt` and the top-level `receiptHash` make each search-run boundary explicit.

`watchOffers` creates one durable watch for a stable idempotency key. `runDueWatches` is a bounded scheduler entrypoint: a stable run key creates at most one history record per watch, failures preserve the prior successful receipt, and no notification or purchase action is performed.

## Commands

Resolve a saved evidence set without a model call:

```bash
pnpm build
node dist/cli.js resolve --input fixtures/abercrombie-august-9.json
```

Run current public discovery through the one-agent Agents SDK path:

```bash
node dist/cli.js live \
  --category health_and_beauty \
  --need "health and beauty products" \
  --budget 100 \
  --zip 76060 \
  --deadline 2026-08-09
```

The live command accepts either `--merchant` or the supported `--category health_and_beauty`. Category search fans out deterministically to Ulta Beauty, Sephora, CVS Pharmacy, Walgreens, Target, and OSEA. It requires an approved `OPENAI_API_KEY`, uses hosted public web search, converts the completed search history into schema-constrained factual evidence, and returns the same domain-service result used by other adapters. Date-only publication and offer-window evidence is retained at date precision and is never upgraded to the crawl time; malformed candidates fail closed rather than changing the whole receipt. It performs no purchases, cart mutation, messaging, subscriptions, unbounded monitoring, access-control bypass, or private LTK access.

## Verification

```bash
pnpm verify
```

The verifier type-checks, runs unit and boundary tests, builds the package, executes the deterministic representative acceptance scenario, and validates the repo-owned skill. The fixture uses synthetic codes and is not evidence that any coupon is currently valid.

## Agent Legibility Contract

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/agent.ts`, `src/cli.ts`, `src/http.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm verify` |
| Validation surfaces | LTK-first stage plan, bounded category fan-out, lane grouping, component scores, policy caps, source registry, decision status, receipt hash, domain service, HTTP contract, persistent watch identity/history, agent-service parity, deterministic acceptance |
| UI validation path | `packages/offer-savings-app` renders this package's `UserOffer` contract; verify there with protocol and browser acceptance |
| Escalation rule | stop on private access, unverifiable official domains, missing eligibility or fulfillment evidence, purchase requests, unbounded monitoring, external notifications, and redistribution or partnership assumptions |
