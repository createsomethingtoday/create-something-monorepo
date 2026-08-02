---
name: offer-resolution
description: Find, compare, verify, and create a bounded deadline-based watch for public coupon and promo offers, beginning with public LTK and creator codes, for a merchant or supported shopping category, need, budget, ZIP code, channel, and deadline. Use when a user wants current savings, asks whether an influencer or retailer offer is reliable, or wants the same bounded request checked again. Do not use for unbounded monitoring, external notifications, automated purchasing, bulk scraping, coupon creation, or historical lift analysis.
---

# Offer Resolution

Resolve a user-triggered shopping request through public discovery and deterministic evidence scoring. Use one workflow across merchants and source types; do not create a separate skill for each retailer, platform, or scenario.

## Workflow

1. Normalize the request into merchant or supported category, need, budget, currency, five-digit US ZIP code, deadline with year, and acceptable channels. For a category request, use the resolver's bounded merchant fan-out; do not invent an unbounded retailer list. Ask only for an essential missing or ambiguous fact.
2. Call `plan_offer_search` before discovery. It provides the bounded LTK-first query plan but never performs a search or page retrieval.
3. Read [references/source-registry.md](references/source-registry.md) before host discovery. Complete the public LTK stage first. Search public posts, creator profiles, captions, product links, and LTK-exclusive indicators, including app-gated `Copy Promo Code` signals.
4. Only after the LTK stage, search supplemental sources. Corroborate LTK findings through creator-owned or official retailer evidence, then fill gaps through official retailer pages, authorized feeds, search indexes, and deal sites.
5. Record each candidate as an observation. Preserve its direct URL, publisher, creator-post publication time when available, access state, offer terms, code evidence, eligibility facts, fulfillment evidence, and corroborating URLs. Never substitute rediscovery time for post publication time. Include conflicting, expired, inaccessible, and uncertain candidates instead of silently dropping them.
6. Run the candidate set through `@create-something/offer-resolution` or call `resolve_offers`. Never calculate, invent, or edit a reliability score yourself.
7. Present the `ltk` lane before the `supplemental` lane. Within each lane, separate `recommend`, `verify`, `lead`, and `rejected`. Include projected savings, direct links, score components, caps, reasons, and receipt hashes. Say plainly when LTK returned no current public offer or no candidate is reliable enough to recommend.
8. If the user asks to keep checking, call `watch_offers` with the normalized request, current host observations, an explicit end time, and a stable idempotency key. Treat this as one bounded baseline: retries must return the existing identity. It persists status and receipts but does not itself search, promise a schedule, or send external notifications.

For deterministic evidence files inside this repository, run:

```bash
pnpm --filter @create-something/offer-resolution build
node packages/offer-resolution/dist/cli.js resolve --input <evidence.json>
```

To print the bounded plan the host should follow, run:

```bash
node packages/offer-resolution/dist/cli.js plan \
  --category health_and_beauty \
  --need "health and beauty products" \
  --budget 100 \
  --zip 76060 \
  --deadline 2026-08-09
```

## Reliability boundary

- Treat LTK as the primary discovery lane, not automatic proof of validity.
- Treat official retailer and inspectable checkout evidence as verification sources.
- Treat public LTK, creator-owned pages, and affiliate feeds as corroboration unless retailer evidence verifies their claims.
- Treat search indexes and deal aggregators as leads.
- Cap app-only, blocked, stale, terms-missing, code-unverified, eligibility-unknown, or deadline-unknown evidence as directed by the resolver.
- Reject expired, revoked, not-yet-started, budget-conflicting, location-conflicting, channel-conflicting, membership-conflicting, or deadline-missing offers.
- Preserve deterministic output: identical normalized evidence must yield identical decisions and receipt hashes.
- The MCP does not search the web; the ChatGPT or Codex host owns retrieval and then submits factual observations.

## Safety and access

- Do not purchase, add to cart, submit checkout, message a creator, subscribe, create unbounded monitoring, or send external notifications. A user-approved bounded watch through `watch_offers` is permitted.
- Do not bypass login, robots controls, rate limits, app-only access, or other technical restrictions.
- Do not use private LTK APIs, assume an LTK partnership, or bulk scrape creator content.
- Do not infer redistribution, storage, or commercial reuse rights from public availability. Return links and short evidence summaries.
- Keep historical lift analysis outside this skill; it requires time-series exposure and conversion data plus a separate measurement design.

## Output

Lead with the LTK lane, followed by supplemental findings. For every candidate, report the status, expected savings, plain-language confidence, material constraints, source URL, observation time, caps or rejection reasons, and receipt hash. Distinguish current verification from stale fixture or search evidence. For a bounded watch, report its identity, end time, current status, last result, and whether the call created or reused it.
