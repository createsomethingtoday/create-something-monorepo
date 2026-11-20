> Moved: the `validate` command now lives in `../../cli/` (`@create-something/webflow-template-validation-cli`, see `cli/README.md`). The notes below are the 2026-10-30 spike record; their run commands use the old paths.

# validate CLI (spike)

Runs the production validation worker's published-site checks and the GSAP crawl against a published `https://*.webflow.io` template. No login, no install. Node 20+ built-ins only. With `--designer-source mcp`, it also collects Designer data through the Webflow MCP server and runs the worker's Designer checks (see below).

Without `--designer-source mcp`, the run is an unauthenticated punch list and is not recorded, so the Marketplace submission form cannot use it. With `--designer-source mcp`, the CLI records the result with the worker and proves site access with the MCP OAuth token (see "Recording the result"). The form decides whether a recorded result satisfies its gate.

## Run

From `packages/webflow-template-validation`:

```sh
./worker/node_modules/.bin/tsx spike/cli/cli.ts validate https://rowalo.webflow.io
./worker/node_modules/.bin/tsx spike/cli/cli.ts validate https://rowalo.webflow.io --json
```

Flags: `--json`, `--checks assets,content,accessibility` (any subset), `--worker <base-url>` (default `https://validation-worker.createsomething.workers.dev`), `--timeout <seconds>` (default 480, same 8 minutes as the extension), `--designer-source mcp --site <siteId> [--page <pageId>] [--no-record]`.

Exit codes: `0` no blockers, `1` one or more blockers, `2` network or worker failure (also bad arguments). A blocker is any `error` issue or any issue with `details.policy` (for example `ix2-rejected`), the same rule as the extension's `isSubmissionBlockingIssue`.

## What runs

| Check | Runs here? | Notes |
| --- | --- | --- |
| Assets & Images | Yes | Multi-page strategy, up to 10 pages |
| Content & Accessibility | Yes | Every discovered page; `/style-guide` excluded like the extension default |
| Accessibility & WCAG | Yes | The worker drops this category when it has no surfaced issues |
| Interactions and GSAP (IX2 policy) | Yes, always | Homepage plus discovered slugs, max 25 pages |
| Custom Code & Site Settings | Yes, always | Homepage |
| GSAP crawl worker (form's crawl) | Yes, if reachable | Shown as its own row; not in the score. Reported as "unavailable" if the worker fails |
| Designer checks (variables, components, styles, pages, ...) | Only with `--designer-source mcp` | Without it the CLI never sends `designer` in `checks` |

The worker does not mark any category "unavailable" when Designer data is missing. Designer categories are simply absent from the result.

## How it talks to the worker

- `POST /app-validator/review/start` with `siteUrl`, `pageSlugs`, `designerData`, `checks`, `options`, `correlationId` (same shape as the extension's `runUnifiedValidation`). Requests carry no `Origin` header, which `isOriginAllowedForRequest` accepts.
- `designerData` is required by both `review/start` and `/validate` (400 if missing or falsy). The CLI sends a slug-only stub, `{ pages: [{ slug: "/" }, { slug: "/about" }, ...] }`. This passes the check and also switches the asset validator from homepage-only to multi-page. It has no Designer API data, and `designer` is not in `checks`, so no Designer validation runs.
- `options` mirror the extension's `getWorkerOptions` with every toggle at its default.
- Polls `GET /app-validator/review/:jobId/status` with backoff (1.5 s, x1.5, max 8 s) until `completed`, `failed`, or `cancelled`. It does not use the SSE `events` endpoint; polling alone is enough.
- On any async failure it falls back to `POST /validate`, the same as the extension. It turns the raw `analysis` into categories with the worker's own `mergeReviewResults` rules. If both fail, exit code 2.
- In parallel it calls the form's GSAP crawl worker (`POST /crawlWebsite` with `{ url, maxDepth: 10, maxPages: 1000, async: true }`, then polls with `{ url, instanceId }`). `gsapDetected` uses the form's rule: any page with `summary.validGsapCount > 0`. The worker accepted unauthenticated calls during testing (2026-10-30).

## Designer checks from MCP (`--designer-source mcp`)

```sh
./worker/node_modules/.bin/tsx spike/cli/cli.ts validate https://webflow-selection-box.webflow.io --designer-source mcp --site 5b1ad56c55bb9ebc8a1301f5
```

- Loads the OAuth token with `loadToken()` from `spike/mcp-client/login.ts` (refreshes it when expired; run `login.ts` once first). Tokens are never printed.
- Calls `collectDesignerData` (`spike/headless-collector/collect.ts`) through the shared `McpClient` (`spike/mcp-client/client.ts`). `--page` defaults to the first page from `list_pages`.
- Sends the collected `DesignerData` as `designerData` and prepends `designer` to `checks`, the same as the extension's `getSelectedChecks` (`['designer', 'assets', 'content', 'accessibility']`). The worker's `normalizeChecks` turns `designer` into `runDesigner`, and `runReviewJob` then calls `validateDesignerData` on the payload.
- Real `designerData` also replaces the slug-only stub for the asset validator (its pages come from `list_pages`).
- If the async review fails and the CLI falls back to `POST /validate`, the Designer categories are absent: `/validate` never runs them. The report says so.
- `--json` adds `summary.designerSource` with the site, page, raw counts, and collector notes.

## Recording the result (`--designer-source mcp`)

After a completed async run, the CLI records the result unless `--no-record` is set:

- Builds the submit body like the extension's `buildValidationSubmitPayload`: `siteId`, `siteName` (from `get_site`), `siteUrl`, and `validationResults` with `url`, `summary`, sanitized `categories`/`issues`, and `scope: { selectedChecks: <checks run>, pageScope: 'all', publishedChecks: 'full', pageSlugsCount }`. With default checks, `selectedChecks` is `['designer', 'assets', 'content', 'accessibility']`. The GSAP crawl row is not submitted (the extension does not submit it either).
- Adds `evidence: { type: 'oauth_site_access', accessToken }` from `loadToken()` and POSTs to `/app-validator/submit`. The worker calls Webflow's MCP server with that token (`get_site`) and accepts the evidence only when the returned site id equals `--site`. The worker stores a SHA-256 of the token, never the token.
- Reads `GET /app-validator/submission/latest?siteId=<siteId>` back and prints one line: `Record: status <status>, passed <bool>, evidence verified; correlationId <id>`, or `Record: failed (HTTP <code>): <error>`. With `--json` the same data is in `summary.record`.
- If the async review fell back to `POST /validate`, nothing is recorded: that path does not run the Designer checks.
- A failed record does not change the exit code; the exit code still reflects blockers.

The production worker ignores `evidence` until the worker change is deployed. Until then the line reads `evidence NOT recorded`. To test against a local worker:

```sh
pnpm --filter @create-something/webflow-template-validation-worker dev -- --port 8799 --ip 127.0.0.1
./worker/node_modules/.bin/tsx spike/cli/cli.ts validate https://webflow-selection-box.webflow.io --designer-source mcp --site 5b1ad56c55bb9ebc8a1301f5 --worker http://127.0.0.1:8799
```

Local run (2026-10-30, local `wrangler dev`, real MCP token, exit code 1 for blockers):

```text
  ... Recording the result with the worker (oauth_site_access evidence)
...
Score: 58% of worker categories passed (GSAP crawl not included in the score)
This run was recorded with the worker. The Marketplace submission form decides whether it satisfies the submission gate.
Record: status available, passed false, evidence verified; correlationId cli-record-3e1bd1f3-b261-4e90-aa84-0c96878678ed
```

`GET /app-validator/submission/latest?publishedUrl=https://webflow-selection-box.webflow.io/` on the same local worker then returned the record with `evidence.verified: true` and `publishedHosts: ["webflow-selection-box.webflow.io"]`. An unknown published URL returned 404 `status: "missing"`.

### Real run (2026-10-30, MCP source, exit code 1)

The site is tiny (1 page, 2 styles, 0 components), so most Designer findings are expected. Progress goes to stderr, the report to stdout:

```text
  ... Collecting Designer data via MCP for site 5b1ad56c55bb9ebc8a1301f5
  ... MCP get_site
  ... MCP list_pages offset 0
  ... MCP get_styles (with breakpoints)
  ... MCP get_variable_collections
  ... MCP get_variables Base collection
  ... MCP get_all_components
  ... MCP query_components (library, code flags)
  ... Collected 2 style(s), 1 page(s), 2 variable(s) in 1 collection(s), 0 component(s)
  ... MCP note: get_styles include_breakpoints [medium, small, tiny]: 2 style(s), 0 with a breakpoint override key, response 557 bytes
  ... Discovering pages on https://webflow-selection-box.webflow.io/
  ... Found 0 page(s) via none
  ... Job 5de8b42b-4b1a-4ce8-86f1-f6e4a7abd3cf started
  ... running 85% Merging validation result sets
  ... completed 100% Validation complete
  ... Waiting for GSAP crawl

Webflow template validation: https://webflow-selection-box.webflow.io/
Job: 5de8b42b-4b1a-4ce8-86f1-f6e4a7abd3cf  mode: async
Pages: homepage + 0 from none
Designer data: MCP, site "Webflow Selection Box" (5b1ad56c55bb9ebc8a1301f5), page 5b1ad56c55bb9e4db91301f6; 2 styles, 1 pages, 2 variables, 0 components
Checks: designer, assets, content, accessibility, interactions, custom code.

Categories
  PASS  Variables                            0 error(s), 2 warning(s)
  PASS  Variable Modes                       0 error(s), 0 warning(s)
  FAIL  Components                           1 error(s), 0 warning(s)
  FAIL  Styles                               1 error(s), 1 warning(s)
  FAIL  Required Pages                       4 error(s), 1 warning(s)
  PASS  Page Structure                       0 error(s), 0 warning(s)
  FAIL  SEO Metadata                         3 error(s), 0 warning(s)
  PASS  Assets                               0 error(s), 0 warning(s)
  PASS  Assets & Images                      0 error(s), 0 warning(s)
  FAIL  Content & Accessibility              2 error(s), 2 warning(s)
  PASS  Interactions and GSAP                0 error(s), 0 warning(s)
  PASS  Custom Code & Site Settings          0 error(s), 0 warning(s)
  PASS  Published-site crawl (GSAP worker)   0 error(s), 0 warning(s)  [1/1 pages, GSAP not detected, IX2 not detected]

Blockers (11)
  [Components] components.none: No components found. Templates should be built component-first.
      Fix: Create reusable components for shared elements like navigation, footer, CTAs.
  [Styles] styles.missing-typography: No typography classes detected. Templates need text styles.
      Fix: Create typography classes for headings, body text, captions.
  [Required Pages] required-pages.missing-style-guide: A Style Guide page published at exactly /style-guide is required for template submission.
      Fix: Create a Style Guide page at the root slug /style-guide with all HTML tags and typography.
  [Required Pages] required-pages.missing-license: A Licenses page published at exactly /licenses (plural) is required for template submission.
      Fix: Create a Licenses page at the root slug /licenses with licensing info for all custom assets.
  [Required Pages] required-pages.missing-changelog: A Changelog page published at exactly /changelog is required for template submission.
      Fix: Create a Changelog page at the root slug /changelog documenting template versions.
  [Required Pages] required-pages.missing-404: A custom 404 page is required for template submission.
      Fix: Create a custom branded 404 page with full navigation and CTAs.
  [SEO Metadata] seo.missing-title: 1 page(s) are missing an SEO title.
      Fix: Set a unique SEO title (30-60 characters) in each page's settings. CMS template pages should bind the title to a collection field.
  [SEO Metadata] seo.missing-description: 1 page(s) are missing a meta description.
      Fix: Set a unique meta description (150-160 characters) in each page's settings. CMS template pages should bind the description to a collection field.
  [SEO Metadata] seo.missing-og-image-home: The home page is missing an Open Graph image.
      Fix: Set an Open Graph image in the home page settings so shared links render a preview card.
  [Content & Accessibility] heading-hierarchy-errors: Heading hierarchy errors found on 1 page(s)
      Fix: Ensure each page has exactly one H1 element and use heading levels in sequential order (H1 → H2 → H3, etc.)
  [Content & Accessibility] missing-description-1822f3ff: "Home" is missing a meta description
      Fix: Add a compelling meta description (150-160 characters) that summarizes the page content

Warnings (6)
  [Variables] variables.organization: Variables should be organized into purposeful collections.
      Fix: Create separate collections for Colors, Spacing, Typography.
  [Variables] variables.ramps: Color variables should use ordered ramps (e.g., light-to-dark).
      Fix: Organize colors in sequences: Primary 100, Primary 200... Primary 900
  [Styles] styles.missing-html-baseline: HTML tags should have baseline styles (All H1 Tags, All Paragraphs).
      Fix: Style HTML tags directly first, then create semantic classes.
  [Required Pages] required-pages.missing-instructions: No Instructions page found at /instructions.
      Fix: An Instructions page at the root slug /instructions is required if the template uses advanced/hidden components, SVG embeds, or GSAP custom code. Add one if any of those apply.
  [Content & Accessibility] title-too-short-1822f3ff: "Home" title is too short (21 characters)
      Fix: Expand the title to include more descriptive keywords
  [Content & Accessibility] insufficient-content: 1 page(s) have very little content
      Fix: Add more meaningful content to provide value to users and improve SEO

Info (3)
  [Variable Modes] modes.good: 1 modes configured across 1 collections.
  [Page Structure] pages.minimal-structure: Consider adding more pages for a complete website structure.
  [Content & Accessibility] missing-opengraph-1822f3ff: "Home" has no Open Graph meta tags
      Fix: Add Open Graph title, description, and image meta tags

Score: 58% of worker categories passed (GSAP crawl not included in the score)
This run does not satisfy the Marketplace submission form gate. The form also needs Designer data and an identity (run the Template Validator app in the Designer).
```

This capture predates result recording. The closing note text has changed since; see "Recording the result" for the current output.

## Page discovery

The worker does not read the sitemap for ordinary pages. With empty `pageSlugs`, the IX2 check covers only the homepage and the content check follows at most 5 homepage links. So the CLI discovers pages itself and sends them as `pageSlugs`:

1. `/sitemap.xml` (and up to 5 nested sitemaps in a sitemap index), same host only.
2. If there is no sitemap (common on `*.webflow.io`; Rowalo's returns the 404 page), same-host `<a href>` links on the homepage.

Assets and anchors are skipped, and the list is capped at 50 slugs. CMS item pages are included when they are linked or listed.

## Real run (2026-10-30)

`./worker/node_modules/.bin/tsx spike/cli/cli.ts validate https://rowalo.webflow.io` (exit code 0). Progress goes to stderr, the report to stdout:

```text
  ... Discovering pages on https://rowalo.webflow.io/
  ... Found 19 page(s) via homepage-links
  ... Job 85028e4a-0496-4203-9525-847dc167f599 started
  ... running 55% Running crawl validation
  ... completed 100% Validation complete
  ... Waiting for GSAP crawl

Webflow template validation: https://rowalo.webflow.io/
Job: 85028e4a-0496-4203-9525-847dc167f599  mode: async
Pages: homepage + 19 from homepage-links
Checks: assets, content, accessibility, interactions, custom code. Not run: designer (needs Designer data).

Categories
  PASS  Assets & Images                      0 error(s), 0 warning(s)
  PASS  Content & Accessibility              0 error(s), 15 warning(s)
  PASS  Interactions and GSAP                0 error(s), 0 warning(s)
  PASS  Custom Code & Site Settings          0 error(s), 0 warning(s)
  PASS  Published-site crawl (GSAP worker)   0 error(s), 0 warning(s)  [32/32 pages, GSAP not detected, IX2 not detected]

Blockers (0)
  none

Warnings (15)
  [Content & Accessibility] description-too-short-2f38ccd3: "401" meta description is too short (129 characters)
      Fix: Expand the meta description to include more compelling details about the page
  [Content & Accessibility] description-too-short-1076221a: "About Us" meta description is too short (148 characters)
      Fix: Expand the meta description to include more compelling details about the page
  [Content & Accessibility] description-too-short-483504aa: "Blog" meta description is too short (146 characters)
      Fix: Expand the meta description to include more compelling details about the page
  [Content & Accessibility] title-too-long-61adc4c1: "Analyzing Consumer Trends To Drive Competitive Advantage" title is too long (96 characters)
      Fix: Shorten the title while maintaining descriptive keywords
  [Content & Accessibility] description-too-long-61adc4c1: "Analyzing Consumer Trends To Drive Competitive Advantage" meta description is too long (182 characters)
      Fix: Shorten the meta description while maintaining key information
  [Content & Accessibility] title-too-long-dba21ba: "How Strategic Branding Elevates Business Success New" title is too long (88 characters)
      Fix: Shorten the title while maintaining descriptive keywords
  [Content & Accessibility] description-too-long-dba21ba: "How Strategic Branding Elevates Business Success New" meta description is too long (182 characters)
      Fix: Shorten the meta description while maintaining key information
  [Content & Accessibility] description-too-short-15a5718d: "Contact Us" meta description is too short (147 characters)
      Fix: Expand the meta description to include more compelling details about the page
  [Content & Accessibility] description-too-short-143147a8: "Home 02" meta description is too short (132 characters)
      Fix: Expand the meta description to include more compelling details about the page
  [Content & Accessibility] description-too-short-5e560d53: "Instructions" meta description is too short (144 characters)
      Fix: Expand the meta description to include more compelling details about the page
  [Content & Accessibility] description-too-short-3fb6b242: "Pricing" meta description is too short (148 characters)
      Fix: Expand the meta description to include more compelling details about the page
  [Content & Accessibility] description-too-short-483e9c19: "Work" meta description is too short (135 characters)
      Fix: Expand the meta description to include more compelling details about the page
  [Content & Accessibility] description-too-long-2aaccd36: "Alex Travis" meta description is too long (182 characters)
      Fix: Shorten the meta description while maintaining key information
  [Content & Accessibility] description-too-long-2e75f816: "Liam Sullivan" meta description is too long (182 characters)
      Fix: Shorten the meta description while maintaining key information
  [Content & Accessibility] description-too-long-78557c74: "Mia Chen" meta description is too long (182 characters)
      Fix: Shorten the meta description while maintaining key information

Info (0)
  none

Score: 100% of worker categories passed (GSAP crawl not included in the score)
This run does not satisfy the Marketplace submission form gate. The form also needs Designer data and an identity (run the Template Validator app in the Designer).
```

With `--json`, the `summary` block confirmed coverage: Interactions `pagesRequested: 20, pagesAnalyzed: 20`, content `totalPages: 19` (style guide excluded), assets `totalAssets: 118`, GSAP crawl `32/32` pages.

## Open items

- The GSAP crawl worker discovers more pages (32) than homepage links (19). Using its `siteMap` output as `pageSlugs` would widen worker coverage, but the crawl would then have to finish before the review job starts.
- The worker keeps job state in isolate memory and in durable state (`getReviewJobState`). A status 404 mid-poll ends the async path and triggers the `/validate` fallback.
- Both workers are shared production infrastructure with no rate limiting for anonymous callers. Shipping this to creators needs a decision on that.
