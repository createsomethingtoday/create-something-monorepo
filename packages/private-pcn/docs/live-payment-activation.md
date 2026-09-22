> Historical hosting-release receipt (September 21, 2026). Status statements below describe that release, not current GA readiness. Current policy is in [reviewed launch](reviewed-launch.md); remaining provider/browser gates and release evidence are tracked in CRE-2030. The approved support split is now 75/25 after actual processing fees, with Billing/Connect paid by the platform. Do not use the historical 95/5 statement below to configure payments.

# Live payment activation — CRE-2030

## Hosting release candidate, September 21, 2026

The authenticated PRIVATE creator-page acceptance is complete. Promote only through normal review resolution and CI; production checkout remains off until deployment is recorded.

Enable `PCN_SELF_SERVICE_ENABLED` in production only. Approved creators may start a USD24.50 monthly hosting subscription. An active creator trial still blocks checkout until its end. Identity enrollment, creator approval and network ownership remain independent requirements. Preview configuration is unchanged.

Live account: `acct_1JfTzIAzstI6Ecr5`. Hosting price: `price_1UIAQ0AzstI6Ecr5uLyYLdy8`. Dedicated portal: `bpc_1UIAQ1AzstI6Ecr5GSO5KaRe`; payment-method updates, invoices and cancellation at period end enabled; subscription plan switching disabled. Terms and privacy links target PRIVATE's own policies.

Platform billing webhook: `we_1UIAQ4AzstI6Ecr5ldY08jZK`, `/api/billing/webhook`. Connected-account commerce webhook: `we_1UIAQ6AzstI6Ecr52lHwcWC8`, `/api/commerce/webhook`. Both use API version `2026-08-26.dahlia`, matching the installed SDK. Credentials and signing secrets are held in Infisical `prod:/private-pcn` and Cloudflare secret bindings, never source.

Verification before promotion: prior real test-mode hosting subscription `sub_1UHqKIAzstI6Ecr5M6DHOdHR` read back canceled; full 2450-cent refund `re_3UHqKHAzstI6Ecr5426UynHc` succeeded. Current application suite: 147 tests; Svelte check: zero errors/warnings. Both live webhook handlers accepted signed inert configuration probes and rejected invalid signatures and wrong-mode events. Those probes are not Stripe-origin delivery or purchase proof. No live payment or automatic renewal has been initiated by the operator.

## Current acceptance evidence

- Identity: the approved production acceptance alias completed mailbox signup and password recovery. Production Identity records verified email and consumed challenges; signed-in browser retained membership denial. Exact used-link replay and invitation revocation during signup remain separate enrollment checks. Broad enrollment remains off; this release sells only to existing verified, approved creators.
- Stream/Analytics: CREATE SOMETHING's production credential reads Stream and the application's tenant-scoped usage query. Actual preview browser upload/processing, 125-second playback with five renewal grants, signed media and membership-revocation renewal denial were verified. Test media was archived and temporary membership revoked. These are real provider/preview results, not claims that a paid production customer completed playback. Production R2 checksum/private-bucket checks and dedicated bindings were verified.
- Stripe failure/recovery: test subscription `sub_1UIAc4AzstI6Ecr5NCBXL7cN` with Stripe's decline-after-attachment fixture returned incomplete with zero paid. Stripe-origin `invoice.payment_failed` event `evt_1UIAc7AzstI6Ecr5uNKJ6M75` reached preview; billing became incomplete and the network stayed suspended. Paying that invoice with the successful test fixture delivered `invoice.paid` and activated the network through normal webhook reconciliation.
- Portal cancellation: actual Stripe-hosted test portal showed the active USD24.50 plan and cancellation confirmation. The operator completed simulated cancellation; portal showed service ending October21. Stripe flexible billing supplied `cancel_at=1792602164` with the legacy boolean false. A failing regression reproduced PRIVATE's missing cancellation indication. The fix bounds access by the earlier of paid-period end and cancellation timestamp, and marks the final paid period appropriately. A separate regression prevents a later cancellation from labeling the current period as final.
- Preview fix: Worker `a22bfcab-6c30-43f6-88a5-8991b61033a0` received a real subscription update and stored cancellation flag1/end1792602164 while correctly retaining already-paid access. Authenticated owner settings displayed `Access ends 10/21/2026`; Refresh status succeeded and preserved the date. PRIVATE's Manage billing button opened the matching test subscription, USD24.50 plan and October21 cancellation date. This verifies the owner-only portal-launch route, not just a directly created provider session.
- Cleanup: test refund `re_3UIAc4AzstI6Ecr51SwqekYS` succeeded for the full 2450 cents, and the subscription was canceled. Stripe-origin refund events reached preview; D1 readback confirmed billing canceled and network suspended. No real funds were charged or refunded.

Detailed operator receipts are under `.codex/private-pcn/` and CRE-2030: enrollment-canary-production-receipt, long-playback-preview-receipt, revoked-playback-preview-receipt and payment-activation-receipt. The authenticated browser checkpoint and subsequent test cleanup are recorded separately from unit and provider checks.

## Separate gates

Creator Connect, paid asset commerce, company support and support Connect remain disabled in this release. Production has no configured seller accounts or approved support partners. The provisioned USD900 support price `price_1UIAQ0AzstI6Ecr5WCN9QOQj` does not activate support checkout. Before enabling it, complete partner onboarding, confirm fee allocation and verify test destination-transfer/refund behavior. The 95/5 split applies only to company support, never ordinary creator sales.

Automatic tax is not enabled by this release. No tax registration or provider account-wide payment settings are changed.

## Promotion and rollback

Merge through normal review/CI, rebuild the merged source, deploy to `cs-private-pcn`, and verify the production version, hosting flag, protected checkout and signed webhook behavior. Record the final deployment and browser evidence in CRE-2030. Do not claim a live charge until an actual customer-authorized payment and provider/application readback exist.

Rollback new checkout by setting `PCN_SELF_SERVICE_ENABLED=false` and deploying a compatible release. Preserve the Stripe credentials, portal, webhooks and customer/subscription records: disabling checkout does not cancel existing subscriptions, and lifecycle reconciliation must continue. Do not restore pre-tenant schema or delete payment evidence.
