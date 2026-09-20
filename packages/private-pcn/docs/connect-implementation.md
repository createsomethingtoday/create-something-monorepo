# Builder-owned payments

The user approved builder-owned sales. Each builder owns the customer payment relationship, receipts, refunds and disputes through their full Stripe Dashboard. CREATE SOMETHING provides the network and package-delivery service. Proposed platform fee: $24.50 per network per month, with zero commission on asset sales; fee confirmation is still pending. Stripe processing fees and applicable taxes are separate. Do not advertise a blanket 50% saving across asset sales.

## Account and funds flow

Accounts v2 merchant configuration requests card payments, full Dashboard access, `fees_collector: stripe` and `losses_collector: stripe`. Business country is explicitly selected before account creation. Server metadata binds the account to the verified Identity subject. Creation checks the known CREATE SOMETHING platform account and persists an idempotency key before requesting the account. Unknown outcomes older than 20 hours require reconciliation instead of creating another account.

Buyer → Stripe Checkout direct charge in the builder account → builder Stripe balance → builder bank payout. No transfer, destination charge, application fee or platform-held seller balance. Network subscriptions remain charges on the CREATE SOMETHING platform account. Asset prices are server-owned USD integer cents; checkout automatically calculates tax with seller liability. Seller tax registration/settings, receipts and refund policy need real provider acceptance before launch.

Stripe processing-fee collection and negative-balance liability are distinct: both are configured to Stripe here. That configuration does not prove tax compliance or remove the builder's obligation to handle customer support, refunds and disputes. Supported countries and exact account readiness remain provider-controlled.

## Seller and buyer experience

Seller: Identity sign-in → network → Seller payments → country → embedded account onboarding. Notification banner and account management expose outstanding requirements; embedded payments and payouts plus full Dashboard provide payment operations. The server checks live merchant card and payout capability before publishing paid products or starting checkout.

Buyer: inspect exact release, runtime requirements, permissions, license and builder support/refund policy → accept license → direct checkout → server confirmation → collection → immutable release download and installation/verification/removal instructions. Checkout returns never grant access alone. Pending confirmation offers Check purchase rather than encouraging another payment. A purchase grants only that release, not future releases or network membership.

## Reconciliation and recovery

Migration0007 stores seller creation keys, order snapshots, checkout keys, leases, acceptance timestamps and webhook receipts. Checkout retries reuse a persistent key. Expired checkouts rotate keys; price changes expire the previous open checkout. Missing create responses can be recovered by matching server metadata in connected-account checkout history. Results beyond the bounded lookup need operator reconciliation; never create a duplicate payment to repair missing evidence.

The dedicated connected-account webhook uses a separate signing secret and validates signature age, mode and `event.account`. Subscribe to `account.updated`, `account.application.deauthorized`, `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `refund.updated`, `refund.failed` and `payment_intent.succeeded`. Events prompt a current-state retrieval under the seller account, not a grant based on event payload. Accounts v2 readiness also refreshes live from merchant capabilities; the v1 account.updated connected event is supported for v2 accounts.

Paid confirmation validates buyer, seller scope, exact release, price, currency, mode, payment intent, captured charge and dispute state. Full refunds revoke access; partial refunds retain the release. Unresolved or lost disputes revoke access; won/closed warnings allow restoration when the current payment otherwise qualifies. Every paid release download refreshes provider state, so missed webhooks do not preserve refunded access. Provider failure denies delivery until verification recovers. Owners retain access to their own package.

## Configuration and release proof

Required secrets: `STRIPE_SECRET_KEY`, matching `STRIPE_PUBLISHABLE_KEY`, dedicated `STRIPE_CONNECT_WEBHOOK_SECRET`. Existing subscription price/webhook configuration is separate. Required flags after acceptance: `PCN_CONNECT_ENABLED=true`, `PCN_ASSET_COMMERCE_ENABLED=true`, and the confirmed fee policy `PCN_ASSET_FEE_POLICY=hosting_only_v1`. Both preview and production default disabled. Private R2 binding and additive migrations0006–0007 are also required.

Before enabling sales: real Stripe test credentials on the correct platform; embedded onboarding and country/readiness acceptance; successful, abandoned and recovered test checkouts; signed webhook delivery and replay; refund/dispute access changes; tax/receipt readback; buyer and seller mobile/keyboard browser review; reload and sign-in recovery. SQL and SDK-signature tests support but do not replace this evidence. Identity sign-up and Stream acceptance remain separate self-service launch gates.

Preview rollback: restore its previous Worker version and retain additive tables/private bucket. Record the actual deployment version and migration evidence in CRE-2030. Production promotion requires the PR review/CI and live acceptance gates; do not copy preview secrets or bindings blindly.

## Authoritative references

- [Create SaaS connected accounts](https://docs.stripe.com/connect/saas/tasks/create)
- [Accounts v2 configuration](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration)
- [Embedded onboarding](https://docs.stripe.com/connect/saas/tasks/onboard)
- [Direct charges](https://docs.stripe.com/connect/direct-charges)
- [Connect webhooks](https://docs.stripe.com/connect/webhooks)

Verified against installed Stripe SDK22.6.2, API2026-08-26.dahlia, and ConnectJS3.4.6. Real account/API acceptance is still required.
