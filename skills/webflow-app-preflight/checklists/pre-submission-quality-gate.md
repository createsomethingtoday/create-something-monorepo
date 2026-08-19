# Pre-submission quality gate

Every item must pass before submitting. If one fails, fix it — a failed submission costs another 10–15 business days.

**Provenance:** items trace to Webflow's published Marketplace Guidelines and developer documentation unless tagged **`[control]`** — a security or engineering control that generalizes recurring review risk and prepares evidence, but is not verbatim published Webflow policy. (These are the same labels the toolkit defines: published requirement vs. security control.)

## Is it real?

- [ ] App runs end to end with no crashes on basic use.
- [ ] No placeholder content, lorem ipsum, or test data visible to end users.
- [ ] Backend services / APIs are live and will stay up through the whole review window.
- [ ] Demo access is ready: demo account, full demo mode, or credentials to required resources.
- [ ] Clear user-facing documentation and error handling exist.

## Is it safe and inspectable?

- [ ] Production build shipped — no `eval()`, no dev-mode bundle, no framework error-decoder URLs.
- [ ] No direct DOM manipulation of the Designer; Designer APIs used instead.
- [ ] No externally hosted iframe as the primary App UI or runtime surface — that surface can change after approval, so review can't cover it. Iframes are fine for authentication flows.
- [ ] No excessive global variables.
- [ ] Third-party dependencies are known and nameable; no dead/unused external connection URLs.
- [ ] No credential fields (password/login) read from any published DOM.
- [ ] Data comes from official APIs (e.g. Forms API), not DOM scraping.
- [ ] Client Secret is server-side only — not in the bundle, client JS, or repo.
- [ ] Designer Extension source code is readable and uploaded through the version manager.
- [ ] Archive contains exactly one canonical `webflow.json`, and the app title is the real product name — no scaffold defaults like "My React App".
- [ ] The **bundled** `webflow.json` carries no CLI telemetry block (`telemetry.global.allowTelemetry`) — the CLI can inject one at bundle time even when your source manifest is clean, so check the artifact you upload, not the file in your repo.
- [ ] The artifact you verify is the artifact you upload — run production checks against the contents of `bundle.zip`, not a working-directory build output that a dev server can overwrite.
- [ ] `bundle.zip` does not exceed the 5MB Designer Extension bundle limit — an oversized bundle fails at upload, before review starts.
- [ ] The bundled `webflow.json` declares the required manifest fields — `name`, `apiVersion` (`"2"`), and `publicDir` matching your build output directory.

## Backend & API surface

Reviewers verify these by calling your endpoints and asking for evidence, not by reading the bundle. Premise: a Designer Extension is client code running on someone else's machine, so every value it sends is attacker-controlled. Most items in this section are `[control]`-class — security and engineering controls that prepare demonstrable evidence — anchored by the published security, privacy, and consent guidelines.

- [ ] Every backend endpoint requires verified caller authentication.
- [ ] No endpoint authorizes on a client-supplied identifier alone (site ID, account ID, project ID — site IDs are visible in published page source); identity is resolved server-side from the Webflow ID token.
- [ ] Object-level authorization tested: a caller authorized for one site/tenant cannot read or write another's records, and gets a non-enumerating failure.
- [ ] No reusable credential (third-party API key, access token, connection secret) is returned to the extension or visible in browser network traffic.
- [ ] Outbound request destinations resolve from a server-side allowlist; HTTPS enforced; no user-supplied hosts.
- [ ] CORS allowlists your production origins — not `*`, and never `*` together with `Allow-Credentials: true`; CORS is defense-in-depth, not authorization.
- [ ] `[control]` Credentials encrypted at rest and scoped per tenant; decrypted values server-side only.
- [ ] No identity, session, or entitlement state derived from `localStorage`/`sessionStorage`.
- [ ] Values interpolated into generated scripts, markup, or custom attributes are JSON-serialized and format-validated.
- [ ] Uploads validated server-side for type, size, count, and file signature; archive contents inspected.
- [ ] Actions are attributed to the authenticated user — no hardcoded owner or service identity standing in for real users.
- [ ] `[control]` Dependency audit clean of High/Critical advisories, or a documented function-level reachability analysis; production manifest and lockfile available on request.
- [ ] No staging, localhost, or tunnel hostnames anywhere in the artifact, and the declared installation URL is a production host.
- [ ] `[control]` OAuth callback validates a single-use, server-stored `state` bound to the pending authorization — the CSRF control in Webflow's OAuth flow (PKCE is not part of Webflow's documented flow; use PKCE on third-party OAuth flows your app performs that support it).
- [ ] Client bundle contains client code only — no server handlers, database schema, JWT logic, or backend dependencies (check the source map, which will reveal whatever the bundle contains).
- [ ] Production logs contain no personal data or credentials; sensitive fields redacted at the logging boundary.

## Consent & lifecycle

- [ ] Requested scopes are the minimum the App actually calls.
- [ ] Install URL scopes are equal to or a subset of configured scopes.
- [ ] App stops calling the Data API immediately on revoke/uninstall — a persistent 401 on a previously valid token is revocation, not an error to retry past.
- [ ] Code on customer sites is delivered via the Custom Code API, not manual paste.
- [ ] Injected scripts are version-pinned (hosted scripts use SRI `integrityHash`); no runtime loaders unless declared + pinned at submission.
- [ ] Any change to injected code ships as a new script version + App update — never edited in place.
- [ ] App retains the scopes needed to clean up (`custom_code:write` + `sites:write`/`pages:write`) and removes scripts at both site and page level on uninstall.
- [ ] If programmatic removal isn't possible, the App gives clear in-app instructions telling the user exactly what to remove and where — injected code is never simply left behind.
- [ ] User is prompted to publish after any API-managed apply, update, or removal, since the change only reaches the published site on publish.

## Privacy & data handling

- [ ] Users are told clearly what data the App collects, where it's stored, and how it's used.
- [ ] A reachable privacy policy covers that disclosure.
- [ ] `[control]` Terms of Service and Privacy Policy are distinct, publicly reachable URLs — not the same page.
- [ ] Appropriate security measures protect stored user data from unauthorized access.
- [ ] On uninstall, user data retained in _your own_ backend is deleted or anonymized — not just the scripts removed from the site.
- [ ] Personal data handling complies with applicable privacy laws.

## Is it honest?

- [ ] Listing description, screenshots, and demo video match actual behavior.
- [ ] Any fees, subscriptions, or in-app purchases are clearly disclosed.
- [ ] No impersonation; affiliations/partnerships/endorsements stated accurately.
- [ ] Accurate, reliable contact info provided.
- [ ] Only one developer account used.
- [ ] No ads.

## Listing assets

- [ ] Avatar 512×512, 1:1.
- [ ] 3–5 screenshots at 1280×846 of real features.
- [ ] Demo video (2–5 min, install→usage); Data Client Apps show OAuth approve **and** deny.
- [ ] Homepage URL is valid HTTPS.

## Account

- [ ] Two-factor authentication enabled on an admin account of the submitting Workspace.

## Design & UX (Designer Extensions)

- [ ] Visual style, typography, and color align with Webflow's App design guidelines.
- [ ] Intuitive navigation, clear labels, minimal required input.
- [ ] No keyboard shortcuts to invoke the App.
- [ ] Accessible: alt text, keyboard navigation, sufficient contrast.
- [ ] No long-running background processes that degrade Designer performance.
