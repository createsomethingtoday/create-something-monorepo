# Agency visual story release

The commercial homepage leads with the approved original agent photography, short offer, real product/work evidence, official Select Partner badge, and existing $900/$2,500 plans. Native disclosures retain scope, cost, approval and ownership qualifications. The work library retains film deep links.

109 source-backed secondary routes have distinct original scene derivatives; the explicit map is `src/lib/data/agencyPreviewOriginalImages.ts`. Only the 109 mapped WebPs ship under `/images/agency-stories`. The archive and raw PNG studies are kept outside the deployable application. The official partner badge is unchanged.

`AgencyPageTreatment` applies the reviewed route presentation without preview controls or query parameters. Secondary-page enhancements are client-side; without JavaScript, existing source content and ordinary links remain readable. The homepage content and its native disclosures render on the server; motion has pause, reduced-motion and static alternatives. Concept illustrations are separate from actual delivery evidence.

Research is canonical on `.io`. `/experiments` retains its approved scene and links to the experiment and paper archives. 26 verified detail slugs redirect301 to exact `.io` pages; unknown slugs redirect302 to the archive. The allowlist is `src/lib/data/ioResearchLinks.ts`. No database or `.io` content writes are part of this release.

## Promotion and rollback

Use the normal PR checks and Agency Pages Deploy workflow on main. Do not deploy directly around its Ground release gate. Ground 0.5.3 is tagged at reviewed merge `7e341099606b7028d93500a05152b793ec753d1d`, including bounded graph retention and the intentional Node 22 security update. Production promotion still requires the normal workflow to verify the published five-platform artifacts, calibration and consumer receipts, npm metadata, and exact tag parity; a tag alone is not publication evidence. Rollback uses the prior successful Pages deployment; code rollback is a normal revert PR, not a forced main reset. Resource data is unchanged.

Linear evidence could not be recorded from this host: the configured wrapper requires LINEAR_API_KEY and no connected Linear tool was available. PR and workflow receipts retain release evidence meanwhile.
