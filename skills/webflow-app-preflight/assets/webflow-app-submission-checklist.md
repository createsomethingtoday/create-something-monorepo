# Webflow App submission checklist

A self-contained pre-submission checklist for developers building a Webflow Marketplace App — Designer Extension, Data Client, or Hybrid.

Every requirement here traces to Webflow's published Marketplace Guidelines and developer documentation. Following it isn't extra work; it's meeting the existing bar early, while changes are still cheap. A failed submission costs another review cycle, and reviews take roughly 10–15 business days.

Work top to bottom. Anything you can't check is worth fixing before you submit, not after.

---

## What reviewers are actually deciding

Three questions sit underneath every requirement below:

1. **Is it real?** Fully functional, no placeholder or test data, backend live throughout the review window, demo access provided.
2. **Is it safe and inspectable?** Readable source, no dangerous patterns, honors user consent, requests only the permissions it uses, cleans up after itself, and its backend enforces authorization rather than assuming it.
3. **Is it honest?** The listing matches actual behavior, fees are disclosed, you are who you say you are.

If you can answer yes to all three _with evidence_, the App passes.

---

## The checklist

### Is it real?

- [ ] App runs end to end with no crashes on basic use.
- [ ] No placeholder content, lorem ipsum, or test data visible to end users.
- [ ] Backend services and APIs are live and will stay up through the whole review window.
- [ ] Demo access is ready: a demo account, a full demo mode, or credentials to required resources.
- [ ] Clear user-facing documentation and error handling exist.

### Is it safe and inspectable?

- [ ] Production build shipped — no `eval()`, no dev-mode bundle, no framework error-decoder URLs.
- [ ] No direct DOM manipulation of the Designer; Designer APIs used instead.
- [ ] No externally hosted iframe as the primary App UI or runtime surface. Iframes are fine for authentication flows.
- [ ] No excessive global variables.
- [ ] Third-party dependencies are known and nameable; no dead or unused external connection URLs.
- [ ] No credential fields (password/login) read from any published DOM.
- [ ] Data comes from official APIs (for example the Forms API), not DOM scraping.
- [ ] Client Secret is server-side only — not in the bundle, client JS, or repo.
- [ ] Designer Extension source is readable and uploaded through the version manager.
- [ ] Archive contains exactly one canonical `webflow.json`, and the app title is your real product name — no scaffold defaults like "My React App".
- [ ] The **bundled** `webflow.json` carries no CLI telemetry block (`telemetry.global.allowTelemetry`). The CLI can add one at bundle time even when your source manifest is clean, so check the file inside the artifact you upload.
- [ ] The artifact you verify is the artifact you upload — run your production checks against the contents of `bundle.zip`, not a working-directory build a dev server can overwrite.

### Backend and API surface

Reviewers verify these by calling your endpoints and asking for evidence, not by reading your bundle. Start from one premise: **a Designer Extension is client code running on someone else's machine, so every value it sends is attacker-controlled** — including identifiers that feel internal. A Webflow site ID is visible in published page source.

- [ ] Every backend endpoint requires verified caller authentication.
- [ ] No endpoint authorizes on a client-supplied identifier alone (site ID, account ID, project ID). Identity is resolved server-side from the Webflow ID token.
- [ ] Object-level authorization tested: a caller authorized for one site or tenant cannot read or write another's records, and gets a non-enumerating failure.
- [ ] No reusable credential — third-party API key, access token, connection secret — is returned to the extension or visible in browser network traffic.
- [ ] Outbound request destinations resolve from a server-side allowlist. HTTPS enforced. No user-supplied hosts.
- [ ] CORS allowlists your production origins — not `*`, and never `*` together with `Allow-Credentials: true`.
- [ ] Credentials encrypted at rest and scoped per tenant; decrypted values server-side only.
- [ ] No identity, session, or entitlement state derived from `localStorage` or `sessionStorage`.
- [ ] Values interpolated into generated scripts, markup, or custom attributes are JSON-serialized and format-validated.
- [ ] Uploads validated server-side for type, size, count, and file signature; archive contents inspected.
- [ ] Actions are attributed to the authenticated user — no hardcoded owner or service identity standing in for real users.
- [ ] Dependency audit clean of High and Critical advisories, or a documented function-level reachability analysis. Production manifest and lockfile available on request.
- [ ] No staging, localhost, or tunnel hostnames anywhere in the artifact, and the installation URL you declare is a production host.
- [ ] OAuth callback validates a single-use, server-stored `state` bound to the pending authorization; PKCE used where the OAuth model supports it.
- [ ] Client bundle contains client code only — no server handlers, database schema, JWT logic, or backend dependencies (check the source map, which will reveal whatever the bundle contains).
- [ ] Production logs contain no personal data or credentials; sensitive fields redacted at the logging boundary.

### Consent and lifecycle

- [ ] Requested scopes are the minimum the App actually calls.
- [ ] Install URL scopes are equal to or a subset of your configured scopes.
- [ ] App stops calling the Data API immediately on revoke or uninstall.
- [ ] Code on customer sites is delivered via the Custom Code API, not manual copy-paste.
- [ ] Injected scripts are version-pinned — hosted scripts use an SRI `integrityHash`. No runtime loaders unless every remote resource is declared and pinned at submission.
- [ ] Any change to injected code ships as a new script version plus an App update — never edited in place.
- [ ] App retains the scopes needed to clean up (`custom_code:write` plus `sites:write`/`pages:write`) and removes scripts at both site and page level on uninstall.
- [ ] If programmatic removal isn't possible, the App gives clear in-app instructions telling the user exactly what to remove and where — injected code is never simply left behind.
- [ ] User is prompted to publish after any API-managed apply, update, or removal, since the change only reaches the published site on publish.

### Privacy and data handling

- [ ] Users are told clearly what data the App collects, where it's stored, and how it's used.
- [ ] A reachable privacy policy covers that disclosure.
- [ ] Terms of Service and Privacy Policy are distinct, publicly reachable URLs — not the same page.
- [ ] Appropriate security measures protect stored user data from unauthorized access.
- [ ] On uninstall, user data retained in _your own_ backend is deleted or anonymized — not just the scripts removed from the site.
- [ ] Personal data handling complies with applicable privacy laws.

### Is it honest?

- [ ] Listing description, screenshots, and demo video match actual behavior.
- [ ] Any fees, subscriptions, or in-app purchases are clearly disclosed.
- [ ] No impersonation; affiliations, partnerships, and endorsements stated accurately.
- [ ] Accurate, reliable contact info provided.
- [ ] Only one developer account used.
- [ ] No ads.

### Listing assets

- [ ] Avatar 512×512, 1:1 aspect ratio.
- [ ] 3–5 screenshots at 1280×846 showing real features.
- [ ] Demo video, 2–5 minutes, install through usage. Data Client Apps must show OAuth approval **and** denial.
- [ ] Homepage URL is valid HTTPS.

### Account

- [ ] Two-factor authentication enabled on an admin account of the submitting Workspace.

### Design and UX (Designer Extensions)

- [ ] Visual style, typography, and color align with Webflow's App design guidelines.
- [ ] Intuitive navigation, clear labels, minimal required input.
- [ ] No keyboard shortcuts to invoke the App.
- [ ] Accessible: alt text, keyboard navigation, sufficient contrast.
- [ ] No long-running background processes that degrade Designer performance.

---

## The ten patterns that most often fail review

These are the recurring reasons a well-intentioned App gets bounced or pulled into a longer security review.

**1 · Dev builds trip the security scanner.** Development bundles embed `eval()` and framework error-decoder URLs. Automated scanning flags these as prohibited code execution or undisclosed external connections, even though the code never runs in production. _Ship a production build; be able to name every library in your bundle._

**2 · DOM scraping and credential-field access.** Reading data out of the published DOM instead of an API, or reaching into password and login inputs. _Use official APIs. Never read credential fields. If an API gap is forcing you to scrape, that's a signal to reconsider the approach._

**3 · Injecting code you don't pin, version, or clean up.** Manual paste snippets, runtime loaders that fetch remote code, in-place edits to an approved script, or scripts left behind after uninstall. Swapping what a hosted script serves after approval can get an App removed and possibly banned. _Deliver through the Custom Code API. Script versions are immutable — register a new version and submit an App update. Loaders are allowed only when every remote resource is declared and SRI-pinned at submission. Remove your scripts at site and page level on uninstall, and prompt the user to publish._

**4 · Calling the API after the user said no.** There is no uninstall webhook. _Treat persistent 401s on a previously valid token as revocation: stop all calls for that site, tear down scheduled jobs, forget cached tokens. Do not retry past it._

**5 · Over-asking for scopes.** Requesting `:write` when you only read, or scopes for resources the App never touches — `ecommerce` on a non-commerce App is the classic. _Take the union of scopes required by the endpoints you actually call, and request exactly that._

**6 · Iframe-only or opaque apps.** A Designer Extension that's essentially a remote site in a frame. The objection isn't iframes as technology — your extension already runs in a sandboxed iframe. It's that a remotely hosted surface **can change after approval**, which makes the reviewed version unenforceable. That's the same objection as an unpinned loader: **behavior that reaches a user must be versioned and re-reviewable, whichever transport delivers it.** _Ship your UI as readable client-side source in the bundle; reserve externally hosted iframes for authentication._

**7 · Backend endpoints that trust the client.** An endpoint acting on a client-supplied site, account, or project ID with no caller authentication — or with authentication but no check that this caller owns that record. Often paired with `Access-Control-Allow-Origin: *`, a credential returned to the browser, or state kept in `localStorage`. This is the class reviewers find by _calling_ your endpoint, so it survives an otherwise clean-looking submission. _Authenticate everything. Resolve identity server-side from the Webflow ID token and bind it to the record. Enforce and test object-level authorization. Never return reusable credentials. Treat CORS as defense-in-depth, never as the control that keeps callers out._

**8 · Non-production infrastructure in a production artifact.** The bundle points at staging, localhost, or a tunnel host, or the declared installation URL is a non-production endpoint. _Deploy a documented production service, generate a production-only bundle, separate test and production data, and add a build rule that fails when development endpoints appear in a Marketplace artifact. Check the installation URL you declare, not just the code._

**9 · "Private" is not a lower bar or a testing tier.** Private Apps go through the same rigorous review as public Apps — a private App is a workspace-specific custom App, not a beta tier. _Build to the production bar from the start. To validate with outside users before launch, use Webflow's user testing process._

**10 · Listing and behavior mismatch.** A listing that oversells or misdescribes the App; undisclosed fees or data collection. _Make the description, screenshots, and demo video match exactly what the App does, and disclose every fee and category of data you collect._

---

## Three things that sound reasonable and are wrong

Worth stating plainly, because each one inverts a real requirement:

- ❌ "Add exponential backoff and retry on the 401." A persistent 401 on a previously valid token is **revocation**. Stop calling.
- ❌ "Drop the extra scopes on uninstall." You must **retain** `custom_code:write` plus `sites:write`/`pages:write`, or cleanup is impossible.
- ❌ "Webflow removes injected scripts automatically on uninstall." It does not. Removal is your responsibility, at site _and_ page level.

Two more on the backend side:

- ❌ "The endpoint is safe because CORS restricts which origins can call it." CORS is a browser policy, not authorization. A non-browser client ignores it entirely.
- ❌ "Only our extension knows that site ID, so it's safe to key on." Site IDs appear in published page source.

---

## Submitting

Submit through <https://developers.webflow.com/submit>. Reviews take roughly 10–15 business days.

Submit only when the checklist above is fully green, two-factor auth is enabled on an admin account of the submitting Workspace, your backend is live with demo access provided, the listing matches actual behavior, and the App is complete and production-ready. Beta, incomplete, or pre-release Apps should not be published.

Every later change to the reviewed experience — bundle, Data Client behavior, permissions, or scripts delivered via the Custom Code API — goes through the same review as an **App update**. Submit the same form and select "App Update"; only App Name and Client ID are required.

## Where these requirements come from

- Marketplace Guidelines — <https://developers.webflow.com/apps/docs/marketplace-guidelines>
- Scopes — <https://developers.webflow.com/data/reference/scopes>
- Working with Custom Code — <https://developers.webflow.com/data/docs/working-with-custom-code>
- Register a hosted script — <https://developers.webflow.com/data/reference/custom-code/custom-code/register-hosted>
- Designer ID tokens — <https://developers.webflow.com/designer/reference/get-user-id-token>
- Hybrid Apps — <https://developers.webflow.com/data/v1.0.0/docs/hybrid-apps>
- Developer platform — <https://developers.webflow.com/>
