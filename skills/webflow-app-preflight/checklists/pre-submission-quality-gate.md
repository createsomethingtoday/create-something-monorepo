# Pre-submission quality gate

Every item must pass before submitting. If one fails, fix it — a failed submission costs another 10–15 business days.

## Is it real?

- [ ] App runs end to end with no crashes on basic use.
- [ ] No placeholder content, lorem ipsum, or test data visible to end users.
- [ ] Backend services / APIs are live and will stay up through the whole review window.
- [ ] Demo access is ready: demo account, full demo mode, or credentials to required resources.
- [ ] Clear user-facing documentation and error handling exist.

## Is it safe and inspectable?

- [ ] Production build shipped — no `eval()`, no dev-mode bundle, no framework error-decoder URLs.
- [ ] No direct DOM manipulation of the Designer; Designer APIs used instead.
- [ ] No externally hosted iframes except for authentication.
- [ ] No excessive global variables.
- [ ] Third-party dependencies are known and nameable; no dead/unused external connection URLs.
- [ ] No credential fields (password/login) read from any published DOM.
- [ ] Data comes from official APIs (e.g. Forms API), not DOM scraping.
- [ ] Client Secret is server-side only — not in the bundle, client JS, or repo.
- [ ] Designer Extension source code is readable and uploaded through the version manager.

## Consent & lifecycle

- [ ] Requested scopes are the minimum the App actually calls.
- [ ] Install URL scopes are equal to or a subset of configured scopes.
- [ ] App stops calling the Data API immediately on revoke/uninstall.
- [ ] Code on customer sites is delivered via the Custom Code API, not manual paste.
- [ ] Injected scripts are version-pinned (hosted scripts use SRI `integrityHash`); no runtime loaders unless declared + pinned at submission.
- [ ] Any change to injected code ships as a new script version + App update — never edited in place.
- [ ] App retains the scopes needed to clean up (`custom_code:write` + `sites:write`/`pages:write`) and removes scripts at both site and page level on uninstall.

## Privacy & data handling

- [ ] Users are told clearly what data the App collects, where it's stored, and how it's used.
- [ ] A reachable privacy policy covers that disclosure.
- [ ] Appropriate security measures protect stored user data from unauthorized access.
- [ ] On uninstall, user data retained in *your own* backend is deleted or anonymized — not just the scripts removed from the site.
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
