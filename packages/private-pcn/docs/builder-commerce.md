# Builder networks and composable assets

The audience is builders sharing agentic engineering techniques and reusable MCP servers, agent plugins, skills, and workflow packages. The network combines the practice with the package. Seller setup and buyer acquisition are distinct journeys through one CREATE SOMETHING Identity account.

## Implementation and ownership

Database: tenant-scoped asset drafts, immutable releases, exact buyer/release entitlements and upload reservations in additive migration0006. Automation: bounded private ZIP storage in R2, authenticated downloads and recovery of uncertain uploads. Judgment: owner-only changes, explicit public/member listing rules, release license and permissions, no execution of uploaded content, and a disabled publishing/payment gate until acceptance.

Builder path: dashboard → network → assets → draft → private release → review buyer details. Draft fields remain editable; release files, license and install guidance cannot be overwritten. ZIP files have a16MiB limit, five releases including pending uploads per asset, and50assets per network. Capacity reservations precede object writes. Unknown writes keep their reservation; owner recovery finalizes only an object matching the stored size and checksum metadata. Missing uncertain uploads are retained for operator reconciliation; they are not automatically retried or freed. A ZIP signature is format validation only, not malware or compatibility certification. No package code executes on the platform.

Buyer path: asset link → inspect runtime/prerequisites/permissions/license/support → account verification → same asset → payment (pending) → collection → exact purchased release → download/install/verify/remove. A collection does not require owning or subscribing to a network. Acquiring an asset does not grant membership, future releases or redistribution rights. Existing active entitlements remain usable after a listing is archived, independent of membership. Refund/revocation must remove the exact entitlement before future downloads. There is no public object URL or installation-content leak in the unauthenticated page payload. Owner preview may access draft files.

Entry without an asset link: `/start` lets people choose learning/collecting or sharing/selling; account roles are not permanently exclusive. Login, signup, recovery and verification preserve bounded relative return paths. Identity and PCN allowlists include asset paths and reject hosts, queries and fragments.

## Commercial decisions still pending

The current USD24.50/network/month price is50%below Uscreen Starter's USD49monthly base (September20,2026). It is a hosting subscription, not an asset price or commission.

Current primary-source digital product benchmarks:

- [Gumroad](https://gumroad.com/pricing):10%+$0.50 for direct sales;30%for marketplace discovery. Merchant of record. No monthly charge.
- [Lemon Squeezy](https://www.lemonsqueezy.com/pricing):5%+$0.50 base, with possible additional fees; merchant of record and no ecommerce monthly charge.

These establish advertised prices, not sales volume or feature parity. Fifty percent of Gumroad's direct platform fee is5%+$0.25; fifty percent of Lemon Squeezy's advertised base is2.5%+$0.25. Neither arithmetic comparison establishes a50%lower total seller bill when subscription, Stripe processing and merchant-of-record responsibilities differ. Do not publish a blanket cheaper-than claim or configure a commission until fee scope and the payment relationship are confirmed.

Recommendation pending user choice: independent builders own their sales/customer relationships, receipts and refund support. The alternative is CREATE SOMETHING collecting/distributing payments and owning buyer payment support. Stripe Connect configuration and fee approval follow that choice. No connected accounts, purchases, or fake entitlements have been created remotely. The existing platform subscription integration is separate. A seller payout flow, refund/dispute reconciliation, tax presentation, checkout return recovery and receipt flow remain required before selling.

## Preview and release gates

Preview only: private bucket `cs-private-pcn-assets-preview`, binding `ASSET_PACKAGES`. Production has no asset bucket bound. Publishing remains unavailable; no buy button pretends checkout works. Identity enrollment remains disabled remotely. Stream and Stripe test access plus real buyer/seller identity and mailbox acceptance remain open.

Acceptance must include actual seller setup, public/private asset discovery, an exact test-mode purchase, duplicate/delayed webhook recovery, ownership change attempts, cancellation/refund/revocation, original-release download and installation instructions, and mobile/keyboard browser review. Current SQL/provider-mock tests do not prove these live workflows. Browser remains handed to Micah; no browser activity until sign-in completion is confirmed.

Migration0006 adds tables only; previous self-service Worker ignores them. Rollback preview by restoring prior Worker24a158ce-3ad4-479b-9c3e-98632ecfd031 and retaining the bucket/tables. No destructive rollback is needed. Production self-service migrations0002–0005 still have the separately documented membership rollback boundary.

CTX lexical retrieval succeeded for builder composability and independent operation/installation/rollback. `ctx status` timed out; search availability is verified, index freshness is not.
