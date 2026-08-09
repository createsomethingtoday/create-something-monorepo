# Cloudflare Browser Run migration and rollback

Tracked objective: CRE-1645.

## Routing contract

The analyzer owns classification, routing, receipts, and rollback. Cloudflare is
an execution adapter.

| Capability | Ordered route | Reason |
| --- | --- | --- |
| Public stateless analysis | Kitesurf, Chromium, Steel, Browserless | Use the lightweight engine first; preserve operational rollback during burn-in. |
| Public screenshot | Kitesurf, Chromium, Steel, Browserless | Kitesurf screenshots are evidence-bearing but are not claimed to be pixel-identical. |
| Pixel-sensitive screenshot | Chromium, Steel, Browserless | The caller declares `pixelSensitive: true`; Kitesurf is skipped before execution. |
| Persistent session | Chromium, Steel, Browserless | Kitesurf is stateless. |
| Webflow Designer metadata | Chromium, Steel, Browserless | Designer extraction is authenticated/sessionful and uses keyboard/panel state. |

Webflow preview URLs and requests carrying browser cookies are classified as
authenticated before execution and skip Kitesurf even when the operation is a
general analysis call.

Kitesurf is not selected for video, WebGL, real TLS bot challenges, persistent
authentication, or pixel-sensitive acceptance. Operator Chrome remains the
final verifier for consequential authenticated or visual acceptance work.

## Runtime configuration

Required for Browser Run:

- `CLOUDFLARE_ACCOUNT_ID`: non-secret account identifier.
- `CLOUDFLARE_BROWSER_RUN_API_TOKEN`: secret token limited to
  `Browser Rendering - Edit`.
- `BROWSER_RUN_ENABLED=true`: explicit route switch.

The Worker passes these values through one immutable runtime configuration per
isolate. Browser credentials are not copied into `process.env`. Direct CDP is
used because arbitrary analyzer scripts and documented Kitesurf selection are
not available through the binding-backed Quick Action interface. The Worker
transport performs an authenticated WebSocket upgrade and redacts connection
errors.

## Receipts

Browser-backed MCP results include `_browser`:

- URL, operation, and classified capability;
- selected provider and every ordered attempt;
- attempt and total durations;
- fallback reason when present;
- SHA-256 identity of the result;
- usage source and value.

Direct CDP does not expose the Quick Action `X-Browser-Ms-Used` response header,
so its receipt uses `{ "browserMsUsed": null, "source": "unavailable" }`.
This keeps billing uncertainty explicit.

## Fixed comparison verifier

The corpus is frozen at `scripts/browser-run-corpus.json`. It covers a standards
baseline, CREATE SOMETHING, a published Webflow site, a screenshot, a WebGL
case that must fail Kitesurf and escalate, and a sessionful Chromium case.

```bash
pnpm run verify:browser-run:corpus

CLOUDFLARE_ACCOUNT_ID=... \
CLOUDFLARE_BROWSER_RUN_API_TOKEN=... \
STEEL_API_KEY=... \
pnpm run verify:browser-run -- --output /tmp/browser-run-comparison.json
```

The live verifier requires both Browser Run and an incumbent credential. It
fails if engine selection differs from policy, the WebGL case omits its failed
Kitesurf attempt, semantic analysis differs, or either screenshot is empty.
Production acceptance requires two consecutive clean corpus runs after the
merged deployment.

## Rollback

Do not delete or rotate credentials to roll back. Set
`BROWSER_RUN_ENABLED=false` in the owning Wrangler configuration and deploy the
last known-good merged revision. With an incumbent credential still configured,
the manager selects Steel and retains Browser Run credentials for diagnosis.

Before any production route change, secret creation/rotation, paid entitlement,
or deployment, record explicit operator approval in CRE-1645. After rollback,
verify `/health`, missing/invalid MCP authentication, and one incumbent corpus
case. Restore `BROWSER_RUN_ENABLED=true` only through the same promotion gate.

## Incumbent consumer audit

Audit date: 2026-08-08.

| Scope | Finding | Disposition |
| --- | --- | --- |
| Analyzer provider manager and Worker entrypoints | Steel/Browserless were the production provider path. | Browser Run owns the route; incumbents remain ordered rollback providers. |
| `integration-test.ts` | Assumed Steel was always primary. | Updated to exercise Browser Run when configured and retain incumbent fallback. |
| `src/temporal/activities.ts` | Legacy activity sequence directly owns a Steel session and page. | Retain until Browser Run production burn-in; owner is CRE-1645 and removal/rewrite checkpoint is Phase 6. It is not used by the Worker route. |
| Teaching/replay/exploration scripts and archived report runners | Operator utilities directly instantiate Steel, and one report contains an obsolete absolute output path. | Keep out of production routing; migrate or archive only after live burn-in rather than broadening this production change. |
| Other packages (`half-dozen-youtube-sync`, `halfdozen-zoom-sync`, `webflow-template-analyzer`) | Independent Steel consumers with separate runtime contracts. | Out of CRE-1645 scope; do not remove shared credentials on their behalf. |

Incumbent credential deletion is prohibited until this audit is refreshed,
production burn-in passes, and each remaining consumer has an explicit owner or
replacement.

## Primary references

- [Kitesurf](https://developers.cloudflare.com/browser-run/kitesurf/)
- [Browser Run CDP with Puppeteer](https://developers.cloudflare.com/browser-run/cdp/puppeteer/)
- [Browser Run limits](https://developers.cloudflare.com/browser-run/limits/)
- [Browser Run pricing](https://developers.cloudflare.com/browser-run/pricing/)
