# Required Pages Live Experiment

Generated: 2026-04-24T21:28:12.459Z
Reviewer lane: `https://wf-template-review-eric.mcp.createsomething.agency/mcp`

## Goal

Measure required-page detection on live template submissions selected from the Airtable-backed review queue, then compare the three evidence surfaces reviewers actually depend on: Airtable submission URLs, published-site discovery/crawl, and preview Designer extraction.

## Sampling

- Approved sample: 2
- Ready-for-review sample: 1
- Queue source: Airtable-backed `template_review_list_queue` via `webflow-template-review-mcp`
- Airtable parity check: direct REST fetch of each sampled asset record from `tblRwzpWoLgE9MrUm`

## Aggregate Findings

- Successful analyses: 3/3
- Style Guide: both=0, publishedOnly=3, designerOnly=0, neither=0
- Instructions: both=0, publishedOnly=2, designerOnly=0, neither=1
- Licenses: both=0, publishedOnly=3, designerOnly=0, neither=0
- Designer missed a published-required page: styleGuide=3, instructions=2, licenses=3
- Policy-triggered instructions cases: 3
- Policy-triggered with no detected instructions page anywhere: 1
- Live lane note: the current production lane did not return explicit `pages.style_guide_exists`, `pages.instructions_exists`, or `pages.licenses_exists` unified rows yet, so the conclusion here is based on raw required-page surfaces plus the live `policy.*instructions*` rows.
- Queue parity note: sampled asset URLs and marketplace status matched Airtable directly on all 3 assets, while `latestReviewStatus` diverged on all 3, consistent with the known live queue asset/version status drift.

## Recommendation

- Style Guide and Licenses should use published precheck/crawl as the primary evidence path, with Designer page names as fallback only.
- Instructions should use the blended signal: published precheck/crawl OR Designer page name variants, then apply policy-triggered escalation only when no instructions page is detected anywhere.
- Queue selection from the review MCP is good enough for experiment sampling, but direct Airtable parity checks are still useful to confirm URL/status truth on sampled assets.
- Tool-call timing was useful here as operator telemetry. It should stay in reports like this, not in the reviewer-facing MCP contract.

## Assets

### Grabin

- Sample bucket: approved
- Asset ID: `recv6YXol17CaFPiJ`
- Website URL: `https://grabin.webflow.io/`
- Preview URL: `https://preview.webflow.com/preview/grabin?utm_medium=preview_link&utm_source=designer&utm_content=grabin&preview=748fb922a390f99c8a4abb3466383e8b&workflow=preview`
- Queue status: `✅Approved` / marketplace `3️⃣Published🚀`
- Airtable parity: website=true, preview=true, status=false, marketplace=true

| Check | Designer | Precheck | Published crawl | Live unified row | Designer check |
|---|---:|---:|---:|---|---|
| Style Guide | false | true | true | null | fail |
| Instructions | false | true | true | null | pass |
| Licenses | false | true | true | null | fail |

- Policy flags: hasGsap=true, hasCustomCode=true, gsapRow=pass, customCodeRow=pass
- Designer pages: none
- Published utility pages: utility:style-guide:https://grabin.webflow.io/utility-pages/style-guide | utility:changelog:https://grabin.webflow.io/utility-pages/changelog | utility:license:https://grabin.webflow.io/utility-pages/licenses | utility:instructions:https://grabin.webflow.io/utility-pages/instructions
- Coverage: 44% (12/27)
- Timing: queue=33.219s, airtable=0.458s, enqueue=2.816s, wait=69.535s, total=72.810s

### Neura Nova

- Sample bucket: approved
- Asset ID: `rechpYnxoSUdu6g3t`
- Website URL: `https://neura-nova.webflow.io/`
- Preview URL: `https://preview.webflow.com/preview/neura-nova?utm_medium=preview_link&utm_source=designer&utm_content=neura-nova&preview=8b8c3ed5d3487f8c9b35978517cc26c4&locale=en&workflow=preview`
- Queue status: `✅Approved` / marketplace `3️⃣Published🚀`
- Airtable parity: website=true, preview=true, status=false, marketplace=true

| Check | Designer | Precheck | Published crawl | Live unified row | Designer check |
|---|---:|---:|---:|---|---|
| Style Guide | false | true | true | null | fail |
| Instructions | false | true | true | null | pass |
| Licenses | false | true | true | null | fail |

- Policy flags: hasGsap=true, hasCustomCode=true, gsapRow=pass, customCodeRow=pass
- Designer pages: none
- Published utility pages: utility:style-guide:https://neura-nova.webflow.io/template-info/style-guide | utility:license:https://neura-nova.webflow.io/template-info/licenses | utility:instructions:https://neura-nova.webflow.io/template-info/instruction | utility:license:https://neura-nova.webflow.io/terms-condition
- Coverage: 34% (12/35)
- Timing: queue=33.219s, airtable=0.387s, enqueue=2.884s, wait=51.670s, total=54.941s

### Athelas

- Sample bucket: ready_to_review
- Asset ID: `recVREafD2AIDU1dX`
- Website URL: `https://athelas-template.webflow.io/`
- Preview URL: `https://preview.webflow.com/preview/athelas-template?utm_medium=preview_link&utm_source=designer&utm_content=athelas-template&preview=d4ac345f3cd7a1e26a63a2adf91968cc&workflow=preview`
- Queue status: `🆕Ready for Review` / marketplace `1️⃣Upcoming🆕`
- Airtable parity: website=true, preview=true, status=false, marketplace=true

| Check | Designer | Precheck | Published crawl | Live unified row | Designer check |
|---|---:|---:|---:|---|---|
| Style Guide | false | true | true | null | fail |
| Instructions | false | false | false | null | pass |
| Licenses | false | true | true | null | fail |

- Policy flags: hasGsap=true, hasCustomCode=true, gsapRow=partial, customCodeRow=partial
- Designer pages: none
- Published utility pages: utility:style-guide:https://athelas-template.webflow.io/template/style-guide | utility:license:https://athelas-template.webflow.io/template/licenses | utility:changelog:https://athelas-template.webflow.io/template/changelog | utility:license:https://athelas-template.webflow.io/legal
- Coverage: 52% (12/23)
- Timing: queue=23.854s, airtable=0.322s, enqueue=2.999s, wait=89.193s, total=92.514s
