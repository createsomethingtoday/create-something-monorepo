# Dental OpenAI integration: public service page

CRE-2388 · 10 November 2026 · `/dental-ai-agents`

The page addresses dental practice owners and front-desk managers evaluating CREATE SOMETHING as an integration provider. It is not a patient acquisition page for the fictional practice. The primary action opens the existing first-party mapping-session scheduler with dental source attribution. No new analytics collector, consent exemption, model credential, or patient-data path is introduced.

Acceptance criteria: one crawlable vendor-service page; a direct answer, inspectable owned demo evidence and an accurate scope; four authored chapters with native keyboard/no-JavaScript explanations and FAQs; working native booking attribution, public search, sitemap and incoming links; accessible rendered layouts at 320, 390, 768, 1024, 1025 and 1440 pixels; finite GSAP gestures that honor motion and interruption controls; independent final output review; normal Agency production promotion and live verification.

## Context and evidence

Bounded CTX search recovered the November 8 evergreen `/openai-dots` decision (events `9aa53518` and `4801773f`): retain the Agency shell, add contextual links from Workflow Guides and Connected Tools, and keep the next step in the native scheduler. CTX was searchable with partial coverage (5,887 skipped records and no semantic search); an exact dental search found no additional history. Current Agency source and the current conversation establish the dental scope.

Lumen Dental is a fictional demonstration, with synthetic practice data, Responses function tools, explicitly confirmed booking writes, conflict/idempotency protection, visible tool receipts, and aggregate website/agent analytics. Following the visitor-access request on November 10, the public page links directly to the live demonstration. Sites access changed from owner-only custom access to public (revision 2), preserving editors, allowlists and secrets. Anonymous page and synthetic database access were independently verified.

`static/images/dental-agents/lumen-connected-desk-20261109.png` is an unaltered owned interface capture from `sites/lumen-dental/outputs/review-proof.png` (1241 × 876). It depicts synthetic bookings and a confirmation beside the database. It proves a demonstration interface; it is not evidence of a real clinic, production software compatibility, patient outcomes, revenue or time savings. The hero workflow and native four-step selector are explicitly illustrative. Canon uses the existing owned `canon-guide-cutout-v1.webp`. The social image is authored typography; the SVG is retained for reproduction.

## Interaction research and adaptation

Mobbin references were inspected as inline images on November 10. Static frames inform hierarchy and state, not animation timing.

- [Intercom: customer-service product explanation](https://mobbin.com/sites/sections/b0002f02-c5b8-4c25-8bed-aa1110fe8dd8): pair a conversation with the underlying action/status. Adapted as an owned demonstration capture followed by read/confirm/record explanation. Avoided exclusivity and performance claims.
- [Mailchimp: integrations](https://mobbin.com/sites/sections/9146e094-9a76-4d40-b6c2-8ec38c48608b): name what a connection enables. Adapted as supported sources, scheduler access and staff fallback, without implying every dental system is supported.
- [Zendesk: integrations](https://mobbin.com/sites/sections/800984a1-b232-4b15-af19-65a738437352): explain integration purpose in editorial text. No logo wall or compatibility claim.
- [Dovetail: capability selector](https://mobbin.com/sites/sections/793dbe49-efab-4f70-b666-6d20184a347e): use selection to explain a contextual artifact. Adapted as native radios that remain functional without JavaScript; no branded composition copied.

The approved baseline is the Agency Performance Lab system and current `/openai-dots` shell. Black/white measured surfaces, the existing ruler, owned Canon, finite GSAP gestures, native controls and one mapping-session destination retain that ownership.

## SEO and AEO decisions

- One self-canonical, indexable service URL is included in the existing search inventory and sitemap, with contextual incoming links. No duplicate dental practice microsite or thin location pages. [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- The direct answer and expanded FAQ text are server rendered. The existing SEO component emits WebPage, Service, CREATE SOMETHING Organization and breadcrumbs. FAQ copy and schema share one data source. No Dentist/LocalBusiness entity, fake reviews or ratings are assigned to fictional Lumen. [Structured-data accuracy policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
- FAQ content is useful to readers. Google retired FAQ rich results in May 2026; markup is not sold as a rich-result benefit. [Google Search updates](https://developers.google.com/search/updates).
- AEO uses readable, consistent, crawlable public answers and appropriate ordinary metadata. Google does not require special AI schema or an `llms.txt` file. Inclusion, ranking and AI citations are not guaranteed. [Google AI features guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- A chat agent does not make hidden chat answers indexable. Practice search content needs its own approved public pages. No Search Console/GA4 connection or search-performance baseline is claimed. Existing consent-aware Agency content attribution identifies this service page and mapping CTA; demonstration website and agent analytics are separate evidence of recorded activity, not SEO, clinical or commercial outcomes.

## Integration and information boundaries

The model requests a tool call; application code owns execution, permissions, confirmation and recovery. [OpenAI function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling). Before patient information is connected, scope data minimization, access, retention, eligible services/account settings and provider agreements. No default compliance or zero-retention claim follows from the demonstration or a single request setting. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Booking compatibility is assessed per supported API and account authority. A staff request is the fallback. Clinical questions and unsupported actions go to staff. Project-specific hosting, API usage and operation need a scoped budget; practice accounts/data/approval remain practice owned.

## Delivery and recovery

Implementation lives in the isolated CRE-2388 worktree. Preserve unrelated home-checkout work. Production uses the normal Agency branch/PR/review/merge/deploy path. Reverting the scoped commit removes the page, incoming links, metadata and inventory entry together; it does not alter the private Lumen demonstration or its credential. Validation, deployment and live receipts belong in Linear CRE-2388. Human acceptance is distinct from the technical release checks.

## Validation receipt before promotion

- Functional correctness: passed for the scoped page. Agency `pnpm check` completed with 354 passing tests and zero Svelte errors/warnings. The production build and the SSR acceptance script passed. The dedicated foundation set has 17 passing tests. The native CTA reached `/book` and the existing scheduler iframe with dental source/intent/lane intact; no real booking was submitted.
- Perceptual/product quality: passed. Parent directly viewed the actual page at 320, 390, 768, 1024, 1025 and 1440 pixels, including the proof and closing sections, keyboard focus, radio selection, native FAQs, search/menu interruption and motion-off cleanup. A script-blocked same-origin iframe retained native sequence selection and FAQ disclosure. Independent Sol 6.1 actual-output review found no blocking findings and separately exercised the page, mobile/desktop layouts, native behavior and booking handoff.
- Release readiness: local artifact passed scope/permission review; PR, merge, deployment and live verification are the remaining promotion gates. Private demo audience, secrets, production data and billing are unchanged.
- SEO limits: the dental route scores 100 and passes the technical SEO/AEO inventory check. The broader `seo:check` remains failed because unchanged `/contact` scores 72 and lacks its expected pillar link/terms. Three optional legacy `performance-page-sharpness.test.ts` expectations also fail; the same three failures were reproduced from the exact base `18a114a7a93e4255cdcdddcdd49eaf3999a6fd45` in a temporary read-only source snapshot. They concern the existing commercial cohort, Services destination and Control proof copy. They were not suppressed or rewritten.
- Ground: direct bounded route analysis completed with no duplicate/orphan findings. The repository advisory wrapper reported incomplete duplicate coverage and a route-orphan flag; current SvelteKit runtime, sitemap and incoming-link checks demonstrate the route is reachable. Advisory output is not treated as complete code coverage.

Production/live receipts and worktree disposition are recorded in Linear CRE-2388. Search indexing, AI citations, clinical integration and business outcomes require later independent evidence.

## Visitor-access follow-up

The user requested direct navigation from .agency into the dental website. Three native links now open Lumen from the opening section, captured interface and caption. The public FAQ and proof copy no longer describe owner-private access. A regression check failed before these links existed and passes after the change. Anonymous HTTP access changed from 401 to 200; the Sites policy readback confirms `public`, revision 2. An incognito live concierge request used `site.navigate` to move to the care section without sign-in. Existing synthetic-only booking validation, explicit confirmation, same-origin POST restriction and global daily AI budget remain in force; no secret, model, billing or application-source change was needed for the demo.

Follow-up rollback: restore Sites access mode `custom` (preserving its allowlists), revert the Agency follow-up commit through the normal PR/deployment workflow, and recheck the public page copy. Production receipts and independent final re-test are recorded in CRE-2388.

Follow-up local verification passed: Agency check355tests/zero Svelte diagnostics, 18 foundation tests, production build and SSR acceptance including anonymous demo/database reads. Parent incognito click-through and independent Sol 6.1 actual-output review verified all three same-tab links without login at desktop/mobile widths. No booking was submitted. Final Agency production receipt belongs in Linear.
