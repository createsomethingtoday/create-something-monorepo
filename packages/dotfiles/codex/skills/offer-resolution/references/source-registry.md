# Offer Source Registry

Use the smallest applicable set, but search in this order. A source location is an adapter within the one offer-resolution workflow, not a separate skill.

| Source family     | Locations to inspect                                                                                                                                                          | Evidence role  | Access boundary                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| Official retailer | Promotion and coupon pages, homepage banners, sale pages, product pages, loyalty pages, terms/help pages, shipping estimates, pickup inventory, and public checkout messaging | Verification   | Read public pages only; do not add to cart or transact solely to produce evidence                            |
| Retailer checkout | Public cart or checkout terms and user-supplied screenshots/receipts showing code acceptance, exclusions, subtotal, and delivery                                              | Verification   | Do not submit checkout, mutate a cart, or claim success without an inspectable receipt                       |
| Public LTK        | Public creator profiles, public post pages, captions, outbound retailer links, and search-indexed LTK pages                                                                   | Corroboration  | No private LTK API, authenticated automation, app extraction, bulk scraping, or inferred partnership rights  |
| Creator-owned     | Public Instagram, TikTok, YouTube descriptions, blogs, storefronts, newsletters supplied by the user, and other creator-owned posts                                           | Corroboration  | Respect login and platform limits; a creator claim still needs retailer eligibility and fulfillment evidence |
| Affiliate feed    | Partner or merchant feeds, promotion endpoints, and networks the user is authorized to access                                                                                 | Corroboration  | Use only explicit user or organizational authorization; record feed timestamp and merchant identity          |
| User-authorized   | Loyalty wallets, account offers, email coupons, saved offers, receipts, and screenshots supplied or connected by the user                                                     | Verification   | Scope access to the requesting user and never expose account-specific codes as generally public              |
| Search index      | General web search, retailer-domain search, social search, and cached snippets used to locate a direct page                                                                   | Discovery lead | A snippet is not validity evidence; follow the direct URL and record when it cannot be inspected             |
| Deal aggregator   | Coupon sites, deal forums, cashback pages, and community reports                                                                                                              | Discovery lead | Treat reported success rates or timestamps as leads until a direct or official source corroborates them      |

## Evidence combination

For a recommendable result, seek four independent facts:

1. The offer or code exists and is current.
2. Its terms apply to the merchant, subtotal, location, channel, and membership state.
3. The retailer can fulfill the need by the deadline.
4. The source is direct enough and fresh enough to support the claim.

Public creator evidence alone may identify a useful code, but an uncorroborated reported code remains `verify`. Search and deal sources remain `lead`. App-only or blocked evidence remains link-only and cannot become a full recommendation.

## Rights and partnership boundary

Public availability permits ordinary user-triggered discovery and linking subject to the source's terms and technical controls. It does not itself grant bulk collection, republication, resale, private API, or partnership rights. Escalate any product that requires persistent LTK ingestion, high-volume redistribution, or private creator/commerce data to a formal access and licensing review.
