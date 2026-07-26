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
- On uninstall, remove applied scripts at **both site and page level** — keep the `custom_code:write` + `sites:write`/`pages:write` scopes needed to do it — and prompt the user to publish (don't auto-publish).

## 4. Calling the API after the user said no

**Pattern:** Continuing to call the Data API after a user revokes access or uninstalls the App.

**Fix:** There is no uninstall webhook — treat persistent authorization failures (401s) on a previously valid token as revocation. When you see them, immediately stop all calls for that site/user, tear down scheduled jobs, and forget cached tokens. This is a consent boundary, and reviewers treat crossing it seriously.

## 5. Over-asking for scopes

**Pattern:** Requesting `:write` when you only read, or scopes for resources the App never touches (e.g. `ecommerce` on a non-commerce App).

**Fix:** Take the union of scopes required by the endpoints you actually call, and request exactly that. Fewer scopes means faster approval and more user trust.

## 6. Iframe-only / opaque apps

**Pattern:** A Designer Extension that is essentially an externally hosted iframe wrapping a remote site, so its real behavior isn't visible to review.

**Fix:** Use externally hosted iframes only for authentication. Provide real, readable client-side source (and source maps where relevant) so behavior is inspectable. Inspectability is a requirement, not a nicety.

## 7. "Private" is not a lower bar or a testing tier

**Pattern:** Treating a private App as exempt from the production-quality bar, or using "private" as a stand-in for pre-launch testing.

**Fix:** Private Apps go through the **same rigorous review as public Apps** — a private App is a workspace-specific/custom App, not a beta tier. Build to the production bar from the start, and don't publish beta/incomplete Apps at all. For validating with outside users before launch, use Webflow's dedicated **user testing process**, which is separate from creating a private App.

## 8. Listing/behavior mismatch and status honesty

**Pattern:** A listing that oversells or misdescribes what the App does; fees or data collection not disclosed; impersonating another company.

**Fix:** Make the description, screenshots, and demo video match exactly what the App does. Disclose every fee and every category of data you collect and why. Be who you say you are.

---

If any pattern above applies, resolve it before submitting. These are not edge cases — they are the modal reasons a well-intentioned App gets bounced or pulled into a longer review.
