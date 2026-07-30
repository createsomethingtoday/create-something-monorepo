# Governance pitfalls: the patterns that actually fail review

These are the recurring, real-world patterns that most often trigger a rejection or escalate an App into deeper security review. They generalize the highest-signal issues seen across many App submissions. Each maps to a public Marketplace guideline — so following them is simply meeting the bar, done early. Check every one that could apply before you submit.

## 1. Dev builds trip the security scanner

**Pattern:** Uploading a development bundle. Dev builds embed `eval()` (webpack dev mode) and framework error-decoder URLs (e.g. React's reactjs.org/react.dev links). Automated scanning flags these as prohibited code execution or undisclosed external connections — even though the code never runs in production.

**Why it's a majority of flags:** A large share of security flags on submissions come from third-party libraries, not the developer's own code, and the single biggest culprit is dev-build artifacts.

**Fix:** Ship a production build. Minify, strip dev tooling, remove dead external URLs. Be able to name every third-party library in your bundle.

## 2. DOM scraping and credential-field access

**Pattern:** Reading data out of the published DOM instead of an API — e.g. reconstructing form field options by scraping the page — or reaching into password/login/credential inputs present in the DOM.

**Fix:** Use official APIs (the Forms API for form structure). Never read credential fields from any DOM. If an API gap is forcing you to scrape, that's a signal to reconsider the approach, not to scrape around it.

## 3. Injecting code you don't pin, version, or clean up

**Pattern:** Delivering code to a customer's published site in a way that dodges the review lifecycle — a manual copy-paste snippet, a runtime loader that fetches remote code, an in-place edit to an "approved" script, or a script left behind after uninstall. Swapping the contents a hosted script or loader endpoint serves after approval is the version of this that gets an App **removed and possibly banned** ("self-certified live update").

**Fix:**

- Deliver code through the **Custom Code API**, not manual paste (manual paste can't be versioned/removed and can double-run).
- Script versions are **immutable** — to change code that runs on sites, register a **new version** and submit an **App update** for review. Never modify in place.
- Loaders are only allowed if every remote resource is declared at submission **and pinned** (hosted scripts need `hostedLocation` + `integrityHash`/SRI on a fixed version).
- On uninstall, remove applied scripts at **both site and page level** — keep the `custom_code:write` + `sites:write`/`pages:write` scopes needed to do it — and prompt the user to publish (don't auto-publish). Injected code persists until removed; the platform does not clean it up for you. Where programmatic removal genuinely isn't possible, give the user explicit in-app removal instructions instead — but never just leave it running.

## 4. Calling the API after the user said no

**Pattern:** Continuing to call the Data API after a user revokes access or uninstalls the App.

**Fix:** There is no uninstall webhook — treat persistent authorization failures (401s) on a previously valid token as revocation. When you see them, immediately stop all calls for that site/user, tear down scheduled jobs, and forget cached tokens. This is a consent boundary, and reviewers treat crossing it seriously.

## 5. Over-asking for scopes

**Pattern:** Requesting `:write` when you only read, or scopes for resources the App never touches (e.g. `ecommerce` on a non-commerce App).

**Fix:** Take the union of scopes required by the endpoints you actually call, and request exactly that. Fewer scopes means faster approval and more user trust.

## 6. Iframe-only / opaque apps

**Pattern:** A Designer Extension that is essentially an externally hosted iframe wrapping a remote site, so its real behavior isn't visible to review.

Note the actual objection, because it explains the carve-out: a Designer Extension already runs inside a sandboxed iframe, so the concern is not iframes as a technology. It is that a remotely hosted surface **can change after approval**, which makes the reviewed version unenforceable. That is the same objection as an unpinned script loader or a swapped hosted script — one requirement, different transports: **behavior that reaches a user must be versioned and re-reviewable.** Authentication flows are exempt because that surface generally belongs to a third-party identity provider and isn't yours to mutate.

**Fix:** Ship your UI as real, readable client-side source in the bundle (plus source maps where relevant) so behavior is inspectable, and reserve externally hosted iframes for authentication. Inspectability is a requirement, not a nicety.

## 7. "Private" is not a lower bar or a testing tier

**Pattern:** Treating a private App as exempt from the production-quality bar, or using "private" as a stand-in for pre-launch testing.

**Fix:** Private Apps go through the **same rigorous review as public Apps** — a private App is a workspace-specific/custom App, not a beta tier. Build to the production bar from the start, and don't publish beta/incomplete Apps at all. For validating with outside users before launch, use Webflow's dedicated **user testing process**, which is separate from creating a private App.

## 8. Listing/behavior mismatch and status honesty

**Pattern:** A listing that oversells or misdescribes what the App does; fees or data collection not disclosed; impersonating another company.

**Fix:** Make the description, screenshots, and demo video match exactly what the App does. Disclose every fee and every category of data you collect and why. Be who you say you are.

## 9. Backend endpoints that trust the client

**Pattern:** An endpoint that acts on a client-supplied identifier — site ID, account ID, project ID — with no caller authentication, or with authentication but no check that this caller owns that record. Usually paired with `Access-Control-Allow-Origin: *`, and often with a credential returned to the browser or stored in `localStorage`. The Designer Extension is client code, so every value it sends is attacker-controlled, and site IDs are visible in published page source.

**Why it's high-signal:** this is the class review finds by _calling_ the endpoint, not by reading the bundle — so it survives an otherwise clean-looking submission, and when it's real it exposes customer credentials or lets one tenant reach another's data.

**Fix:** Authenticate every endpoint. Resolve identity server-side from the Webflow ID token and bind it to the record being accessed. Enforce object-level authorization and test it — a valid caller requesting someone else's resource gets a non-enumerating failure, not data. Never return reusable credentials to the client. Allowlist CORS origins, and treat CORS as defense-in-depth, never as the control that keeps callers out.

## 10. Non-production infrastructure in a production artifact

**Pattern:** The submitted bundle points at staging, localhost, or a tunnel host, or the declared installation URL is a non-production endpoint. Sometimes it's even disclosed in the submission notes and shipped anyway.

**Why it matters:** Marketplace Apps must run on production infrastructure that stays available through review and in use. A staging dependency means customers rely on a host with no production guarantees, and reviewers can't verify what the App really does. It also tends to travel with test credentials and permissive CORS.

**Fix:** Deploy a documented production service, generate a production-only bundle, keep test and production data separate, and add a build rule that fails when development, staging, localhost, or tunnel endpoints appear in a Marketplace artifact. Check the installation URL you declare, not just the code.

---

If any pattern above applies, resolve it before submitting. These are not edge cases — they are the modal reasons a well-intentioned App gets bounced or pulled into a longer review.
