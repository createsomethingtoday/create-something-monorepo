# Agency Meta maintenance

This private Worker retries existing consented inquiry deliveries and removes
expired matching data. It runs at minute 17 each hour, processes at most ten
active consent records, and exposes no public application route.

Delivery uses Agency's shared consent and outbox implementation. It never creates
an inquiry or sends a booking conversion. Revoked or expired consent prevents a
retry. Cleanup runs even when `META_MARKETING_ENABLED` is false.

Before deployment, apply Agency migration `0060_meta_marketing.sql`. Configure
the dataset and Graph API version in Wrangler. Store `META_CAPI_ACCESS_TOKEN`,
`META_ZARAZ_ENDPOINT`, and `META_ZARAZ_RELAY_KEY` in encrypted Worker bindings
using the owning Infisical secrets. Keep secret values out of source and logs.

Verify the Worker with:

```bash
pnpm --filter @create-something/agency-meta-maintenance check
pnpm --filter @create-something/agency-meta-maintenance test
pnpm --filter @create-something/agency-meta-maintenance build
```

Tests use workerd/D1 and simulated Meta responses. The build is a deployment dry
run. Neither proves that a deployed cron ran or that Meta accepted a live event.
The scheduled handler logs only aggregate cleanup and delivery counts. Inspect
Cloudflare invocation evidence after release; do not manufacture a live inquiry
to test it.

For rollback, disable the Worker schedule or remove the Worker and roll Agency
back through its owning deployment workflow. Preserve D1 source receipts and
delivery evidence for reconciliation. See
[Agency Meta attribution](../../docs/guides/AGENCY_META_ATTRIBUTION.md) and Linear
`CRE-2359` for the full delivery boundary.
