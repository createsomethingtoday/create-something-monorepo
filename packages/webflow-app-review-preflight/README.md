# Webflow App Review Preflight

App Review Preflight is a native Webflow Designer Extension for Marketplace developers. It turns an uploaded app bundle into deterministic, scope-aware feedback, keeps immutable revisions, and supports separately approved production-runtime evidence.

It is a preflight and evidence system. It does not approve or reject an app.

The native Designer Extension is the developer surface for bundle feedback, immutable version history, Runtime Test Package preparation, and trusted-result readback. Reviewers use the web app to inspect submissions across developers and request independent replays. The actual production-runtime browser remains Webflow-controlled in E2B; neither interface can upload observed evidence, promote partner input to `Webflow observed`, or make an official decision.

For the Consent Pro pilot, authorization happens outside the Designer Extension. Authorization, configuration, and publication are unscored prerequisites. Uninstall cleanup is also unscored while the Custom Code API cannot reliably complete that lifecycle. The only security result comes from Webflow-controlled execution of the pinned production runtime; no user-controlled browser can issue or manufacture it.

## Hybrid App boundary

The Hybrid App has two intentional user surfaces over one evidence system:

- **Designer Extension — developer surface.** A developer uploads the exact submission bundle, prepares a dedicated site-bound Runtime Test Package, requests validation, and reads the resulting blockers. Developer access remains owner-scoped.
- **Reviewer web app — internal review surface.** An authenticated reviewer searches submissions across owners, opens any immutable revision, compares prior observations, and requests an independent replay of the exact package. Reviewer access is cross-owner, audited, and unavailable to developer identities.
- **Worker, D1, R2, and E2B — authority surface.** The Worker owns immutable bindings and audit events; R2 stores private artifacts; D1 stores versions and predicates; a server-side coordinator issues one-time E2B jobs. Neither user interface receives the coordinator token or uploads `Webflow observed` evidence.

The reviewer web app is the reason this is a Hybrid App. A separate browser extension is not part of the required architecture. Historical companion records and endpoints may remain readable during migration, but they do not appear in the active validation flow or contribute to the security result.

Reviewer reruns must preserve the original review-version ID, bundle SHA-256, published target, installation ID, pinned runtime SHA-256/SRI, ready selector, and negative proxy probe. A replay creates a new immutable observation linked to that package; it never overwrites an earlier result. If any required binding is stale or missing, the rerun stays blocked until a new package is prepared.

When a developer uploads a revision, the Designer Extension pre-fills the new Runtime Test Package from the most recent package for that review: the dedicated test site, installation ID, runtime pin, selector, and proxy probe. The form marks those values as prior test input and asks the developer to review them. A prior package or Webflow observation never transfers to the new bundle; the new version starts unprepared and receives its own immutable evidence only after another Webflow-controlled run.

## Package boundaries

- `src/`: deterministic bundle review contract, artifact-scope detection, runtime-reference discovery, and plain-language guidance.
- `worker/`: Cloudflare Worker API with dedicated D1 metadata and private R2 bundle storage.
- `extension/`: native large right-panel Webflow Designer Extension.
- `runner/`: Webflow-controlled Playwright/E2B runtime observation runner.
- `migrations/`: dedicated Preflight D1 schema.

Raw partner bundles remain in private, owner-scoped R2 keys. They do not enter App Governance. Cross-app pattern candidates contain rule IDs, counts, dates, and generic guidance only; producing a governance handoff requires a separate authorized human approval and still performs no external write.

## Governance precision requirements

The governance backlog defines runtime integrity as the P0 rule: code that executes on a customer site must be reviewed, registered, and integrity-pinned regardless of whether it arrived through an App bundle, the Custom Code API, or a pasted loader. Preflight therefore keeps the executed-byte hash, DOM SRI, child-script inventory, source-map availability, and negative proxy result visible as separate predicates rather than collapsing them into one generic pass.

Findings must also preserve provenance. Each evidence location should identify developer-owned code or a declared third-party dependency when that can be proven. The default remains "if it is in your bundle, you own it"; a dependency finding may be reclassified only by a versioned, reviewer-owned library policy with the matching package/version and supporting evidence. A heuristic match or developer declaration alone cannot allowlist or close a blocker. This distinction improves routing and feedback without lowering the review bar.

The reviewer surface must keep bundle/source visibility, source-map gaps, iframe-only blind spots, DOM access to credential fields, and uninstall responsibility explicit. For the Consent Pro pilot, the unresolved Custom Code API uninstall limitation remains documented but unscored; it does not weaken the runtime-integrity predicates.

## Review flow

1. The extension gets a short-lived Webflow ID token and uploads the zip to the Worker.
2. The Worker hashes and stores the original bytes, runs deterministic rules, persists the policy snapshot, and returns Designer Extension and production-runtime coverage separately.
3. Revisions create immutable versions and return resolved, remaining, and new rule IDs.
4. A developer prepares a version-bound Runtime Test Package in the Designer Extension. A reviewer may inspect or replay the same package from the reviewer web app. The package records the dedicated published target, installation allowlist, pinned runtime bytes, SRI, ready selector, and negative proxy probe as test input—not evidence.
5. After the owning Webflow approval boundary issues the job, the E2B coordinator runs the exact package and returns normalized evidence through its own server-side token. That token is never placed in the Designer Extension or sandbox.
6. Developers read the result in the Designer Extension; reviewers read the same immutable predicates, blockers, and artifact receipts in the web app. Their role changes access and authorization, not the security result.

## Complete runtime observation

Licensed and account-gated behavior uses a different trust model from the public runtime fetch:

1. The partner prepares a Runtime Test Package tied to the current review version and bundle SHA. It names a dedicated published Webflow test site, a one-hour installation allowlist, immutable runtime URLs whose SHA-256 and SRI resolve to the same bytes, one runtime-ready selector, and one bounded proxy-canary template.
2. The package is labeled `Partner supplied`. It is test input, not evidence. The partner cannot create an executable observation job, read its capability, upload review evidence, or change review state.
3. After explicit human approval and sandbox-ownership verification, the Webflow coordinator creates a 15-minute observation job. The one-time capability is returned to the coordinator once and stored only as a SHA-256 hash.
4. E2B opens a fresh Chromium context, proves it reached the published origin, instruments runtime-created script elements before page code executes, enforces the exact host and request budgets, masks form controls, and captures scripts, executed hashes, DOM SRI, source maps, sanitized network and console metadata, structural DOM/storage state, screenshots, and the Webflow-owned negative proxy canary.
5. The runner uploads a strict multipart manifest and artifact set. The Worker revalidates every binding, redaction receipt, type, size, and digest before writing immutable R2 objects and D1 metadata. A successful upload consumes the capability; replay fails closed.
6. The extension displays the earned `Webflow observed` result. It remains evidence only and cannot approve, reject, close a deterministic finding, or write to governance.

A partner-run browser cannot produce trusted review evidence because the partner controls both the subject and the collector. Webflow-controlled execution fixes that provenance problem, but no finite run can prove a third-party backend will never serve conditional behavior. Runtime bytes must therefore be included in the review or use immutable versioned delivery with a pinned hash/SRI. Mutable post-approval delivery remains a security blocker; random coordinator nonces, timing, and repeat runs are defense-in-depth.

## Local operation

Bootstrap the worktree, then build the domain package:

```bash
pnpm bootstrap:worktree
pnpm --filter @create-something/webflow-app-review-preflight build
```

Initialize local D1 and start the Worker with a local-only test identity:

```bash
cd packages/webflow-app-review-preflight/worker
pnpm exec wrangler d1 migrations apply webflow-app-review-preflight --local --config wrangler.jsonc
pnpm exec wrangler dev --config wrangler.jsonc --port 8787 \
  --var PREFLIGHT_DEV_TOKEN:test-token \
  --var E2B_COORDINATOR_TOKEN=coordinator-test-token \
  --var RUNTIME_CANARY_URL=http://127.0.0.1:4174/webflow-runtime-canary
```

Build and serve the extension:

```bash
cd packages/webflow-app-review-preflight/extension
pnpm build
python3 -m http.server 1337 --directory public
```

For the real Designer surface, use `pnpm serve` and add the displayed development extension through Webflow Designer. Production promotion must set `globalThis.PREFLIGHT_API_BASE` to the approved Worker origin in the extension shell; the bundle fails closed when that value is absent outside localhost.

Production authentication uses the registered Hybrid App's OAuth installation. Configure `WEBFLOW_CLIENT_ID`, `WEBFLOW_CLIENT_SECRET`, `WEBFLOW_OAUTH_REDIRECT_URI`, and a base64-encoded 32-byte `WEBFLOW_TOKEN_ENCRYPTION_KEY` as server-only Worker configuration. Open `/v1/oauth/webflow/start` to begin the state-bound installation flow. The callback exchanges the single-use code, encrypts the resulting app token before D1 storage, and never sends that token to the browser. The Worker then uses the token to resolve short-lived values from `webflow.getIdToken()`. `WEBFLOW_APP_ACCESS_TOKEN` remains an optional managed-secret fallback for controlled rotation and rollback.

Run the owned-fixture lifecycle after building the runner and starting the local Worker:

```bash
pnpm --filter @create-something/webflow-app-review-runtime-runner build
node packages/webflow-app-review-preflight/runner/fixtures/server.mjs

PREFLIGHT_BUNDLE_PATH=/path/to/app-bundle.zip \
RUNTIME_EVIDENCE_OUTPUT=.codex/partner-runtime-evidence/evidence/browser \
node packages/webflow-app-review-preflight/runner/scripts/run-local-integration.mjs
```

The integration fixture supports explicit negative receipts. Start its server with `RUNTIME_FIXTURE_DYNAMIC=1` to prove runtime-created loaders are blocked, or `RUNTIME_FIXTURE_TAMPERED=1` to prove changed bytes and a missing ready signal are blocked; set `RUNTIME_EXPECT_SECURITY_STATUS=blocked` on the integration command. Every run writes `receipt.json` beside its immutable artifacts.

The integration script uses fixed local development identities only. Production uses separately managed Webflow identity, coordinator authorization, and per-job capabilities; do not reuse local tokens.

## Security boundaries

- Zip uploads are limited to 10 MB, 50 MB uncompressed, and 2,000 files, and must pass deterministic archive processing before D1 writes.
- Evidence snippets are bounded; full immutable bytes stay in R2.
- CORS uses an explicit origin allowlist.
- Production users are owner-scoped through resolved Webflow identity.
- OAuth callbacks require a matching secure, HttpOnly browser state cookie and a one-time server-side state record. App tokens are AES-GCM encrypted before D1 storage and never returned in browser responses or logs.
- Runtime jobs accept only public HTTPS targets, reject templates and private/local hosts, and allow at most eight targets, twenty requests, ten seconds per request, and sixty seconds total.
- Runtime evidence contains response metadata and object keys only—no response bodies, credentials, cookies, tokens, official decisions, or governance writes.
- E2B, Webflow app, pattern coordinator, and governance approver credentials are separate server-side boundaries.
- Runtime Test Packages accept only a named Webflow sandbox, a short installation allowlist, pinned artifacts with matching SHA-256/SRI bytes, one bounded runtime-ready selector, and one proxy template whose host is already in the job allowlist.
- Observation jobs use hashed, expiring, one-time capabilities. Partner identity cannot issue or fetch a job or submit evidence.
- Evidence intake is limited to 128 KB of manifest data, 10 MB total artifacts, a fixed file/type allowlist, per-file limits, strict SHA-256 validation, and secret-shaped metadata rejection before R2 writes.
- The runner records no headers, cookies, response/request bodies, form values, or storage values. Query values and console personal/secret-shaped text are redacted, and form controls are masked in screenshots.
- Production sandbox and canary URLs must be HTTPS and on Webflow-controlled origins. Development HTTP/private targets are accepted only when the Worker itself runs outside production.
- Mutable runtime delivery, hash/SRI mismatch, runtime-created script elements, unreviewed child scripts, source-map gaps, and proxy exposure remain evidence-backed blockers or manual-review inputs. Cleanup is recorded only for legacy compatibility and is not scored. Observation does not downgrade security findings.

## Verification

```bash
pnpm --filter @create-something/webflow-app-review-preflight test
pnpm --filter @create-something/webflow-app-review-preflight check
pnpm --filter @create-something/webflow-app-review-preflight build
pnpm --filter @create-something/webflow-app-review-preflight-worker test
pnpm --filter @create-something/webflow-app-review-preflight-worker check
pnpm --filter @create-something/webflow-app-review-preflight-worker build
pnpm --filter @create-something/webflow-app-review-preflight-extension test
pnpm --filter @create-something/webflow-app-review-preflight-extension check
pnpm --filter @create-something/webflow-app-review-preflight-extension bundle
pnpm --filter @create-something/webflow-app-review-runtime-runner test
pnpm --filter @create-something/webflow-app-review-runtime-runner check
pnpm --filter @create-something/webflow-app-review-runtime-runner build
```

## Deployment and rollback

This package is additive. Production promotion requires creating a dedicated D1 database and private R2 bucket, replacing the placeholder D1 ID, configuring approved origins and server-only secrets, deploying the Worker, and installing the bundled extension. None of those actions are part of local verification.

Rollback is removal-first: disable the Designer Extension, stop observation-job issuance, stop routing traffic to the Worker, and retain the dedicated D1/R2 evidence under the owning retention policy. Revoke outstanding jobs or let their 15-minute capabilities expire; do not delete evidence outside the approved retention process. Because no existing governance schema or review endpoint is replaced, rollback does not require reverting another production system.
