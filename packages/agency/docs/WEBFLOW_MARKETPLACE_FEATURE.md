# Featured Webflow Marketplace study

Webflow replaces MaverickX in the homepage’s featured work chapter. The existing
Maverick and Cato examples remain in the work library. This change presents
Micah Johnson’s individual professional work for Webflow; it does not claim
that Webflow commissioned the work through CREATE SOMETHING.

## Acceptance and design

The homepage introduces one connected story with five chapter launch controls:
Prepare, Submit, Review, Manage and Discover. Its existing theater retains native
controls, caption guidance, Escape, pause, focus restoration and scroll recovery.
The complete study at `/case-studies/webflow-marketplace` leads to eight individual
studies. Existing pricing, navigation destinations and partner qualifications stay
intact. The retired `/work` family remains retired.

Agency owns the authored content and media (Database), playback and chapter
selection (Automation), and personal attribution and evidence boundaries
(Judgment). The work does not reposition Agency as a Webflow implementation shop.

The actual test portfolio excerpt leads the homepage, rather than a decorative
image or an unmeasured impact claim. Original recordings remain unchanged in the
source package. `content/assets/webflow-marketplace-portfolio/provenance.json`
records deployed-file candidates, source hashes, durations, capture scopes and
the still-frame crop. All ten MP4s match the finalized review-package hashes.
Visual-guidance VTT files describe the silent films; they are not narration.

## Context and reference decisions

CTX local history located the recent Agency composition review and proof-first
commercial direction (`cb49622e-b9d6-881a-9257-9a609b35e6dc`, event
`e147647d-d847-8266-bbd4-4fc47e64753a`). Current `origin/main`, the live homepage,
and the completed October30 Webflow review package carried implementation
and claim authority. Shared CTX could not be read after the tunnel restart because
Cloudflare Access needs renewed authentication; local history was usable and is
not an exhaustive record. Both requested tunnel listeners were restarted.

Three TASTE images were actually inspected on November2:

| Reference | Observation and decision | Originality boundary | Source |
| --- | --- | --- | --- |
| Charging interface, curated as Alex Burdin | Adapt the clear separation between the main object and supporting state. Keep the recording primary and evidence beside it. | Do not copy its neon fill, numeric scale or layout. | https://www.are.na/block/40249020 |
| Design Tools Survey screenshot | Adapt an ordered study index and strong chapter hierarchy for a long evidence story. | Do not copy its chart, navigation geometry or typography. | https://www.are.na/block/39660465 |
| Market item/detail screenshot | Adapt the separation of a visual object from facts about it. | Do not copy its circular controls, commerce flow or imagery. | https://www.are.na/block/36795688 |

These static images do not establish motion or interaction quality. Canon and
Agency’s existing campaign design govern the implementation.

## Evidence boundaries

Validator demonstrates setup and scope; Preflight demonstrates authorized
connected input paths. The template form is unsent, and the App form shows its
connection prerequisite. Review MCP uses actual handlers with synthetic clients.
Skills replay source and static evaluations. Dashboard is historical test footage.
Listings shows owned app search, and Apps shows public browsing. These are bounded
recordings, not complete production acceptance or business-impact measurements.

## Validation and release

- Functional: passed. Full Agency package check, Svelte diagnostics, production
  build, and the preserved `scripts/verify-webflow-feature.mjs` browser regression.
- Perceptual: passed for desktop and responsive page composition. Parent and
  independent Sol6.1 reviewed actual output at320/390/768/1024/1440px. Source text
  inside dense recordings requires desktop viewing.
- Independent review: passed. All5 chapter launches/seeks, natural ending,
 8 study routes, client Next navigation updating the video, keyboard/focus/scroll,
  no-JS and denied playback checked. Nested-main finding fixed and rechecked.
- Repository-wide Performance registry audit: new study routes are registered.
  The broader audit still reports five unrelated unregistered routes
  (Agency support-brief and four LMS routes). Those routes are unchanged here.
- Public release: blocked. Ground-v0.5.4 lacks5 consumer-smoke receipts and
  `CONSUMER-SHA256SUMS`, confirmed from current release assets. No bypass, Ground
  mutation, or production deployment is part of this change.
- Linear coordination: CLI could not create an issue because `LINEAR_API_KEY`
  was unavailable. This PR and review evidence preserve the handoff.

Browser evidence is in `/tmp/agency-webflow-review`, including independent
screenshots and `independent-checks.json`. The first UI pass caught and fixed
paper/dark-theme inheritance and nested main landmarks. The preserved browser
regression waits for hydration and completed client navigation before checking
state and media metadata.

Rollback: restore the prior homepage HTML, component, CSS/cache revisions and
layout policy; remove the new study routes, sitemap entries and media together.
No external product records or Webflow site content were changed.

Worktree disposition: preserved at `/tmp/agency-webflow-feature` on
`codex/agency-webflow-feature` until release review. The original dirty checkout
remains untouched.

## PR review follow-through

Rebased onto `50782fbed` after the homepage GSAP release. The merged page keeps
`enhanceHomeInteractions`, scene changes, directional marks, GSAP-owned styles
and cleanup alongside the five Webflow chapter launch controls. Both public cache
and stylesheet revisions identify the combined release.

The review finding was reproduced: the original SEO checker reported all eight
concrete study URLs as missing pages. It now resolves this family to `[study]`.
Three regression checks cover actual sitemap ownership, retained static/workflow
routing, and authored robots metadata. The last check also preserves the existing
private support-brief page’s static `noindex` directive. All nine Webflow routes
now have marketing-portfolio entries, including their dynamic source ownership.
The complete `seo:check`, including marketing validation, passes.

The feature browser regression passed again at five widths. The upstream GSAP
interaction verifier also passed at320/390/768/1024/1025/1440px plus touch input,
including intermediate animation, live reduced motion, keyboard control,
disclosure, and theater focus restoration. Evidence for this pass is in
`/tmp/agency-webflow-rebase-review`. Production remains blocked by the separate
Ground release evidence requirement.
