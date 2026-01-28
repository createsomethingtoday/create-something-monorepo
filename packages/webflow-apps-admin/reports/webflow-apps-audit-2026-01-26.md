# Webflow Apps Client ID Audit Report

**Generated:** January 26, 2026 at 19:37:32 UTC

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Apps Scanned** | 590 |
| **Apps Accessible** | 590 |
| **Unique Client IDs** | 572 |
| **Duplicate Client ID Groups** | 8 |
| **Apps with Duplicate IDs** | 26 |
| **Errors** | 0 |

### Key Finding

**8 groups of apps share duplicate Client IDs**, indicating potential configuration issues, legacy migrations, or apps that were cloned without updating credentials.

---

## 🚨 Duplicate Client IDs

The following apps share the same Client ID, which may cause authentication conflicts or unexpected behavior.

### 1. Jetboost Apps (2 apps)

**Client ID:** `ca3288fbd66ce2b44c86074d10abd66ad905677f714153bd8127483f442326ff`

| App Name | Slug | Workspace ID |
|----------|------|--------------|
| Jetboost Extensions | `jetboost-extensions` | `6310f776e067393e3a059c6f` |
| Jetboost | `jetboost` | `6310f776e067393e3a059c6f` |

**Analysis:** Same workspace — likely intentional for a product suite.

---

### 2. Designer API Playground (2 apps)

**Client ID:** `19511de1ec410f9228d8dcbc9420e67916dea80d86d18f0c9a533eb475ea0f62`

| App Name | Slug | Workspace ID |
|----------|------|--------------|
| [OLD] Designer API Playground | `my-amazing-webflow-app` | `625860a7a6c16d624927122f` |
| Designer API Playground | `designer-api-playground` | `625860a7a6c16d624927122f` |

**Analysis:** Same workspace — appears to be a legacy/new version pair.

---

### 3. Flowstar Form Connectors (2 apps)

**Client ID:** `30cf2d6e7e8cda57deaf25277e2dbd3ccf3266352f3293fb75884dd91afad12c`

| App Name | Slug | Workspace ID |
|----------|------|--------------|
| Flowstar: Form Connectors [ARCHIVED] | `flowstar-mailchimp-forms` | `6228ff14beec0e00fe2c6dd0` |
| Flowstar: Form Connectors | `flowstar-form-connectors` | `6228ff14beec0e00fe2c6dd0` |

**Analysis:** Same workspace — archived version not cleaned up.

---

### 4. ⚠️ Mixed Workspace Duplicates (11 apps)

**Client ID:** `bf25dd81aaeb3a926deb42e1a984f19d0e9483120b440c90724d2722cea7a3d8`

| App Name | Slug | Workspace ID |
|----------|------|--------------|
| old older Optibase - A/B testing for Webflows | `optibase---a-b-testing-for-webflows` | `633b3aa70148ed01998dd742` |
| Smartarget Whatsup Chat [ARCHIVED] | `smartarget-whatsapp-contact-us` | `642426c60c544e4a872365b6` |
| ScheduLinks [ARCHIVED] | `getflowtools` | `66ccbe9a6dfe6c3f06d6f428` |
| Velllum | `velllum` | `63114d85eaab907c83698883` |
| [ARCHIVED] Uploadcare | `uploadcare` | `66ccbe9a6dfe6c3f06d6f428` |
| [ARCHIVED] OneSync | `onesync` | `633b3aa70148ed01998dd742` |
| [ARCHIVED] Ultimo Bots | `ultimo-bots` | `682f6cdf81574b7a6f13b493` |
| ARCHIVED Accessibility Enable | `accessibility-enable` | `678f3166c03f31ca74e28ec9` |
| Signal Beam [Drafted] | `singal-beam` | `632dbe72fa6c9f001b1305ce` |
| [ARCHIVED] Concord Consent | `concord-consent` | `67ee5b1a43e807318c6fcc9b` |
| Shea Webflow Test | `shea-webflow-test` | `66ccbe9a6dfe6c3f06d6f428` |

**⚠️ CRITICAL:** This Client ID is shared across **8 different workspaces** — this appears to be a placeholder or test ID that was reused inappropriately. This is likely the **default/sample Client ID** from documentation or templates.

---

### 5. Wes Apps (3 apps)

**Client ID:** `93a7a5bafba42b0bb4a5b15af4257a0c8e0baba1ddcd9dba87a6b236cd0a6c67`

| App Name | Slug | Workspace ID |
|----------|------|--------------|
| [Legacy Private Listing] Wes | `wes-webflow-enterprise-solutions` | `6328b5c7302aa13380f83211` |
| [FAKE] https://edgarallan.com | `fake-https-edgarallan-com` | `6328b5c7302aa13380f83211` |
| Wes | `wes` | `6328b5c7302aa13380f83211` |

**Analysis:** Same workspace — appears to be test/development versions.

---

### 6. Quizell Apps (2 apps)

**Client ID:** `48810e175b797c07e27d979f5a1611db6d68bad4497a7efacbaafd57ca8ec929`

| App Name | Slug | Workspace ID |
|----------|------|--------------|
| old quizell - test | `test` | `65b39c23af9163997c1ac079` |
| Quizell Product Quiz | `quizell-product-quiz` | `65b39c23af9163997c1ac079` |

**Analysis:** Same workspace — test version not cleaned up.

---

### 7. Journalist AI Apps (2 apps)

**Client ID:** `cf129fda269e8fbe18de95df4098bdff0b6a607aeee6699e02f0826cde4c1b82`

| App Name | Slug | Workspace ID |
|----------|------|--------------|
| Journalist AI SEO Writer | `journalist-ai` | `65956fcc842d15ce08fb8e7b` |
| Journalist AI SEO Writer v1 | `journalist-ai-seo-writer` | `65956fcc842d15ce08fb8e7b` |

**Analysis:** Same workspace — version migration.

---

### 8. Bookmarks Pro Apps (2 apps)

**Client ID:** `8a349598d362f09be2ae960000ebfbf2ac627a92e07033ac111629cba80154ab`

| App Name | Slug | Workspace ID |
|----------|------|--------------|
| Bookmarks Pro | `bookmarks-pro` | `63b4dea41544cd0b70abee52` |
| Bookmarks Pro (archived) | `booksmarks` | `63b4dea41544cd0b70abee52` |

**Analysis:** Same workspace — archived version not cleaned up.

---

## Risk Assessment

### 🔴 High Risk

| Issue | Apps Affected | Recommended Action |
|-------|---------------|-------------------|
| Client ID shared across multiple workspaces | 11 apps (Group 4) | **Immediate investigation required** — this appears to be a default/test ID that should never be used in production |

### 🟡 Medium Risk

| Issue | Apps Affected | Recommended Action |
|-------|---------------|-------------------|
| Same workspace, multiple apps sharing ID | 15 apps (Groups 1,2,3,5,6,7,8) | Review if intentional; if not, regenerate Client IDs for archived/legacy versions |

### 🟢 Low Risk

| Issue | Apps Affected |
|-------|---------------|
| Unique Client IDs | 564 apps |

---

## Recommendations

1. **Investigate Group 4 immediately** — The Client ID `bf25dd81...` is shared across 8 different workspaces. This is almost certainly a copy-pasted test credential.

2. **Archive cleanup** — Apps marked `[ARCHIVED]` that share Client IDs with active apps should either:
   - Have their Client ID regenerated, or
   - Be fully deprecated/removed from the marketplace

3. **Implement Client ID uniqueness validation** — Consider adding a uniqueness check during app submission to prevent future duplicates.

4. **Developer notification** — Notify developers of Groups 1-8 about the shared credentials and provide guidance on regeneration.

---

## Appendix: All Apps by Client ID

<details>
<summary>Click to expand full list (590 apps)</summary>

### Sample of first 50 apps (alphabetically by name)

| # | App Name | Client ID (truncated) | Workspace ID |
|---|----------|----------------------|--------------|
| 1 | [ARCHIVED] HTML to Webflow | `22b298c0...` | `64d5e191...` |
| 2 | [ARCHIVED] OneSync | `bf25dd81...` ⚠️ | `633b3aa7...` |
| 3 | [ARCHIVED] Ultimo Bots | `bf25dd81...` ⚠️ | `682f6cdf...` |
| 4 | [ARCHIVED] Uploadcare | `bf25dd81...` ⚠️ | `66ccbe9a...` |
| 5 | [FAKE] https://edgarallan.com | `93a7a5ba...` | `6328b5c7...` |
| 6 | [Legacy Private Listing] Wes | `93a7a5ba...` | `6328b5c7...` |
| 7 | [OLD] Designer API Playground | `19511de1...` | `625860a7...` |
| 8 | accessiBe | `0cdfa0c7...` | `67b2011a...` |
| 9 | AirOps | `f9fdd786...` | `63914d99...` |
| 10 | ARCHIVED Accessibility Enable | `bf25dd81...` ⚠️ | `678f3166...` |
| 11 | Bookmarks Pro | `8a349598...` | `63b4dea4...` |
| 12 | Bookmarks Pro (archived) | `8a349598...` | `63b4dea4...` |
| 13 | Coming Soon | `211cadba...` | `6228ff14...` |
| 14 | Crowdin | `f632ee15...` | `63786c20...` |
| 15 | Data Goat | `7283ef78...` | `630f38bc...` |
| 16 | Designer API Playground | `19511de1...` | `625860a7...` |
| 17 | Docs Site App | `2ccc1b45...` | `625860a7...` |
| 18 | Figma to Webflow | `0c904de6...` | `63d85698...` |
| 19 | Finsweet Components | `2932d27a...` | `638f7017...` |
| 20 | Finsweet Extension | `6b05835a...` | `638f7017...` |
| 21 | Finsweet Table | `97eeb755...` | `638f7017...` |
| 22 | Flow Guys Toolkit | `9e86dc90...` | `631b0fc7...` |
| 23 | Flowstar: Contact Form Builder | `c5963001...` | `6228ff14...` |
| 24 | Flowstar: Form Builder | `fddb1d9b...` | `6228ff14...` |
| 25 | Flowstar: Form Connectors | `30cf2d6e...` | `6228ff14...` |
| 26 | Flowstar: Form Connectors [ARCHIVED] | `30cf2d6e...` | `6228ff14...` |
| 27 | Flowstar: GDPR Cookie Consent | `3c1e53bb...` | `6228ff14...` |
| 28 | Flowstar: Polls | `84be6fc5...` | `6228ff14...` |
| 29 | Flowstar: Store Locator Map | `c4181276...` | `6228ff14...` |
| 30 | Flowstar: Urgency Countdown Timer Bar | `2cfeb93f...` | `6228ff14...` |
| 31 | Frontify | `77e6c04d...` | `66d2464a...` |
| 32 | Google Ads for Webflow | `80ef4a2c...` | `63e42114...` |
| 33 | Google site tools for Webflow | `9f7ad27b...` | `66186389...` |
| 34 | Graphite | `de038598...` | `6332213f...` |
| 35 | Gumloop | `67f3d7e6...` | `67ca0826...` |
| 36 | HubSpot | `c076d53a...` | `646d501c...` |
| 37 | Jetboost | `ca3288fb...` | `6310f776...` |
| 38 | Jetboost Extensions | `ca3288fb...` | `6310f776...` |
| 39 | Journalist AI SEO Writer | `cf129fda...` | `65956fcc...` |
| 40 | Journalist AI SEO Writer v1 | `cf129fda...` | `65956fcc...` |
| 41 | LILT Connector | `8435ebe0...` | `681d31ed...` |
| 42 | LottieFiles for Webflow | `12c123c3...` | `637825ca...` |
| 43 | n8n Cloud | `7a70d745...` | `63881938...` |
| 44 | old older Optibase - A/B testing for Webflows | `bf25dd81...` ⚠️ | `633b3aa7...` |
| 45 | old quizell - test | `48810e17...` | `65b39c23...` |
| 46 | Quizell Product Quiz | `48810e17...` | `65b39c23...` |
| 47 | Relume Site Builder Import | `a6d9094f...` | `63cb6c77...` |
| 48 | ScheduLinks [ARCHIVED] | `bf25dd81...` ⚠️ | `66ccbe9a...` |
| 49 | Shea Webflow Test | `bf25dd81...` ⚠️ | `66ccbe9a...` |
| 50 | Signal Beam [Drafted] | `bf25dd81...` ⚠️ | `632dbe72...` |

*⚠️ = Part of problematic duplicate group*

</details>

---

## Methodology

This audit was performed using a browser console script that:

1. Loaded all apps from the Webflow Apps marketplace by clicking "Show more" until exhausted
2. Accessed each app's edit page (`/apps/detail/{slug}/edit`)
3. Extracted the `clientId` and `workspaceId` from the form inputs
4. Grouped apps by Client ID to identify duplicates
5. Generated a JSON report for further analysis

**Source data:** `webflow-apps-audit-2026-01-26.json`

---

*Report generated for Webflow Apps Marketplace audit*
