---
name: offer-savings
description: Find, compare, verify, and create a bounded deadline-based watch for current public coupon and promo offers, beginning with public LTK and creator codes. Use for merchant or health-and-beauty shopping requests that include a need, budget, ZIP code, channel, or deadline; for questions about whether an influencer or retailer offer is reliable; and for user-approved repeat checks. Do not use for unbounded monitoring, notifications, automated purchasing, bulk scraping, coupon creation, or historical lift analysis.
---

# Offer Savings

Resolve a user-triggered shopping request through public discovery and deterministic evidence scoring. Use this one workflow across merchants and sources; do not create a separate skill for each retailer or scenario.

## Workflow

1. Normalize the request into a merchant or supported category, need, budget, currency, five-digit US ZIP code, deadline with year, observation time, and acceptable channels. Ask only for an essential missing fact.
2. Call `find_offers`. The service must complete the public LTK lane first, then use supplemental public sources. Do not perform a separate free-form search and invent a score.
3. Present the `ltk` lane before the `supplemental` lane. Within each lane, preserve `recommend`, `verify`, `lead`, and `rejected` results.
4. Include expected savings, constraints, direct evidence links, observation time, score components, caps or rejection reasons, and receipt hash. Say plainly when no current public LTK offer was found or no candidate is reliable enough to recommend.
5. Call `verify_offer` when the user supplies an offer or asks for re-evaluation. Treat `needs_checkout` as unresolved; verification does not authorize checkout.
6. Call `watch_offers` only after the user asks to keep checking and supplies an explicit deadline. Use a stable idempotency key so retries reuse the same watch. Use `get_watch` to read its current status.

Read [references/source-policy.md](references/source-policy.md) when explaining evidence priority, public-access limits, redistribution, or ChatGPT deployment.

## Reliability boundary

- Treat LTK as the primary discovery lane, not automatic proof of validity.
- Treat official retailer and inspectable checkout evidence as verification sources.
- Treat public LTK, creator-owned pages, and authorized affiliate feeds as corroboration unless retailer evidence verifies the claim.
- Treat search indexes and deal aggregators as leads.
- Never calculate, invent, or manually edit the reliability score. Report the resolver output and receipt.
- Preserve uncertain, inaccessible, conflicting, stale, and expired observations instead of silently dropping them.

## Safety

- Do not purchase, add to cart, submit checkout, message a creator, subscribe, or send an external notification.
- Do not bypass login, app-only access, robots controls, rate limits, or other restrictions.
- Do not use private LTK APIs, assume an LTK partnership, or bulk scrape creator content.
- Do not infer reuse or redistribution rights from public availability. Return links and short evidence summaries.
- Keep historical lift analysis outside this skill; it needs exposure and conversion data plus a separate measurement design.
