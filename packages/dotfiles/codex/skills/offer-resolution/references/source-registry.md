# Offer Source Registry

Use two explicit stages. LTK is the primary discovery stage. All other sources are supplemental corroboration and gap-fill stages. A source location is an adapter within the one offer-resolution workflow, not a separate skill.

## Stage 1: LTK primary discovery

Search public LTK creator profiles, post pages, captions, product links, and search-indexed LTK pages before every other source family. Detect creator-specific, stackable, time-limited, and LTK-exclusive offers. Record the post publication time separately from the current observation time. If a post exposes only an in-app `Copy Promo Code` action, record the public post and `app_only` access state; do not extract or guess the gated code.

LTK priority controls search sequence and output grouping. It does not raise reliability. Public LTK evidence remains corroboration until official retailer or inspectable checkout evidence verifies the relevant claim.

## Stage 2: Supplemental corroboration and gap fill

First corroborate LTK candidates through creator-owned and official retailer pages. Then search official promotion, eligibility, shipping, and pickup pages for gaps across the bounded candidate merchants. Use authorized feeds, search indexes, and deal aggregators only after those direct surfaces.

| Source family     | Locations to inspect                                                                                                                                                          | Evidence role                       | Access boundary                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Public LTK        | Public creator profiles, public post pages, captions, outbound retailer links, and search-indexed LTK pages                                                                   | Primary discovery and corroboration | No private LTK API, authenticated automation, app extraction, bulk scraping, or inferred partnership rights  |
| Official retailer | Promotion and coupon pages, homepage banners, sale pages, product pages, loyalty pages, terms/help pages, shipping estimates, pickup inventory, and public checkout messaging | Supplemental verification           | Read public pages only; do not add to cart or transact solely to produce evidence                            |
| Retailer checkout | Public cart or checkout terms and user-supplied screenshots/receipts showing code acceptance, exclusions, subtotal, and delivery                                              | Supplemental verification           | Do not submit checkout, mutate a cart, or claim success without an inspectable receipt                       |
| Creator-owned     | Public Instagram, TikTok, YouTube descriptions, blogs, storefronts, newsletters supplied by the user, and other creator-owned posts                                           | Corroboration                       | Respect login and platform limits; a creator claim still needs retailer eligibility and fulfillment evidence |
| Affiliate feed    | Partner or merchant feeds, promotion endpoints, and networks the user is authorized to access                                                                                 | Corroboration                       | Use only explicit user or organizational authorization; record feed timestamp and merchant identity          |
| User-authorized   | Loyalty wallets, account offers, email coupons, saved offers, receipts, and screenshots supplied or connected by the user                                                     | Verification                        | Scope access to the requesting user and never expose account-specific codes as generally public              |
| Search index      | General web search, retailer-domain search, social search, and cached snippets used to locate a direct page                                                                   | Discovery lead                      | A snippet is not validity evidence; follow the direct URL and record when it cannot be inspected             |
| Deal aggregator   | Coupon sites, deal forums, cashback pages, and community reports                                                                                                              | Discovery lead                      | Treat reported success rates or timestamps as leads until a direct or official source corroborates them      |

## Evidence combination

For a recommendable result, seek four independent facts:

1. The offer or code exists and is current.
2. Its terms apply to the merchant, subtotal, location, channel, and membership state.
3. The retailer can fulfill the need by the deadline.
4. The source is direct enough and fresh enough to support the claim.

Public creator evidence alone may identify a useful code, but an uncorroborated reported code remains `verify`. Search and deal sources remain `lead`. App-only or blocked evidence remains link-only and cannot become a full recommendation. If stage 1 returns no current LTK result, say so before presenting supplemental findings.

## Rights and partnership boundary

Public availability permits ordinary user-triggered discovery and linking subject to the source's terms and technical controls. It does not itself grant bulk collection, republication, resale, private API, or partnership rights. Escalate any product that requires persistent LTK ingestion, high-volume redistribution, or private creator/commerce data to a formal access and licensing review.
