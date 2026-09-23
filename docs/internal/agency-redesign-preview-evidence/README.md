# Agency redesign preview — CRE-2084

Completed 2026-09-23. Working preview only. No production promotion.

## Review

http://127.0.0.1:4194/

Retained source: `/private/tmp/cre-2084-agent-worktree`, branch `codex/agency-redesign-preview`, base `463706dc943c5859e6ec79060d957fe0aa2d8ce5`.

Restart the built preview:

```sh
cd /private/tmp/cre-2084-agent-worktree/packages/agency
pnpm preview --host 127.0.0.1 --port 4194
```

To rebuild after changes, stop the preview process, run `pnpm build` in the same package, then restart. Cloudflare's adapter needs access to its local runtime registry. Do not run a build alongside the dev server: generated output triggers HMR reloads and invalidates browser observations.

## Delivered

- Agency-owned hero, film collection and Ground player; existing Canon navigation, footer, privacy and search behavior retained.
- Typed film and hero registry in `packages/agency/src/lib/data/filmStories.ts`. Swap featured media, copy and destination there.
- Seven reachable film stories; direct URLs, previous/next, seeking, pause/play, Escape and focus return.
- Muted visible playback, offscreen pause, deliberate pause preservation, reduced-motion preference and user motion control. Mobile hero uses the original image for legibility.
- Public marketing navigation and footer capability links. Login/account shell excluded.
- Original BuiltWork listing and all eight learn-more links retained without rewriting its content. It is the final homepage section before the shared footer; #work and #built-work remain distinct.
- Existing membership, scope, client-specific AI usage, hosting and larger-project terms retained.

## Verification

Actual production build served in Ego TaskSpace18 on this Mac; anonymous visitor. Desktop 1440x1000 and 1498x985, mobile emulation 390x844.

Passed:
- `pnpm check`: zero Svelte errors/warnings; package gates passed.
- `pnpm copy:check`: 69/69 passed.
- `pnpm build`: Cloudflare adapter completed.
- `git diff --check`.
- Seven film viewers opened and sought to request/result chapters; six HTML compositions acknowledged time 18 and Ground video sought to 27.
- Real storyboard play/pause advances the composition. Escape restores the triggering tile's focus.
- Hero CTA, direct film URL, reload and services-footer-to-film navigation.
- Invalid film ID leaves the page usable with no open dialog.
- Ground autoplay while visible, pause offscreen, explicit pause retained after leaving/re-entering.
- OS reduced motion pauses videos and makes collection static.
- Mobile menu open/Escape/focus return; mobile film controls; no horizontal overflow.
- Membership anchor resolves to existing $900 offer and scope copy. Booking entry retains existing source/intent parameters and renders its scheduling handoff.
- Shared Cmd-K search opens. Login retains its original identity shell.
- One shared footer; all seven footer film links; original seven-entry listing is last in main.

Repairs from actual browser findings: fixed film numbering with ID lookup, same-page deep-link handling, and invisible hero transition copy intercepting the hero CTA. Rechecked against the final build. Earlier HMR/build-race and sandbox build failures are not acceptance evidence.

Screenshots and final command logs are alongside this file.

## Limits and ownership

Six films remain explicitly labeled animated storyboards. Ground is a rendered demonstration with an actual MCP result on synthetic files. The hero product interaction is illustrative. No claim of live execution or client release is added.

No authenticated account workflow, purchase, calendar booking, production deployment or merge was performed. Existing shared account code is unchanged; anonymous login rendering is the verified boundary. This is local browser acceptance, not production acceptance or user design approval.

Worktree disposition: preserved at `/private/tmp/cre-2084-agent-worktree` / `codex/agency-redesign-preview` for review. Rollback for the preview is to stop its local server; production is unchanged.

## Approved clarity pass — 2026-09-23

Supersedes the initial homepage structure above: hero → film collection → compact membership → five buying FAQs → BuiltWork → footer. Removed standalone Ground, project-review, meeting-note example, process, ownership, readback and closing conversion sections. Ground remains in the collection. Services retains the full membership FAQ and evidence readback; Stack retains ownership/provider details. Compact membership links both destinations and includes membership and mapping actions. Commercial boundaries are preserved.

Verified final built preview in Ego TaskSpace20: desktop and 390x844 mobile; no horizontal overflow; five FAQ disclosures; spending answer opens; seven listing entries; BuiltWork last in main; Ground film still opens; Services still exposes full portal/usage/support terms. pnpm check passed, copy checks 68/68, build passed, git diff --check passed. The test changes replace retired section-placement contracts with the approved structure and retained commercial/evidence boundaries. Production unchanged; same retained worktree and restart command.

## Hero request-to-review replacement — 2026-09-23

User approved replacing the intake URL correction with a broader connected-workflow story. New featured copy: “Your next step, already prepared.” CTA: “Explore what we can build” → #work. Original imagery retained. The 28-second HyperFrames loop follows a synthetic onboarding request, source checks, prepared drafts, explicit human approval, and a recorded checklist update. Missing kickoff stays unresolved; welcome email remains a draft. No live execution is claimed. Webflow remains a capability in the collection.

Editable composition and storyboard: `/Users/micahjohnson/.codex/visualizations/2026/09/23/01a0ce2d-d62f-7dd0-98fb-9f5686c088cc/agency-direction/hero-study/index.html` and `STORYBOARD.md`. Prior intake source saved as `evidence/intake-original.html.txt`; prior rendered film retained. Historical review.html still documents the original study.

HyperFrames upgraded 0.8.64 → 0.8.65; check passed (0 runtime/layout errors; reviewed transient exit-fade contrast warnings and monolithic-structure warnings). Render: 1920x1080, 30fps, 28 seconds, screenshot capture with hardware GPU. Delivered fast-start H.264 web encode: 3,947,430 bytes. Stable source/draft/approval/result snapshots inspected and encoded approval frame verified.

pnpm check and build passed. Browser TaskSpace22 verified actual new MP4 at 20.5s, copy, #work CTA, desktop composition and 390px mobile still treatment with no horizontal overflow. Production unchanged. Worktree retained at the same path/branch.

## Shared navigation integration — 2026-09-23

Public pages now share the floating navigation, including detail and policy pages. Account/admin/dashboard/identity/MCP-access/delivery and Map workspace/share/subscription routes retain their existing navigation controls. Image-led campaign openings extend to the top behind the navigation; text-led pages reserve 112px. Campaign copy has navigation clearance. Hash navigation decodes IDs safely and calculates clearance from the rendered nav, respecting reduced motion.

pnpm check and build passed sequentially (initial parallel runs raced while rebuilding the same Canon dependency; rerun serially). Ego TaskSpace23 verified Services, Products, Stack, template-review field report, Privacy and Login: headings below nav, image-led openings at y=0, no horizontal overflow. Desktop and 390px mobile membership navigation lands below nav; mobile menu closes. Homepage retains zero hero padding. Screenshots nav-services and nav-services-mobile. No production promotion; worktree preserved at the existing path/branch.

### Landscape discovery tiles — 2026-09-23

Changed film collection previews to larger 16:10 tiles. Iframes fit and center their full composition; Ground uses contain. Added a play indicator to each tile label. Retained scattered placement and full-film viewer. Mobile center tile moved up to preserve heading clearance. Dedicated preview-loop authoring remains a later film refinement.

Validation: pnpm check passed (zero Svelte errors/warnings); Vite production build passed after permitting local Wrangler registry access. Ego verified desktop 1498×985, mobile 390×844, no horizontal overflow, film open/close and reduced-motion grid. Mobile center label has 19.9px clearance from intro. Screenshots: /private/tmp/cre-2084-tiles-desktop.png and /private/tmp/cre-2084-tiles-mobile.png. Logs: /private/tmp/cre-2084-tiles-check.log and /private/tmp/cre-2084-tiles-build.log.

Preview only at http://127.0.0.1:4194/. Worktree disposition: preserved at /private/tmp/cre-2084-agent-worktree on codex/agency-redesign-preview. No production promotion.

### Separate hero film from background — 2026-09-23

Replaced the combined full-bleed video with original full-bleed imagery and a standalone HyperFrames product film in a separate grid column. Below 1100px the film stacks after the headline/CTA. Camera motion is contained within the film. Registry retains swappable video, product poster and background poster. Existing 28-second request/source/draft/approval/result story and illustrative labels retained.

Standalone source: agency-direction/hero-study/product-panel in the original visualization directory. Pin updated 0.8.65 → 0.8.66; HyperFrames check passed and render completed (760×780, 28 seconds, 1,574,748 bytes). Svelte check: zero errors/warnings; copy checks passed; Vite build and git diff --check passed. Ego verified 1280×1100, 1100×844, 900×844 and 390×844: no copy-film overlap or horizontal overflow; autoplay and reduced-motion pause verified. Screenshots /private/tmp/hero-separated-desktop.png and /private/tmp/hero-separated-mobile.png.

Preview only: http://127.0.0.1:4194/. Worktree disposition: preserved at /private/tmp/cre-2084-agent-worktree, codex/agency-redesign-preview. Production unchanged.

### Client proof and partner visibility — 2026-09-23

Added exact OpenAI Select Partner text/link near the hero using docs/OPENAI_PARTNER_READINESS_PACKET.md and the qualifications record. Added selected Webflow client work for Maverick X and Cato Healthcare Supply using public page captures. Linked existing Webflow review-system and independent CTX/OpenAI contribution reports; kept these relationships distinct.

Replaced Websites and Webflow illustrative compositions with 24-second HyperFrames camera studies of actual public page captures. These are animated screenshots, not session recordings; labels disclose this. Four other storyboards remain. Exported static/films/maverick-client-study.mp4 and cato-client-study.mp4 for review/sharing. Exact historical contribution scope beyond the user's attribution and documented evidence has not been expanded; no business-result metrics claimed.

Both HyperFrames checks passed; exports rendered on 0.8.66. Svelte check zero errors/warnings; 68 copy checks passed; build passed. Desktop/mobile browser inspection: partner link, client images, film opening/chapter seeking and no mobile overflow. Corrected a mid-reveal Maverick screenshot and inherited eyebrow color during review. Screenshots: /private/tmp/client-proof-desktop.png, client-proof-film.png, client-proof-mobile.png. Source compositions and capture assets are in static/films/websites and static/films/webflow.

Worktree disposition: preserved at /private/tmp/cre-2084-agent-worktree on codex/agency-redesign-preview. Preview only; no production promotion.

## Real client walkthroughs — September 23, 2026

Replaced the two still-image camera studies with browser recordings of public client pages. Ego Page.startScreencast captured real frames and timestamps; FFmpeg assembled a constant-30fps H.264 source; HyperFrames 0.8.66 rendered the editorial frame without cropping the 1440×900 capture. No synthetic cursor or fabricated application state was added.

- Maverick X: homepage, industry selection, PetroX page, Iron solution tab, contact modal. No form entry or submission. 24.17 seconds; rendered MP4 5.6 MB.
- Cato: homepage, recently sourced supplies, About Us menu, Solutions page and scroll. No authenticated service accessed or request submitted. 19.03 seconds.
- Editable compositions and source clips: `packages/agency/static/films/{websites,webflow}/`.
- Exported videos: `static/films/{maverick,cato}-client-study.mp4`; individual posters and descriptive VTT tracks. Film registry now supplies per-film poster, captions and chapter times.
- Capture scripts retained in `client-recordings/` as session evidence; their Ego task-space ID is historical, not a reusable production integration.
- Both HyperFrames checks passed; rendered contact sheets inspected. Svelte check: zero errors/warnings. Copy contracts: 68 passed.
- Preview-only. Worktree disposition: preserved at `/private/tmp/cre-2084-agent-worktree`, branch `codex/agency-redesign-preview`. Production unchanged.
- Vite production build passed. Desktop Maverick and mobile Cato playback verified in Ego; no document overflow. Screenshot evidence: `/private/tmp/client-record-desktop.png`, `/private/tmp/client-record-mobile.png`. Preview restarted at http://127.0.0.1:4194/.

## Insights Hub, Asset Dashboard and PCN correction

Cato attribution corrected to the Insights Hub and Webflow components per the operator. Re-recorded the public `/insights` flow: category filtering, Industry Research and an article. Replaced the unrelated homepage/Solutions recording, source link, thumbnail, title, proof copy and chapters. HyperFrames check passed; 16.9-second render inspected as a contact sheet.

Selected work now also names the Webflow Asset Dashboard (review status, Marketplace insights, asset edits) and PCN with implementation/product links. No invented dashboard footage was added. PCN `/library` was inspected signed out: no public sessions are available. Requested member access and a publicly shareable session; requested Asset Dashboard URL and approved demo assets. Authenticated films remain pending these inputs; PCN retains its explicitly labeled storyboard.

Worktree disposition: preserved at `/private/tmp/cre-2084-agent-worktree`, branch `codex/agency-redesign-preview`. Preview only; production unchanged.

## Asset Dashboard recorded walkthrough

Used the operator-provided, authenticated in-app Browser tab at `https://assetdashboard.webflow.io/`, containing the existing dashboard iframe. Recorded the test portfolio, Create Test submission timeline, its edit dialog, and Marketplace Insights. No fields changed; no save, archive, upload or submission action performed. Returned the user tab to Dashboard.

Browser CDP screencast frames assembled with FFmpeg at native proportions, then framed in HyperFrames. A four-second final-frame hold makes the insights readable. Source: `packages/agency/static/films/dashboard/`; exported film, poster and descriptive VTT are under `static/films/`. Featured-work card includes the playable demonstration and test-portfolio label. PCN member recording remains pending access.

Svelte checks: zero errors/warnings. Copy checks: 68 passed. Worktree disposition: preserved at `/private/tmp/cre-2084-agent-worktree`, branch `codex/agency-redesign-preview`; local preview only.

## PCN landing-page overview

Operator narrowed the PCN recording to its landing page. Captured the hero, local-only network preview (name entered: Field Notes), offering and publishing model in Ego. No network, account, lesson or payment was created. Replaced Education / PCN's illustrative storyboard with this explicitly labeled product overview; added its poster and watch link to Selected work. Source in `static/films/education/`; MP4 and descriptive captions in `static/films/`. This supersedes the earlier member-access gate for the requested demo.

## Outerfields prototype-to-funding story

Added an editorial project sequence to Selected work: prototype → $10,000 development budget → in-house development → lessons informing CREATE SOMETHING PCN. Funding and later ownership details are operator-provided in this conversation, not independently audited results. Copy identifies CREATE SOMETHING’s prototype/early-development role and warns against attributing all current-site work to us. Linked the current Outerfields site and our recorded PCN overview; no present-day Outerfields footage substituted for the original prototype.

Worktree disposition: preserved at `/private/tmp/cre-2084-agent-worktree`, branch `codex/agency-redesign-preview`. Preview only.
