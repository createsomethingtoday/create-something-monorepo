# OAuth, scopes & security

## OAuth flow (Data Clients)

1. Send the user to the **Install URL** (authorization URL). The recommended form initiates OAuth directly:
   `https://webflow.com/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&scope=YOUR_SCOPES`
   `redirect_uri` is **optional** here — Webflow uses the Redirect URI configured in your app settings. Only pass it explicitly if you registered more than one and need to select between them.
2. The user approves or denies. Your demo video must show **both** paths.
3. On approval, Webflow redirects to your Redirect URI with an authorization code.
4. Exchange the code (server-side, using your **Client Secret**) for an access token. `redirect_uri` **is** required on the token exchange if you passed one on the authorize step.
5. Call the Data API with the token, staying within granted scopes.

Designer Extension–only Apps need no install URL — Webflow handles the install/authorize flow. Custom Code API endpoints are callable **only with OAuth (App) tokens**, not site or Workspace tokens.

### Bind the callback to the request that started it

Steps 1→4 cross a trust boundary, and your callback endpoint is publicly reachable. Two controls, both engineering practice rather than a Webflow-specific rule:

- **Carry a `state` value and validate it.** Generate a single-use, unguessable value before step 1, store it server-side against the pending authorization, and reject any callback whose `state` is missing, unknown, expired, or already consumed. Without it, an attacker can deliver their own authorization code to your callback and get it exchanged under someone else's session — the code-injection form of CSRF. Webflow's OAuth docs document `state` explicitly as the CSRF protection for this flow.
- **PKCE is not part of Webflow's documented OAuth flow.** The parameters documented for Webflow's authorize and token-exchange endpoints do not include `code_challenge`/`code_verifier` (verified against the public OAuth reference, 2026-08-03) — so in the Webflow flow, the `state` check is your CSRF control. Do use PKCE (`code_verifier`/`code_challenge`) on any third-party OAuth flows your app performs that support it: it binds the exchange to the client that began the flow, so an intercepted code isn't independently redeemable.

A reviewer reading your callback handler looks for the `state` check specifically. If your exchange function takes only an authorization code as input, that reads as the check being absent.

Scopes in the Install URL must be **equal to or a subset of** the scopes configured in app settings, or the install fails with an error shown to the user. Scopes use `scope:action` format; encode the colon as `%3A` in the URL.

## Full scope list

Request only what your App actually calls. Each Data API endpoint documents its required scope — take the union of the endpoints you use and stop there.

Table regenerated from the public scopes reference (<https://developers.webflow.com/data/reference/scopes>) on 2026-08-03 — re-check that page before relying on it, since scopes can be added.

| Resource           | Scopes                                  |
| ------------------ | --------------------------------------- |
| Assets             | `assets:read`, `assets:write`           |
| Authorized User    | `authorized_user:read`                  |
| CMS                | `cms:read`, `cms:write`                 |
| Comments           | `comments:read`, `comments:write`       |
| Components         | `components:read`, `components:write`   |
| Custom Code        | `custom_code:read`, `custom_code:write` |
| Ecommerce          | `ecommerce:read`, `ecommerce:write`     |
| Forms              | `forms:read`, `forms:write`             |
| Pages              | `pages:read`, `pages:write`             |
| Sites              | `sites:read`, `sites:write`             |
| Site Activity      | `site_activity:read`                    |
| Site Configuration | `site_config:read`, `site_config:write` |
| Users              | `users:read`, `users:write`             |
| Workspace          | `workspace:read`, `workspace:write`     |
| Workspace Activity | `workspace_activity:read`               |
| Webhooks           | Varies by trigger type                  |

`authorized_user:read` is required for the **Get Authorized User** endpoint — the natural first call after a token exchange to resolve who authorized your App — so most Data Clients need it. (Authorization info requires no scope.)

> "Only request scopes your app actually needs. Requesting unnecessary scopes can make users hesitant to approve your app."

A `:write` scope you only read with, or an `ecommerce` scope on a non-commerce App, is exactly what a reviewer asks about. Drop it — **with one exception below.**

**Keep the scopes you need to clean up.** If your App applies custom code, it must retain the scopes required to remove that code on uninstall: `custom_code:write`, plus `sites:write` or `pages:write` for scripts applied at the site or page level. Dropping them would strand code on the user's site.

## Token lifecycle — the part apps get wrong

- **Stop on revocation.** When a user revokes access or uninstalls, immediately stop calling the Data API for that site/user. Continuing to call after revocation is a recurring cause of escalation.
- **Handle uninstall as an event.** There is no uninstall webhook — treat persistent 401s on a previously valid token as revocation, then tear down: stop scheduled jobs, remove injected code (below), forget cached tokens.
- **Store tokens securely, server-side only.** Never in the browser, never in the Designer Extension bundle.

## Delivering code to customer sites (Custom Code API)

If your App runs any code on a customer's site, deliver it through the **Custom Code API** — not by asking users to paste scripts manually. Manual paste sits outside your App's lifecycle (you can't version, update, or remove it) and can run twice if you also apply the same script via the API.

The rules that get apps removed if broken:

- **The reviewed version is the approved version.** Any code, scripts, or runtime your App causes to run is part of the reviewed experience. The version evaluated at review is the version approved to run on customer sites.
- **Script versions are immutable.** You cannot overwrite a registered script — each needs a unique `displayName` + `version`. To change code that runs on customer sites, **register a new version and submit an App update for review.** Scripts may not be modified in place.
- **Loaders are not allowed** unless every remotely loaded resource is declared at submission **and** pinned. Hosted scripts require a `hostedLocation` plus an `integrityHash` (SRI, e.g. sha256) computed over the exact contents. A remote endpoint referenced by an approved script may not start serving different functional code after approval.
- **No self-certified live updates.** Routing new functional code to sites through any path that bypasses review — swapping a hosted script's contents, a loader endpoint, or a dynamically imported module — results in Marketplace removal and may result in a ban.
- **Changes take effect on publish.** Applying/updating/removing a script only goes live when the site is published, and publish pushes _all_ staged changes. Prompt the user to publish when ready; don't auto-publish on their behalf.
- **Remove on uninstall.** Remove applied scripts at **both site and page level** when the App is uninstalled, where technically feasible. If automated removal isn't possible, give the user clear removal instructions.

Two different surfaces, two different limits (verified 2026-08-03):

- **Data API inline scripts** (`POST /v2/sites/{site_id}/registered_scripts/inline`): `sourceCode` is limited to **2,000 characters**. It takes JavaScript source — the endpoint's examples pass raw JS, not `<script>` markup.
- **Site/Page settings custom code** (the fields a user edits in project settings — a different surface from the Custom Code API): Webflow raised this to **50,000 characters** shared across Site settings, Page settings, Code Embed elements, and CMS rich text (Webflow product update).

## Designer Extension security patterns

Prohibited / flagged in Designer Extension code:

- `eval()` and other dynamic code execution.
- Direct DOM manipulation of the Designer instead of the Designer APIs.
- Excessive global variables.
- **Externally hosted iframes used as the primary App UI or runtime surface** when that surface can change independently of the reviewed submission. Iframes are fine **for authentication flows**.

Ship-clean rules:

- **Production builds only.** Dev builds embed `eval()` and framework error-decoder URLs (e.g. reactjs.org/react.dev links) that scanners read as prohibited execution or unexplained external connections — even when that code never runs. Minify/bundle for production and strip dev tooling.
- **Declare your dependencies.** Know and be able to name the third-party libraries in your bundle; flags that trace to a well-known library resolve fast when you can point to the source.
- **No dead external connections.** Remove hardcoded external URLs your code never actually calls — they read as undisclosed data egress.

## Credential and authentication fields

Apps must **not read, collect, modify, transmit, or act on** password fields, login fields, or any fields used to enter authentication credentials in a user's Webflow site. Any App that inspects forms, DOM content, or user input must **exclude those fields** from collection and from rule actions.

Use official APIs for data, not DOM scraping. Need form option data (select/radio/checkbox)? Use the Forms API. Scraping the published DOM to reconstruct it is fragile and reads as reaching for ungranted data.

## Backend authorization

The Designer Extension runs on the user's machine, so nothing it sends can be trusted as an authorization decision. This is the part reviewers verify by calling your service.

**Identity.** `webflow.getIdToken()` returns a short-lived ID token (valid ~15 minutes — fetch it just in time rather than persisting it). Send it to your backend and **resolve it server-side** to get the authenticated user and site. That resolved identity is the only trustworthy identity you have.

**Authorization.** Resolve, then check ownership:

| Don't                                                            | Do                                                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Act on a `siteId` in the request body                            | Resolve the ID token, then confirm that installation/user is authorized for that site |
| Assume "only our extension calls this"                           | Assume any client can call it, with any values                                        |
| Rely on CORS to restrict callers                                 | Authenticate and authorize; CORS is defense-in-depth only                             |
| Return the third-party API key so the client can call the vendor | Proxy the call server-side; return status or a masked identifier                      |
| Keep session/user state in `localStorage`                        | Verify server-side on every privileged request                                        |

**Object-level authorization** is the specific control: an identity authorized for site A must not read or write site B. Test it explicitly with two tenants and dedicated test records, and make the failure non-enumerating — don't reveal whether the other record exists.

**Destinations.** If your app talks to a third-party host, resolve that host from a server-maintained registry, enforce HTTPS, and reject anything not on the list. A destination taken from free-form user input, combined with a credential header, is how keys end up somewhere you don't control.

**At rest.** Encrypt credentials, scope them per tenant, and keep decrypted values server-side for the duration of the call. Prefer short-lived, narrowly scoped tokens over long-lived reusable keys.

**Attribution.** Derive the acting user from authorized configuration. A single hardcoded owner identity across all tenants breaks auditability and usually indicates tenant isolation was never tested.

Reference: <https://developers.webflow.com/data/reference/scopes> · <https://developers.webflow.com/data/docs/working-with-custom-code> · <https://developers.webflow.com/apps/docs/marketplace-guidelines> · <https://developers.webflow.com/designer/reference/get-user-id-token>
