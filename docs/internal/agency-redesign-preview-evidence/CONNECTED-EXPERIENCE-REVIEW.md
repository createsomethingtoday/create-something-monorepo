# Agency connected-experience review — 2026-09-23

## Verdict

The preview is connected at the route and shared-navigation level. The redesign is not yet a unified buyer journey: capability discovery, engagement stages, product names and conversion pages use different organizational models. This review does not approve production promotion.

## Evidence and limits

- All 48 static public page routes returned HTTP 200 and one H1 in their server-rendered document.
- All checked local destinations discovered from the homepage returned HTTP 200.
- Browser inspected 12 desktop routes and 10 mobile routes, including homepage, Services, Products, Ground, Practice, Stack, field reports, booking, membership inquiry and legal pages. No horizontal overflow on sampled views; no missing same-page anchors on the desktop sample.
- Mobile menu opens and Escape closes it. Ground film query deep link opens the right dialog; Escape closes it and clears the query.
- Membership inquiry preserves membership intent and workflow lane. Contact controls inspected have labels. No inquiry submitted.
- Scheduler iframe refused to connect locally. The same URL visibly loads inside the live Agency booking page. Root cause not established; do not report this as a production scheduler outage. No booking made and no calendar mutation performed.
- Authenticated account operations, payments, scheduler completion, submission delivery, dynamic route records and external GitHub artifact accessibility are not verified by this review.
- Existing legal content and account shell preserved. No implementation changes in this audit.

## Prioritized findings

### 1. Capability discovery loses continuity at Products (high)

Homepage films use Websites, Forms, AI-native systems, Algorithms, Education, Video and Webflow. Explore calls /products “Services & tools” and BuiltWork calls it the “full tool catalog.” That destination instead leads with Map / Build / Control. These are engagement stages, not a catalog matching the entry label.

Recommended: make capability discovery the main Products collection, retaining Map / Build / Control as a clearly labeled explanation of how engagement works. Each capability should carry a concrete outcome, inspectable evidence, scope boundary and relevant inquiry link. Ground remains a detailed technical product page.

Sources: src/routes/+layout.svelte, src/lib/components/BuiltWork.svelte, src/routes/products/+page.svelte, src/lib/data/filmStories.ts.

### 2. Membership handoff asks people to choose again (high)

The membership link correctly selects membership, but Contact still presents four large path cards and later a second intent selector before completing the inquiry. The mobile entry screenshot contains the introduction and path cards, not the form. A known intent is unnecessarily reopened.

Recommended: for a known intent, lead with its concise terms and selected form. Put “Choose another way to start” behind a small disclosure. Preserve direct generic /contact discovery and all existing server validation and intent parameters.

Source: src/routes/contact/+page.svelte.

### 3. Page geometry does not match the new home (medium)

Homepage copy has a generous inset and balanced film column. Several campaign openings on Products, Services and Practice begin much closer to the viewport edge; booking switches to a dense black/green operational grid with large sans-serif heading and an extended explanatory panel. This is a visible change in hierarchy, not a broken layout.

Recommended: establish one public hero/content gutter, text measure and section rhythm. Keep task-specific booking UI, but shorten its introduction and use the shared editorial entry treatment before the scheduler. Do not restyle the scheduler's external implementation in this pass.

### 4. Footer varies and repeats discovery categories (medium)

Marketing pages show Work, Start, Services, Products, Tool Stack, Guide and Trust. Legal pages omit Work and Start because footer selection uses the marketing portfolio rather than the public-shell predicate. Several categories repeat destinations. This makes the system harder to scan after the simpler homepage.

Recommended: one public footer with Work, Working together, Resources and Legal/account destinations. Retain every required destination; distinguish workspace navigation from public navigation. Existing legal content stays unchanged.

Source: src/routes/+layout.svelte lines around footerQuickLinkGroups, filmFooterGroups and Footer quickLinkGroups.

### 5. Films still lead to uneven evidence destinations (medium)

Ground has a completed film and detailed product page. Six capabilities remain explicitly labeled storyboards, and several evidence links open source repositories instead of a buyer-facing explanation. This is truthful, but it is an incomplete discovery-to-evaluation journey.

Recommended: retain the honest storyboard labels. Add capability explanations that connect the film to examples and the $900 scope, with source links as supporting detail. Do not imply every capability has shipped footage or a fixed one-month deliverable.

### 6. Booking preview cannot prove embedded scheduling completion (verification gate)

Live embed visibly loads; local embed refuses. Preserve fallback external scheduler link. Before promotion, test booking on an allowed preview origin and verify no accidental submission, intent/context transfer, availability display and recovery. A completed booking requires separate authorized test data/action.

## Proposed next implementation sequence

1. Align Products with the seven capabilities and clarify engagement stages.
2. Streamline known-intent Contact into the relevant form.
3. Normalize public content gutters and booking entry hierarchy.
4. Consolidate the public footer while retaining all destinations.
5. Verify desktop/mobile navigation, direct URLs, focus, motion, intent preservation and scheduler handoff on an allowed preview origin.

Keep this as preview work. Preserve current scope/usage wording, legal text, account controls and submission behavior.

## Route inventory

| Route | HTTP | H1 count |
|---|---:|---:|
| / | 200 | 1 |
| /about | 200 | 1 |
| /agent-foundation | 200 | 1 |
| /agent-readiness | 200 | 1 |
| /ai-workflow-control | 200 | 1 |
| /ai-workflow-recovery | 200 | 1 |
| /arc/app-review-governance | 200 | 1 |
| /arcs | 200 | 1 |
| /basketball-systems-lab | 200 | 1 |
| /bearer-token-policy | 200 | 1 |
| /book | 200 | 1 |
| /cloudflare | 200 | 1 |
| /contact | 200 | 1 |
| /control | 200 | 1 |
| /dify | 200 | 1 |
| /dify/agent-eval-gates | 200 | 1 |
| /dify/mcp-control-plane | 200 | 1 |
| /dify/ship-dify-app-with-mcp-tools | 200 | 1 |
| /dify/template-marketplace-proof | 200 | 1 |
| /dispatch | 200 | 1 |
| /experiments | 200 | 1 |
| /field-reports | 200 | 1 |
| /field-reports/template-review | 200 | 1 |
| /field-reports/upstream-contributions | 200 | 1 |
| /for-service-providers | 200 | 1 |
| /map | 200 | 1 |
| /marketplace-review-automation | 200 | 1 |
| /methodology | 200 | 1 |
| /notion | 200 | 1 |
| /partners | 200 | 1 |
| /practice | 200 | 1 |
| /privacy | 200 | 1 |
| /products | 200 | 1 |
| /products/decision | 200 | 1 |
| /products/ground | 200 | 1 |
| /products/loom | 200 | 1 |
| /products/proof | 200 | 1 |
| /products/signal | 200 | 1 |
| /proof/marketplace-workflow | 200 | 1 |
| /security | 200 | 1 |
| /services | 200 | 1 |
| /stack | 200 | 1 |
| /technical-review | 200 | 1 |
| /terms | 200 | 1 |
| /use-cases/business | 200 | 1 |
| /use-cases/enterprise | 200 | 1 |
| /workflow-compiler-integration | 200 | 1 |
| /workflows | 200 | 1 |

Worktree disposition: preserved at /private/tmp/cre-2084-agent-worktree on codex/agency-redesign-preview. Preview http://127.0.0.1:4194/. Screenshots are /private/tmp/agency-audit-*.png and /private/tmp/agency-mobile-*.png.

## Implemented follow-up — 2026-09-23

Completed the first four recommendations in the working preview:
- Products leads with all seven capabilities, outcome/deliverable copy, film and evidence links, and membership inquiry. Map/Build/Control remains below as ways to work together.
- Known Contact intents show a compact heading/terms and the selected form. Alternative intents are in a keyboard-operable disclosure. Generic Contact retains discovery cards. Submission handlers and field validation unchanged.
- Public campaign opening content uses the homepage's 7vw gutter. Contact and booking use the same inset; booking introduction is shorter and editorial. Scheduler context/iframe/fallback retained.
- All public pages, including legal routes, share four footer groups; former destinations retained. Account/login shell remains unchanged.

Validation: Svelte zero errors/warnings, Canon checks pass, 68/68 copy checks pass, Vite production build pass, diff whitespace check pass. Updated obsolete layout/copy assertions to match the approved design while preserving scheduler context checks. Ego desktop/mobile inspection passed with no horizontal overflow on Products, Contact, Book, Privacy and Login; seven capability rows and footer parity confirmed; membership selection retained; disclosure opens/closes with Enter. No form submission or booking performed. Existing local iframe limitation remains. Screenshots /private/tmp/system-contact-final.png, /private/tmp/system-contact-mobile-final.png, /private/tmp/system-capabilities-mobile.png.

Worktree disposition: preserved at /private/tmp/cre-2084-agent-worktree on codex/agency-redesign-preview. Live site unchanged.
