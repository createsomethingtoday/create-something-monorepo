# Agency visual story release

The commercial homepage leads with the approved original agent photography, short offer, real product/work evidence, official Select Partner badge, and existing $900/$2,500 plans. Native disclosures retain scope, cost, approval and ownership qualifications. The work library retains film deep links.

109 source-backed secondary routes have distinct original scene derivatives; the explicit map is `src/lib/data/agencyPreviewOriginalImages.ts`. Only the 109 mapped WebPs ship under `/images/agency-stories`. The archive and raw PNG studies are kept outside the deployable application. The official partner badge is unchanged.

`AgencyPageTreatment` applies the reviewed route presentation without preview controls or query parameters. Secondary-page enhancements are client-side; without JavaScript, existing source content and ordinary links remain readable. The homepage content and its native disclosures render on the server; motion has pause, reduced-motion and static alternatives. Concept illustrations are separate from actual delivery evidence.

Research is canonical on `.io`. `/experiments` retains its approved scene and links to the experiment and paper archives. 26 verified detail slugs redirect301 to exact `.io` pages; unknown slugs redirect302 to the archive. The allowlist is `src/lib/data/ioResearchLinks.ts`. No database or `.io` content writes are part of this release.

## Promotion and rollback

Use the normal PR checks and Agency Pages Deploy workflow on main. Do not deploy directly around its Ground release gate. The current main baseline is `86b8ef50fb7d9e512d55037adf38b54b613abf13`; it contains an unreleased `packages/ground/action/action.yml` change relative to the matching Ground tag `73e856e2b8498ee964a6508909ac34df0e205385`. A matching Ground release is required before production Pages deployment can succeed. Rollback uses the prior successful Pages deployment; code rollback is a normal revert PR, not a forced main reset. Resource data is unchanged.

Linear evidence could not be recorded from this host: the configured wrapper requires LINEAR_API_KEY and no connected Linear tool was available. PR and workflow receipts retain release evidence meanwhile.
