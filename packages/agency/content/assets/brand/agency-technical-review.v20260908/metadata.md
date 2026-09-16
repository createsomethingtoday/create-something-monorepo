# Technical review imagery

Asset ID: brand.agency-technical-review.v20260908
Owner: CREATE SOMETHING
Visual family: material-prototype-study
Target: /technical-review, /, /services
Created: 2026-09-08
Review status: selected after source and rendered desktop/mobile visual inspection; ready for normal production promotion under CRE-1970.

## Generation and source

Generated through the first-party OpenAI imagegen tool. The tool did not expose a model identifier or quality setting; neither is invented. Requested sizes: inspection and findings 1536x1024; mobile inspection 1024x1536. Exact prompts and written source model are under source/. The two initial images used authored prompts only. Mobile used inspection.png as its sole pixel reference. No third-party image, client data, likeness, mark, screenshot, font or layout was supplied.

The initial landscape images and portrait adaptation passed the material, meaning and no-text review. No rejected candidates. The inspection chain intentionally continues beyond the frame; the entire inspected part and immediate neighbors remain visible. Findings retain all three compartments. Captions identify concept art, and factual findings remain HTML.

## Files

| Role | File | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| Master | exports/findings.png | 1536 × 1024 | 2301705 | 667a654368f4d6358f10a50f5a58e77790a52280dcf620e21693d262cdb34d08 |
| Master | exports/inspection-mobile.png | 1024 × 1536 | 2312699 | 4a63a13194a98261e9a2203487ef839ae1f969f7e0c206978ed6fef441c292b4 |
| Master | exports/inspection.png | 1536 × 1024 | 2436467 | 5f345a66438ea481bd7434454ad3e7290a5c98d7d1d0d906783a83ae41e17dbd |
| Runtime | packages/agency/static/images/performance-lab/technical-review-findings.webp | Same as matching master | 121032 | d56a649d50c17aa1b2b7fafff30c92197ea39d7f4b86779ad405b8ac4cd25e66 |
| Runtime | packages/agency/static/images/performance-lab/technical-review-inspection-mobile.webp | Same as matching master | 128276 | 4bbcc098a731107e06124e2f6eab71bf90d47c4e6879cfc655029e4301bf68fe |
| Runtime | packages/agency/static/images/performance-lab/technical-review-inspection.webp | Same as matching master | 142422 | bf91186030cab3a1b266e97d97705c9026b542633b64484a161b81bd9612771e |

Runtime export: cwebp -q 84 -m 6; lossless original PNGs retained. Each runtime image is under 150 KB. Inspection mobile is separately recomposed, not cropped from landscape. Findings retain the complete landscape at all sizes. Explicit dimensions reserve layout space; only dedicated-route opening is eager/high priority, other images are lazy.

## Rights and refresh

Original CREATE SOMETHING-owned generated illustrations. No private transcript content or external reference pixels. These images are metaphors for scope and priorities, not client outcomes, product screenshots, or certification. Review due 2027-03-07, or when scope/offer changes or a rendered crop loses the inspection or a findings compartment.

Production evidence will be added after the normal PR deployment gate. Rollback: revert this scoped PR and redeploy Agency; scheduler unchanged.

## Validation checkpoint

Full Agency check, build, SEO (13 tests), prose and marketing image metadata checks passed. Browser at 1440x1000 and 390x844 loaded the correct desktop/portrait source and findings, with no horizontal overflow. Homepage and services entry images loaded. Reduced-motion browsing and keyboard CTA retained the technical-review booking intent. Evidence: /tmp/cre-1970-visual-proof.log and screenshot files /tmp/cre-1970-*.png. No booking was created.
