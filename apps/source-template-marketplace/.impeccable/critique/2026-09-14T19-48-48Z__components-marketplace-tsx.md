---
target: components/Marketplace.tsx
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/Users/micahjohnson/Code/source-template-marketplace-review/apps/source-template-marketplace/components/Marketplace.tsx"
target_fingerprint: "sha256:93fd90572e7a8bc55c49766ef15ec9db253de8a7d81c5adf01eb48818d25ca28"
target_path: /Users/micahjohnson/Code/source-template-marketplace-review/apps/source-template-marketplace/components/Marketplace.tsx
timestamp: 2026-09-14T19-48-48Z
slug: components-marketplace-tsx
closed: true
---
Method: dual-agent (A: /root/design_review · B: /root/detector_review)

# Assessment A — independent design review

Target: components/Marketplace.tsx and its rendered home, browse, Fleet detail, and preview. Inspected at 1500×943 and 390×844 on http://127.0.0.1:4317. Ego TaskSpace 2, own page p2. No detector output read, no scans run, no app edits. PRODUCT.md, DESIGN.md, critique reference, and ego-browser skill read. No ignore file per parent.

## Design specificity verdict
The catalog feels specific to Webflow: authentic creator artwork, restrained white/black/blue chrome, creator attribution, Designer preview, and original listing sections all reinforce an actual template marketplace. This is a coherent refinement rather than an unrelated dashboard skin. Its weakest authored moment is the landing hero: the large universal promise and empty space postpone the distinctive thing being sold—the websites. Specificity lives in the catalog, not in the introduction. Preserve the visual language; improve how quickly it gets to product evidence.

## Nielsen scores
Higher is better. All ten apply to this discovery/evaluation product.

| # | Heuristic | Score | Evidence |
|---|---|---:|---|
| 1 | Visibility of system status | 2 | Loading/result counts exist; Free route still titled All website templates and displays an unchecked Free templates only control. |
| 2 | Match system/real world | 3 | Familiar prices, creators, categories and purchase language; Structure / Multi Layout require some Webflow knowledge. |
| 3 | User control and freedom | 3 | Clear controls, breadcrumbs and Escape-close preview; direct external-preview fallback is available. |
| 4 | Consistency and standards | 2 | Coherent components, but scope=free and free_only represent one user concept with divergent visible state. |
| 5 | Error prevention | 3 | Safe read-only discovery, explicit official purchase destination and license reminder; known blocked embeds still become default preview. |
| 6 | Recognition rather than recall | 3 | Visible taxonomy, artwork, creator and price; rich descriptions and section anchors aid evaluation. |
| 7 | Flexibility and efficiency | 3 | Search, filters, sorting, quick searches, creator navigation, previews and continuous discovery; mobile controls consume the first screen. |
| 8 | Aesthetic and minimalist design | 3 | Strong restraint and readable typography; above-fold spacing delays artwork and free filtering is duplicated. |
| 9 | Error recovery | 3 | Real blocked Fleet preview has an actionable new-tab link; description/catalog retry paths exist in source. Broken browser frame dominates recovery. |
| 10 | Help and documentation | 3 | Original license, support and FAQ appear with contextual section links. |
| Total | | 28/40 | Good foundation with focused usability debt. |

## Strengths
1. Artwork leads the desktop results and authentic creator names/prices remain directly beneath each card. The neutral frame lets genuinely different templates provide the visual variety.
2. Fleet detail restores substantial original prose, headings and lists, with separate license/support/FAQ navigation. This gives buyers enough evidence to evaluate a template without prematurely leaving discovery.
3. Purchase and preview actions are plainly named, with a clear one-time Webflow purchase explanation, price and sticky continuation. Preview uses a native dialog with Escape closure and focus restoration in source; the external fallback is an actual escape route.

## Priority issues
### P2 — Free browsing contradicts its own controls
Observed /templates/all?scope=free: Collection reads Free, Free templates only remains unchecked, h1 says All website templates, and both All templates and Free templates navigation are underlined. Actual result count is 168, versus 11,442 unfiltered. Source independently confirms checkbox reads only free_only while Collection reads scope.
Why: the user cannot confidently tell which switch controls the constraint or how to remove it. This is a state-model/UI consistency defect, not merely duplicate copy.
Fix: present one canonical free constraint. At minimum synchronize checked state and clearing across scope=free/free_only and make the current title/navigation truthful; preferably use Collection for curated scope and one free-price control. Preserve deep links by normalizing their meaning.
Suggested command: $impeccable clarify.

### P2 — The main preview opens a known-looking broken state before showing the escape route
Fleet Preview website opens a gray refused-connection frame. On 390×844, the broken frame occupies roughly 675px between a usable Close header and the recovery text at the bottom. Snapshot explicitly says fleet-template.webflow.io refused to connect. A real new-tab fallback exists, so this does not trap the user.
Why: this happens precisely when artwork has created interest; it looks like a faulty template or marketplace and forces another decision.
Fix: make Open live site a persistent, clearly styled action next to Close in the dialog header. For hosts/listings verified to deny embedding, route the primary preview directly to the live site (or show a deliberate fallback panel), preserving the external URL. Do not pretend iframe onload reliably detects cross-origin embedding failure.
Suggested command: $impeccable harden.

### P2 — Mobile spends nearly the entire first screen before allowing template evaluation
At 390×844, home category artwork starts around y=774; on browse, card artwork begins around y=684 and names/prices lie below the fold. Header, large page title/search and expanded four-select filters monopolize the opening screen. Desktop home similarly starts artwork around y=786.
Why: a visual-shopping product initially asks users to read the promise or configure a search before seeing enough evidence to know what they want. This blunts both exploratory browsing and the product's own specificity.
Fix: compress mobile hero/header vertical spacing and put secondary browse filters behind an accessible Filters disclosure with active count, leaving search, result count and sort visible. Preserve all filters and infinite scrolling. Target one complete card with name/price visible in the first mobile browse screen; expose real artwork earlier on home.
Suggested command: $impeccable adapt.

### P2 — Detail hero crops the template evidence excessively
Fleet's desktop detail thumbnail is expanded into a wide fixed-aspect image area. The screenshot is dominated by empty dark backdrop and the top portion of a laptop; the actual website is cut off at the bottom. Browse cards show considerably more of the same composition. Mobile detail repeats the cropped horizontal rendition.
Why: the largest product-evidence region presents less useful website information than its smaller catalog card, and users must open a potentially blocked preview to understand it.
Fix: retain the original image composition using object-fit:contain with a quiet backdrop and bounded maximum height, or choose a verified alternate image suited to the hero aspect. Do not stretch or automatically enlarge/crop a portrait promotional thumbnail into a landscape website screenshot.
Suggested command: $impeccable layout.

## Cognitive load
Passing: restrained visual hierarchy, plain primary action labels, progressive details/FAQ sections, domain-relevant grouping, and recognizable image/price/creator card pattern.
Failures: the hidden-work test (mobile artwork below almost all controls); inconsistent-pattern test (two free controls disagree); context-switch test (broken embed requires a second external action); simultaneous-demand test (four filter groups plus free checkbox above mobile discovery).
Decision points with >4 visible options: browse exposes four dropdowns plus checkbox, search and sort together (more after subcategory appears). The dropdown choices themselves are collapsed, so this is not a claim that every category is simultaneously visible. Fleet offer exposes buy, two preview modes and six taxonomy buttons; these are grouped meaningfully, but secondary taxonomy could be quieter during the purchase decision. Infinite results do not need artificial pagination to resolve load.

## Emotional journey
Entry is calm and credible but slow to become visually exciting. The artwork creates the first positive peak; original creator content sustains confidence. Fleet's refused preview is the largest observed emotional valley. The explicit price, license and official Webflow destination provide reassurance before leaving the app. Improve this journey by reaching artwork sooner and making the preview's successful external path immediate. No checkout claims were tested because purchases remain out of scope.

## Persona red flags
- Jordan, first-time buyer: enters Free templates, sees All website templates plus an unchecked Free templates only switch, and must infer that Collection owns the constraint. The conflicting controls weaken confidence before examining a template.
- Alex, frequent designer: wants to scan and preview several sites; the mobile filter block pushes card metadata below the initial viewport and Fleet's modal requires a second external-preview action. Existing search/sort/creator links are useful accelerators, so do not add new workspace/shortlist scope just to improve this score.
- Sam, mobile buyer: needs artwork and price together to decide whether to keep reading. Neither first mobile home nor browse viewport gives a complete purchasable card; the detail's small sticky offer is helpful once browsing reaches evaluation.

## Minor observations
- Copy listing link is successful-state only in source: clipboard failure silently returns to the unchanged label. Provide a small actionable failure message if copy fails; this was source-reviewed, not fault-injected.
- Original rich content uses readable heading/list hierarchy. Keep those original headings even when they repeat an Overview label; content fidelity is a stated requirement.
- The development-preview banner is appropriate for this review environment and is not a production branding defect.
- Mobile offer moves ahead of long-form content in final CSS, so purchase controls are not buried below the full description. Do not report the earlier stylesheet rules as final behavior.

## Questions for synthesis
- Can the first screen show a website worth choosing before asking visitors to configure the catalog?
- Should a preview promise always resolve to a working live site, even if that means leaving the embedded presentation?
- Can Free mean exactly one visible state regardless of the deep link used to enter?

Evidence images: /tmp/a-home-loaded.png, /tmp/a-browse-loaded.png, /tmp/a-detail.png, /tmp/a-detail-body.png, /tmp/a-home-mobile.png, /tmp/a-browse-mobile.png, /tmp/a-detail-mobile.png, /tmp/a-preview-mobile.png, /tmp/a-free-mobile.png. Own tab p2 retained for parent cleanup; no TaskSpace finished or changed beyond this tab. No detector findings accessed.

## Deterministic synthesis
48 advisory findings in components/TemplateCard.tsx:28 colors,18 font sizes,2 radii. Existing card contracts intentionally retained; advisory contract coverage is not proof of visual defects. Browser confirmed preview banner11px, FAQ measure around90characters and skipped Filters heading. Resolve these along with four P2 priority findings and clipboard failure feedback. No P0/P1 findings.

Questions skipped: user already authorized completing the recommended improvements.
