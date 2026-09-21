# Live payment activation — CRE-2030

## Hosting release, September 21, 2026

Enable `PCN_SELF_SERVICE_ENABLED` in production only. Approved creators may start a USD24.50 monthly hosting subscription. An active creator trial still blocks checkout until its end. Identity enrollment, creator approval and network ownership remain independent requirements. Preview configuration is unchanged.

Live account: `acct_1JfTzIAzstI6Ecr5`. Hosting price: `price_1UIAQ0AzstI6Ecr5uLyYLdy8`. Dedicated portal: `bpc_1UIAQ1AzstI6Ecr5GSO5KaRe`; payment-method updates, invoices and cancellation at period end enabled; subscription plan switching disabled. Terms and privacy links target PRIVATE's own policies.

Platform billing webhook: `we_1UIAQ4AzstI6Ecr5ldY08jZK`, `/api/billing/webhook`. Connected-account commerce webhook: `we_1UIAQ6AzstI6Ecr52lHwcWC8`, `/api/commerce/webhook`. Both use API version `2026-08-26.dahlia`, matching the installed SDK. Credentials and signing secrets are held in Infisical `prod:/private-pcn` and Cloudflare secret bindings, never source.

Verification before promotion: prior real test-mode hosting subscription `sub_1UHqKIAzstI6Ecr5M6DHOdHR` read back canceled; full 2450-cent refund `re_3UHqKHAzstI6Ecr5426UynHc` succeeded. Current application suite: 145 tests; Svelte check: zero errors/warnings. Both live webhook handlers accepted signed inert configuration probes and rejected invalid signatures and wrong-mode events. Those probes are not Stripe-origin delivery or purchase proof. No live payment or automatic renewal has been initiated by the operator.

## Separate gates

Creator Connect, paid asset commerce, company support and support Connect remain disabled in this release. Production has no configured seller accounts or approved support partners. The provisioned USD900 support price `price_1UIAQ0AzstI6Ecr5WCN9QOQj` does not activate support checkout. Before enabling it, complete partner onboarding, confirm fee allocation and verify test destination-transfer/refund behavior. The 95/5 split applies only to company support, never ordinary creator sales.

Automatic tax is not enabled by this release. No tax registration or provider account-wide payment settings are changed.

## Promotion and rollback

Merge through normal review/CI, rebuild the merged source, deploy to `cs-private-pcn`, and verify the production version, hosting flag, protected checkout and signed webhook behavior. Record the final deployment and browser evidence in CRE-2030. Do not claim a live charge until an actual customer-authorized payment and provider/application readback exist.

Rollback new checkout by setting `PCN_SELF_SERVICE_ENABLED=false` and deploying a compatible release. Preserve the Stripe credentials, portal, webhooks and customer/subscription records: disabling checkout does not cancel existing subscriptions, and lifecycle reconciliation must continue. Do not restore pre-tenant schema or delete payment evidence.
