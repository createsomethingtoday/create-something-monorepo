---
name: offer-savings
description: Find, compare, verify, and create a bounded deadline-based watch for current public coupon and promo offers, beginning with public LTK and creator codes. Use for merchant or health-and-beauty shopping requests that include a need, budget, ZIP code, channel, or deadline; for questions about whether an influencer or retailer offer is reliable; and for user-approved repeat checks. Do not use for unbounded monitoring, notifications, automated purchasing, bulk scraping, coupon creation, or historical lift analysis.
---

# Offer Savings

Resolve a user-triggered shopping request through public discovery and deterministic evidence scoring. Use this one workflow across merchants and sources; do not create a separate skill for each retailer or scenario.

## Workflow

1. Normalize the request into an exact merchant or supported category, need, budget, currency, five-digit US ZIP code, deadline with year, and acceptable channels. Ask only for an essential missing fact. Do not invent or send an observation timestamp; the service owns it.
2. Use the host agent's public-web capability for bounded discovery. Search public LTK posts, creator profiles, captions, product links, and visible exclusive-code indicators first. Preserve direct URLs and do not bypass app gates or login.
3. Only after the LTK pass, search official retailer pages and inspectable checkout evidence for corroboration, then bounded creator-owned, authorized-feed, search-index, and deal-source gaps. Keep LTK and supplemental observations distinct.
4. Call `resolve_offers` once with the normalized request and up to 50 factual observations from both passes. The MCP owns observation time, deterministic reliability scores, caps, ranking, evidence separation, and the receipt. Never calculate or edit a score in the host agent.
5. Present `ltkOffers` as the primary answer, followed by `supplementalOffers` as clearly labeled verified options. These arrays contain only resolver decisions with `recommend` status; do not promote a `verify` or `lead` decision into either lane.
6. Treat `evidence` as research material, not working coupons. It includes uncorroborated creator codes, historical or incomplete leads, generic fulfillment pages, and other findings that are not currently recommendable. Do not present its codes as usable, calculate projected savings from them, or attach copy-code or watch actions. Rejected observations remain in the resolver receipt instead of the usable offer list.
7. For recommended offers, include expected savings, constraints, direct evidence links, observation time, score components, and the search-run receipt hash. For evidence, report the caps or rejection reasons without claiming savings. Say plainly when no currently verified public offer was found.
8. Call `verify_offer` when the user supplies an offer or asks for re-evaluation. Treat `needs_checkout` as unresolved; verification does not authorize checkout.
9. Call `watch_offers` only after the user asks to keep checking and supplies an explicit deadline. Use a stable idempotency key so retries reuse the same watch. Use `get_watch` to read its current status. Scheduled watch refreshes may use the service-side discovery fallback because the host agent is not continuously online.

Use `find_offers` only as a compatibility fallback when the host truly has no public-web capability. Interactive ChatGPT and Codex sessions should use host discovery plus `resolve_offers`.

Read [references/source-policy.md](references/source-policy.md) when explaining evidence priority, public-access limits, redistribution, or ChatGPT deployment.

## Reliability boundary

- Treat LTK as the primary discovery lane, not automatic proof of validity.
- Treat official retailer and inspectable checkout evidence as verification sources.
- Treat public LTK, creator-owned pages, and authorized affiliate feeds as corroboration unless retailer evidence verifies the claim.
- Treat search indexes and deal aggregators as leads.
- Treat `verify` and `lead` decisions as non-actionable evidence. Only `recommend` decisions belong in a usable offer lane.
- Never calculate, invent, or manually edit the reliability score. Report the resolver output and receipt.
- Preserve uncertain, inaccessible, conflicting, stale, and expired observations instead of silently dropping them.

## Safety

- Do not purchase, add to cart, submit checkout, message a creator, subscribe, or send an external notification.
- Do not bypass login, app-only access, robots controls, rate limits, or other restrictions.
- Do not use private LTK APIs, assume an LTK partnership, or bulk scrape creator content.
- Do not infer reuse or redistribution rights from public availability. Return links and short evidence summaries.
- Keep historical lift analysis outside this skill; it needs exposure and conversion data plus a separate measurement design.
