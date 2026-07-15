# Webflow App Review Companion

The App Review Companion is one Manifest V3 browser extension used by Marketplace developers and Webflow reviewers. For the Consent Pro pilot, it guides four scored runtime lifecycle missions in the real Designer and published-site browser surfaces:

1. Configure the externally authorized app for the reviewed runtime
2. Publish the designated test site
3. Exercise the production runtime
4. Uninstall and verify cleanup

External authorization is a setup prerequisite, not a scored Designer mission. The companion does not capture credentials or claim that authorization was validated.

The browser is a collector, not the authority. The App Review Preflight Worker binds every run to an exact review version and bundle SHA-256, owns the mission policy and final state, validates evidence digests and screenshot artifacts, and assigns evidence trust from authenticated server identity.

## Evidence trust

- `Partner supplied`: a developer completed the mission with the companion. It is useful preparation evidence, but cannot become Webflow-observed evidence through a client field.
- `Webflow observed`: an authenticated reviewer replayed the run from the Webflow-controlled role boundary.
- `Human verified`: a separate human confirmation. It does not rewrite captured facts.

Reviewer replay creates a new linked run. It never mutates the developer's receipts.

## Privacy boundary

The companion records sanitized navigation and request metadata, resource type/status/timing, script and iframe inventory, structural DOM counts, storage key names and byte counts, lifecycle markers, and masked screenshots.

It does not record headers, cookies, request or response bodies, form values, storage values, credentials, or unrelated tabs. Query values are replaced with `[redacted]`. Host access is requested for the current mission; blanket HTTPS access is optional rather than a required install permission. Extension CSP disallows remote executable code.

## Local build

```bash
pnpm --filter @create-something/webflow-app-review-companion test
pnpm --filter @create-something/webflow-app-review-companion check
pnpm --filter @create-something/webflow-app-review-companion build
```

Load `packages/webflow-app-review-companion/dist` with Chrome's **Load unpacked** action. The checked-in manifest key gives local builds the stable test extension ID `eiogakldgljpbbmplgckjkoglfgabblm`; production distribution must use the approved Webflow signing identity.

Local development retains a guarded start form for the integration harness. Production builds remove that form. The owning App Review Preflight Designer Extension uses `webflow.getIdToken()` to create a single-use five-minute pairing, binds it to the selected review version on the server, and sends the code directly to the stable companion extension ID. Redemption yields a two-hour session scoped to only that review/version. The token stays in Chrome session storage and is never written to evidence.

## Real Chrome verifier

The integration harness creates a fresh local D1/R2 state, starts the real Worker, builds an owned Designer/published-site fixture, loads the actual extension service worker into a clean Chromium profile, completes every mission, verifies `Validated`, creates an incomplete run and verifies `Blocked`, and writes a receipt plus UI screenshot.

```bash
COMPANION_WORKER_PORT=8794 \
COMPANION_FIXTURE_PORT=4180 \
COMPANION_EVIDENCE_OUTPUT=.codex/app-review-companion/evidence/local \
node packages/webflow-app-review-companion/scripts/run-integration.mjs
```

The harness may provide its own fixture screenshot only when both the evidence service and observed page are localhost. That branch is unreachable for production URLs. Production capture uses `chrome.tabs.captureVisibleTab` after the user opens the companion from the extension action, and the content observer masks form controls before capture.

## Production gates

The CREATE SOMETHING production pilot Worker is deployed, but authenticated promotion remains fail-closed until the owning Webflow App token, exact Designer Extension origin, reviewer allowlist, and designated sandbox are configured. Production promotion requires:

- approved Worker, D1, and private R2 bindings;
- short-lived Webflow identity and a managed reviewer allowlist;
- approved extension signing and Chrome Web Store/private distribution policy;
- retention, deletion, and reviewer-access policy;
- an authenticated Designer smoke using the exact signed build;
- security review of permissions and evidence schemas.

Rollback is removal-first: disable distribution, revoke reviewer run creation, stop accepting new companion runs, and retain existing evidence under the approved policy. No official Marketplace decision is stored by this companion.
