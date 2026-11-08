# OpenAI dots guide: local website integration

Status: implemented for parent review; no push, PR, merge, or deployment.
Tier: **Automation**, with **Judgment** explained through a review boundary.

## Acceptance and placement

Canonical route: `https://createsomething.agency/openai-dots`.
The route is an evergreen educational support guide in `workflow-library`, at
`understand`. It introduces personal dots through Canon, the user's personal
OpenAI dot. Canon Team is a separate system and supplies no evidence here.

The approved “A little more room” concept supplies the narrative, graphite
character assets, measured structure, and illustrative Gather / Make / Hand back
example. The local root prototype stays noindex and is not copied into public
`static/labs` here. No root-checkout file was changed.

A native SvelteKit route keeps the single shared Navigation and Footer. Existing
production `AgencyPageWayfinding` / `AgencyChapterDial` already support page
chapters, so this integration adds a foundation entry without altering home
behavior. It is the first SSR content after Navigation clearance. The route opts
out of `AgencyPageTreatment` so no hero, copy replacement, or extra closing trace
is injected. Route-owned ending policy suppresses the generic extra CTA.

There are five approved story beats: opening, possibilities, example, control,
and beginning. The direct answer belongs beside the possibilities; FAQs belong
beside control. This is one beat above the learning archetype's review budget;
retain the approved story for parent rendered judgment. Performance registration
remains `pending`, not visually accepted or migrated.

## Discoverability and funnel

Visible SSR links enter from `/workflows` and the OpenAI context in `/partners`.
The marketing portfolio and `searchRoutes.json` register indexability and sitemap
inclusion. Quick access supplies a single public search entry, classified as a
guide and searchable by OpenAI dots, Canon, and permissions. The direct answer is
also its search excerpt.

Canon's actual `SEO` component supplies title, description, canonical, OG,
FAQPage, and explicit Home / Workflow Guides / OpenAI dots breadcrumbs. FAQs and
schema use the same data. No additional machine files, special AEO schema,
ranking promises, customer outcome claims, or endorsement claims were added.

Hero action stays local: `#with-canon`. The closing action remains on Agency:
`/book?source=openai-dots&intent=workflow-mapping&lane=workflow_infrastructure`.
The booking parser and first-party scheduler preserve those bounded context
values. The href lives in `marketingCopy`. `/map` and `/services#membership`
provide lower-friction and offer context; OpenAI self-serve is secondary.
Route-specific content metadata flows through the existing consent-aware
PrivacyAnalytics wrapper. No new tracker or consent behavior was introduced.

## Progressive enhancement

The page uses house fonts, tokens, and existing intrinsic-size Canon images.
Route CSS is prefixed with `.openai-dots`. Native radios and CSS own selection;
native details own disclosures. Nothing waits hidden for GSAP. Package GSAP
3.15.0 is dynamically imported; no vendored scripts are copied. A failed import
retains the native interface. Finite gestures use scoped contexts and are
reverted on interruption, motion pause, visibility change, and route departure.
The same global film motion/navigation/overlay stores govern the guide. The
shared ruler is the only motion preference control.

## Research basis

This implementation ports the approved local concept rather than choosing a new
visual direction. Its README records prior inspected Mobbin evidence:

| Reference                                                                                | Adapt                                            | Avoid                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| [Customer.io](https://mobbin.com/sites/sections/7105d15a-5a4e-410c-8b8f-7230ea2698b1)    | Concrete benefit beside a changing task artifact | Layout, tone, palette             |
| [Intercom](https://mobbin.com/sites/sections/7b51d1f3-dcb3-4803-a67a-b10557822ba1)       | Explicit stages and selected state               | Metrics and dashboard composition |
| [Intercom / Fin](https://mobbin.com/sites/sections/3a04f598-5466-4c59-96c8-59e2d0efa86a) | Specific capabilities beside an example          | Unsupported outcome percentages   |
| [Ada](https://mobbin.com/sites/sections/1cab397d-d972-4422-b896-34ed3741cef1)            | Named stages connected to work                   | Product story and visual identity |

Those images were inspected during the concept work, not re-inspected by this
implementation pass. They establish no playback quality. Canon and the approved
local artifact remain authoritative.

Official source set, supplied as verified November 8, 2026:

- https://chatgpt.com/features/dots/
- https://openai.com/index/introducing-dots/
- https://help.openai.com/en/articles/20001530-getting-started-with-your-dot
- https://help.openai.com/en/articles/20001529-dots-privacy-security-and-safety-faqs

## Validation and remaining review

Prepared T3 worktree was clean, fetched and rebased to origin/main
`9dfd3069018c07cae80123469fcb86c632d0961a` before edits. Bootstrap ran with
`npm exec --yes pnpm@9.15.0 -- bootstrap:worktree`; it passed, with optional CLI
and missing generated workspace-bin warnings. No separate checkout was created.

Commands from the repo root unless noted:

- `npm exec --yes pnpm@9.15.0 -- --filter @create-something/agency build`: passed.
- `npm exec --yes pnpm@9.15.0 -- --filter @create-something/agency check`: passed,
  including Svelte check with zero errors and zero warnings.
- `node --import tsx --test packages/agency/test/openai-dots.test.ts packages/agency/test/agency-page-foundations.test.ts packages/agency/test/site-search.test.ts packages/agency/test/public-surface-policy.test.ts packages/agency/test/agency-performance-route-ending.test.ts`:
  34 passed. The new guide checks also join the existing
  `test:page-foundations` command, so Agency `check` retains them.
- From Agency, `node scripts/verify-openai-dots-ssr.mjs`: passed local HTTP
  readback for one canonical, indexability, direct answer, FAQ/schema parity,
  breadcrumbs, chapter anchors, native radio markup, funnel URL, inbound links,
  and sitemap inclusion. This is SSR evidence, not client interaction evidence.
- `npm exec --yes pnpm@9.15.0 -- --filter @create-something/agency seo:check`:
  SEO/AEO route checker passed (89 pages / 58 sitemap routes). New route scored 100. Marketing audit then failed on unchanged `/contact`: score 72, missing
  required routing/terms and backlink to `/book`. No unrelated fixes applied.
- From Agency, `node --import tsx --test test/performance-page-sharpness.test.ts`:
  2 passed / 3 failed. The same three failures reproduce against `origin/main`
  source loaded with `git show` (no baseline checkout): stale commercial cohort,
  Services missing source token `agencyCoreMessaging.selfMapHref`, and Control
  missing literal `Route the judgment`. No unrelated fixes applied.
- `git diff --check`: passed.

Logs are local `/tmp/openai-dots-{build,check,types-final,focused,seo,ssr,performance,baseline-performance,dev}.log`.
The dev runtime is `http://127.0.0.1:4198/openai-dots`.

Quality gates:

- Functional correctness: **passed for local source, package, build and SSR**.
  Native interaction, runtime import failure, and return navigation await browser
  review; tests above do not establish those behaviors.
- Perceptual/product quality: **untested** by this implementation agent. Parent
  owns the actual UI review at 320, 390, 768, 1024, 1025, 1440 (and useful wider
  widths), keyboard/hash focus, no-JS, reduced motion, interruption and resize.
- Release readiness: **untested for production**. Local deployable build exists;
  parent owns final integration, independent Sol review and promotion. No
  shipping authorization is inferred from the prototype.

Linear coordination is blocked: `node scripts/linear/remote.mjs ready` reports
`LINEAR_API_KEY is required.` No secret was requested or printed, and no shadow
queue was created. This document is implementation/review evidence only.

Rollback: revert this scoped integration, including route, route data/motion/CSS,
registrations, and two inbound links. Existing static images and root prototype
are outside the change. Worktree disposition: retained at
`/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-3919c772`
(branch `t3/integrate-openai-dots-guide`) until parent final review/release.
