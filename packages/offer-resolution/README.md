# Offer Resolution

`@create-something/offer-resolution` turns current offer observations into deterministic, provenance-backed decisions. It is the Automation layer for the repo-owned `offer-resolution` skill and the read-only Offer Find Agent.

## Public interface

```ts
import { findOffers } from '@create-something/offer-resolution';

const result = findOffers(request, observations);
```

The resolver owns all scores, caps, rankings, statuses, and receipt hashes. Agent or UI callers supply facts only. Discovery runs in two stages: public LTK first, then supplemental corroboration and merchant-gap filling. LTK priority controls search order, not confidence. Search and deal sources remain leads, public LTK and creator sources remain corroboration, and official source claims are checked against a trusted merchant-domain registry.

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

The live command accepts either `--merchant` or the supported `--category health_and_beauty`. Category search fans out deterministically to Ulta Beauty, Sephora, CVS Pharmacy, Walgreens, Target, and OSEA. It requires an approved `OPENAI_API_KEY`, uses hosted public web search, and stops when `resolve_offer_evidence` returns its JSON receipt. It performs no purchases, cart mutation, messaging, subscriptions, continuous monitoring, access-control bypass, or private LTK access.

## Verification

```bash
pnpm verify
```

The verifier type-checks, runs unit and boundary tests, builds the package, executes the deterministic representative acceptance scenario, and validates the repo-owned skill. The fixture uses synthetic codes and is not evidence that any coupon is currently valid.

## Agent Legibility Contract

<!-- prettier-ignore -->
| Field | Value |
| --- | --- |
| Entry point | `src/index.ts`, `src/agent.ts`, `src/cli.ts` |
| Boot command | `pnpm build` |
| Smoke command | `pnpm verify` |
| Validation surfaces | LTK-first stage plan, bounded category fan-out, lane grouping, component scores, policy caps, source registry, decision status, receipt hash, deterministic acceptance summary, agent tool boundary |
| UI validation path | none; the package emits machine-readable decisions |
| Escalation rule | stop on private access, unverifiable official domains, missing eligibility or fulfillment evidence, purchase or monitoring requests, and redistribution or partnership assumptions |
