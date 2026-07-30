---
name: offer-resolution
description: Find, compare, and verify public coupon and promo offers, including public LTK and creator codes, for a specific merchant, need, budget, ZIP code, channel, and deadline. Use when a user wants current savings or asks whether an influencer, retailer, affiliate, search, or deal-site offer is reliable. Do not use for continuous monitoring, automated purchasing, bulk scraping, coupon creation, or historical lift analysis.
---

# Offer Resolution

Resolve a user-triggered shopping request through public discovery and deterministic evidence scoring. Use one workflow across merchants and source types; do not create a separate skill for each retailer, platform, or scenario.

## Workflow

1. Normalize the request into merchant, need, budget, currency, five-digit US ZIP code, deadline with year, observation time, and acceptable channels. Ask only for an essential missing or ambiguous fact.
2. Read [references/source-registry.md](references/source-registry.md) before discovery. Search the applicable locations in its order, beginning with official retailer evidence.
3. Record each candidate as an observation. Preserve its direct URL, publisher, observation time, access state, offer terms, code evidence, eligibility facts, fulfillment evidence, and corroborating URLs. Include conflicting, expired, inaccessible, and uncertain candidates instead of silently dropping them.
4. Run the candidate set through `@create-something/offer-resolution` or call `resolve_offer_evidence` when the Offer Find Agent is available. Never calculate, invent, or edit a reliability score yourself.
5. Present `recommend`, `verify`, `lead`, and `rejected` separately. Include projected savings, direct links, score components, caps, reasons, and receipt hashes. Say plainly when no candidate is reliable enough to recommend.

For deterministic evidence files inside this repository, run:

```bash
pnpm --filter @create-something/offer-resolution build
node packages/offer-resolution/dist/cli.js resolve --input <evidence.json>
```

For a current public search with the Agents SDK and an approved existing API key, run:

```bash
node packages/offer-resolution/dist/cli.js live \
  --merchant "Abercrombie & Fitch" \
  --need "clothing order" \
  --budget 200 \
  --zip 76060 \
  --deadline 2026-08-09
```

## Reliability boundary

- Treat official retailer and inspectable checkout evidence as verification sources.
- Treat public LTK, creator-owned pages, and affiliate feeds as corroboration unless retailer evidence verifies their claims.
- Treat search indexes and deal aggregators as leads.
- Cap app-only, blocked, stale, terms-missing, code-unverified, eligibility-unknown, or deadline-unknown evidence as directed by the resolver.
- Reject expired, revoked, not-yet-started, budget-conflicting, location-conflicting, channel-conflicting, membership-conflicting, or deadline-missing offers.
- Preserve deterministic output: identical normalized evidence must yield identical decisions and receipt hashes.

## Safety and access

- Do not purchase, add to cart, submit checkout, message a creator, subscribe, or create monitoring.
- Do not bypass login, robots controls, rate limits, app-only access, or other technical restrictions.
- Do not use private LTK APIs, assume an LTK partnership, or bulk scrape creator content.
- Do not infer redistribution, storage, or commercial reuse rights from public availability. Return links and short evidence summaries.
- Keep historical lift analysis outside this skill; it requires time-series exposure and conversion data plus a separate measurement design.

## Output

Lead with the best resolver-backed result. For every candidate, report the status, expected savings, reliability score, material constraints, source URL, observation time, caps or rejection reasons, and receipt hash. Distinguish current verification from stale fixture or search evidence.
