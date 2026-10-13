# MaverickX October 13 outline — Preview implementation

Scope: CRE-2262, Preview only. Implements Vanessa’s October 13 2:33 PM CT outline: https://createsomethingtoday.slack.com/archives/C0C7RN09GSH/p1791920024058159 and https://maverick-x-co.slack.com/docs/T06QFUTR14H/F0C8DBNHXFD.

This supersedes the earlier navigation-only increment described in OCTOBER-2026-REVIEW.md.

## Implemented

- Industries dropdown with Oil & Gas and Mining & Metals. Chose the later explicit “Fix” list’s Oil & Gas label; produced water remains under PetroX.
- Removed the complete homepage product/market card section, not only the product names. Retained the approved chemistry overview while replacement home content is pending.
- Standalone /technology and /mission-vision pages; core values remain within Mission & Vision. Existing approved copy is reused; new technical narrative, vision and values are clearly pending.
- Four-person leadership: Jesse Evans, Sanjay Jain, Rajat Sehgal and Matthew Rodriguez. Existing portraits retained; updated titles/bios pending. Removed Suman and Hayden from the presented roster.
- Oil & Gas: removed the complete PetroX family chart and Discuss Your Application action. Replaced the repeated secondary pumpjack media with an existing processing image. Preserved the produced-water redirect destination.
- Mining: removed Talk to Us and Metals of Interest boxes. Added an accessible, manually controlled five-image mineral carousel using existing assets, with previous/next, wraparound, position announcements and no automatic motion. Illustrative images do not imply validated mineral efficacy.
- Careers: How We Work and Open Roles structure, existing Lever destination and MaverickX LinkedIn jobs link. Final culture/core-values copy remains pending.
- News: explicit approved-story placeholder, general inquiry address only. Investor grid scaffold is marked pending; no names/logos or “leading” assertion without approval.
- Contact: retained form layout, area of interest and message; displayed only info@maverickx.com, including in News. Native area selector, associated validation errors, persistent success announcement and announced failure. Missing D1 now produces 503 instead of false success.

## HubSpot investigation and remaining dependency

- No HubSpot connector was available in this execution environment.
- Source, type declarations, Wrangler config and environment names contain no HubSpot configuration.
- Read-only Pages secret listing for maverick-x Preview returned no secrets.
- Downloaded existing Pages config into /tmp/maverick-preview-config-review using the existing gigi-release-20261010 profile and Create Something account. Variables include SITE_NAME; no HubSpot portal/form identifiers or integration variables were present.
- Existing form processing is D1 with optional Resend. Preview has no Resend secret; do not infer notification delivery from storage success.
- The preview visibly states HubSpot is not connected and asks reviewers not to submit test leads. No real lead or email was sent during QA.
- Required to complete HubSpot routing: the approved MaverickX portal/form destination, field mapping (including area of interest and message), and any existing authorized access needed for the chosen integration. No identifiers, credentials, permissions or CRM fields were invented.

## Polish and verification

Pass 1: inspected desktop and mobile screenshots of the new routes, leadership and mineral gallery. Kept shared type scale, whitespace, light content sections, aligned portraits, existing imagery and clear pending-copy blocks. Evidence: task-7/polish-pass-1.

Pass 2: tested keyboard/mobile dropdown behavior at 1440, 1101, 1024, 768, 390 and 320px; carousel keyboard controls/wraparound; reduced motion; form validation and intercepted failure states. Found and fixed loss of dialog focus when Submit becomes disabled: the announced result now receives focus, restoring keyboard dismissal after a request completes. Browser/contact checks never send real submissions. Evidence and command logs are retained in task-7.

Svelte check and production build pass. Three synthetic contact-routing tests pass. Formatting passes. The package has no lint script; the repo’s scoped lint runner explicitly reports this as allowed, not an actual lint pass. Safari and assistive-technology testing are not claimed.

The existing Linear CLI requires LINEAR_API_KEY, absent in this executor. A read attempt failed before any update. This report and deployment receipt preserve the evidence for parent handoff; Linear recording remains outstanding.

## Reference polish

Reviewed the assigned Slack reference list https://maverick-x-co.slack.com/lists/T06QFUTR14H/F0C8X21VC5Q read-only. Local browser visual inspection covered Mannheim careers (https://www.haematologie-labor.de/karriere), ICOMAT industries (https://www.icomat.co.uk/industries), NRG data centers (https://business.nrg.com/campaigns/build-your-data-center/), Otsuka (https://otsuka-air.jp/), and Alethia (https://www.alethia.earth/). CoMinVi technology (https://www.cominvi.com.mx/technology) was read for its numbered technical sequence; the mineral gallery at https://www.cominvi.com.mx/our-services was visually inspected.

Applied a quieter typographic Careers hero, indexed How We Work/Open Roles anchors and bordered job links, three numbered Technology chapters, and direct named mineral selection alongside the large isolated specimen image. These changes borrow hierarchy, pacing and interaction patterns using existing Maverick assets. No reference assets or unsupported claims were copied. Full animation behavior across reference sites is not claimed.

## Release boundary

Deploy only project maverick-x, branch preview. Production and the collaboration editor’s frozen baseline/provenance are untouched. Editor parity is not claimed. Record the final source SHA, deployment ID, immutable URL and live checks in the deployment receipt.

Rollback reference: prior source d1ed18ad2f6ea173b362c6e1105175a7efc72870, redeployed through the same Preview-only path if requested. No schema or data migration.

Worktree disposition: preserved at /Users/createsomething/Documents/Codex/2026-10-13/task-3/maverick-preview, branch codex/maverick-oct12-preview, retained until review. Parent owns the final Slack post; this executor has not posted.
