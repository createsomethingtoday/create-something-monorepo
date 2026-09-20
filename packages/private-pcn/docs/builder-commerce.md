# Builder networks and composable assets

The audience is builders sharing agentic engineering techniques and reusable MCP servers, agent plugins, skills, and workflow packages. The network combines the practice with the package. Seller setup and buyer acquisition are distinct journeys through one CREATE SOMETHING Identity account.

## Implementation and ownership

Database: tenant-scoped asset drafts, immutable releases, exact buyer/release entitlements and upload reservations in additive migration0006. Automation: bounded private ZIP storage in R2, authenticated downloads and recovery of uncertain uploads. Judgment: owner-only changes, explicit public/member listing rules, release license and permissions, no execution of uploaded content, and a disabled publishing/payment gate until acceptance.

Builder path: dashboard → network → assets → draft → private release → review buyer details. Draft fields remain editable; release files, license and install guidance cannot be overwritten. ZIP files have a16MiB limit, five releases including pending uploads per asset, and50assets per network. Capacity reservations precede object writes. Unknown writes keep their reservation; owner recovery finalizes only an object matching the stored size and checksum metadata. Missing uncertain uploads are retained for operator reconciliation; they are not automatically retried or freed. A ZIP signature is format validation only, not malware or compatibility certification. No package code executes on the platform.

Buyer path: asset link → inspect runtime/prerequisites/permissions/license/support → account verification → same asset → server-confirmed payment → collection → exact purchased release → download/install/verify/remove. A collection does not require owning or subscribing to a network. Acquiring an asset does not grant membership, future releases or redistribution rights. Existing active entitlements remain usable after a listing is archived, independent of membership. Refund/revocation must remove the exact entitlement before future downloads. There is no public object URL or installation-content leak in the unauthenticated page payload. Owner preview may access draft files.

Entry without an asset link: `/start` lets people choose learning/collecting or sharing/selling; account roles are not permanently exclusive. Login, signup, recovery and verification preserve bounded relative return paths. Identity and PCN allowlists include asset paths and reject hosts, queries and fragments.

## Commercial model and fee confirmation

The current USD24.50/network/month price is50%below Uscreen Starter's USD49monthly base (September20,2026). It is a hosting subscription, not an asset price or commission.

Current primary-source digital product benchmarks:

- [Gumroad](https://gumroad.com/pricing):10%+$0.50 for direct sales;30%for marketplace discovery. Merchant of record. No monthly charge.
- [Lemon Squeezy](https://www.lemonsqueezy.com/pricing):5%+$0.50 base, with possible additional fees; merchant of record and no ecommerce monthly charge.

These establish advertised prices, not sales volume or feature parity. Fifty percent of Gumroad's direct platform fee is5%+$0.25; fifty percent of Lemon Squeezy's advertised base is2.5%+$0.25. Neither arithmetic comparison establishes a50%lower total seller bill when subscription, Stripe processing and merchant-of-record responsibilities differ. Do not publish a blanket cheaper-than claim or configure a commission until fee scope and the payment relationship are confirmed.

Approved relationship: independent builders own their sales/customer relationships, receipts and refund support. The proposed fee is USD24.50/network/month and zero platform commission, awaiting explicit fee confirmation. The existing platform subscription integration is separate. See [Connect implementation](connect-implementation.md) for the implemented configuration, recovery model and remaining provider acceptance. No connected accounts, purchases, or fake entitlements have been created remotely.

## Preview and release gates

Preview uses private bucket `cs-private-pcn-assets-preview`; production release configuration binds the separate private bucket `cs-private-pcn-assets` as `ASSET_PACKAGES`. Production bucket provisioning and an authenticated synthetic object put/get checksum check passed on September 20, 2026; the probe was removed and public r2.dev access is disabled. Storage readiness does not establish buyer entitlement or paid-delivery acceptance. Publishing and checkout remain gated by explicit environment configuration and provider readiness. Identity enrollment remains disabled remotely.

Production Identity sign-in, reviewer/application/collection screens, required-field validation, keyboard focus and mobile layout were exercised in the user-requested Codex Browser. Stream read and tenant-filtered Analytics queries now pass with the CREATE SOMETHING credential; actual upload/private playback/member-revocation acceptance remains pending. Stripe test credentials and real buyer/seller mailbox/payment acceptance remain open. Do not use the separate ShivWorks client credentials or its products for this service.

Acceptance must include actual seller setup, public/private asset discovery, an exact test-mode purchase, duplicate/delayed webhook recovery, ownership change attempts, cancellation/refund/revocation, original-release download and installation instructions, and mobile/keyboard browser review. Current SQL/provider-mock tests do not prove these live workflows.

Production migrations0001–0011 are applied. Retain the tenant schema and both private buckets during recovery; never roll back to a single-network Worker after non-default networks exist. The pre-binding compatible production revision is `d36bef82-e158-4da4-ad76-42cea7e8abf7` (source `28c542643`, including the Stream-secret update). It has no production asset binding and is a rollback option only while commerce stays disabled and no active asset deliveries depend on that binding. Once asset delivery is active, use a compatible forward fix or maintenance release that retains `ASSET_PACKAGES`; do not delete bucket objects or restore an old database over new orders. Record the actual promoted version and rollback decision in CRE-2030.

CTX lexical retrieval succeeded for builder composability and independent operation/installation/rollback. `ctx status` timed out; search availability is verified, index freshness is not.

Network export schema version 2 includes scoped asset metadata and immutable release documentation (license, compatibility, installation, verification, removal and checksum). Object keys, ZIP binaries and video originals are excluded. Owners download packages separately from their asset pages.
