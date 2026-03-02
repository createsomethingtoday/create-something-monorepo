# Archipro Template Review Checklist

Generated: 2026-03-02T23:35:10.240Z
Preview URL: https://preview.webflow.com/preview/archiprotemplate-70629effe7faff236c7aca?utm_medium=preview_link&utm_source=dashboard&utm_content=archiprotemplate-70629effe7faff236c7aca&preview=896fb6bdfe0d546c91af69df27b5afe1&workflow=preview
Published URL: https://archiprotemplate-70629effe7faff236c7aca.webflow.io/

## Summary

- Express checklist: PASS 5, FAIL 10, PARTIAL 2, MANUAL 8
- Designer strict score: 8 pass / 8 fail / 7 manual
- Published crawl: 30 audited pages, 30 pages with at least one fail
- Snippet: v0.2.0 with 13 tools
- Sitemap: FAIL (Failed to fetch sitemap: 404 )

## Express Checklist Mapping

| ID | Requirement | Status | Source | Evidence |
|---|---|---|---|---|
| webflow_audit.h1_hierarchy | One H1 per page; no skipped heading levels | FAIL | published-webmcp-crawl | pagesWithHierarchyIssues=1 |
| webflow_audit.alt_text | No missing alt texts | FAIL | published-webmcp-crawl | pagesWithMissingAlt=29 |
| components.nav_footer_cta | Nav, Footer, and CTAs are Components | PASS | designer-mcp | components=59; hasNavOrHeader=true; hasFooter=true; hasCTA=true |
| components.title_case_names | Components use title casing in names | FAIL | designer-mcp | invalidCount=12; examples=Cards/Accordion V \| Cards/Blog Card V \| Cards/Portfolio Card V \| Cards/Service Card Three - V \| Cards/Testimonial V \| Tabs/Tab Accordion V \| CTA/CTA V \| Section/Background Image + Content V |
| interactions.unused_cleaned | Interactions are cleaned of unused animations | PARTIAL | published-webmcp + designer-mcp | ix2UnusedActionLists(home)=0; ix2MissingTargets(home)=1190; Designer check is currently manual for strict unused/deleted state. |
| variables.defined_reusable | Color, typography, and spacing variables are defined and reusable | MANUAL | designer-mcp | Variables panel data is not currently extracted by this MCP tool. |
| variables.title_case | Variables use Title Case, human-readable naming | MANUAL | designer-mcp | Variables panel data is not currently extracted by this MCP tool. |
| variables.breakpoint_modes | Variable Modes exist for tablet/mobile landscape/portrait | PASS | designer-mcp | breakpoints=Desktop: Base breakpoint \| Tablet: 991px and down \| Mobile (L): 767px and down \| Mobile: 479px and down \| Larger breakpoints; tablet=true; mobileLandscape=true; mobilePortrait=true |
| styles.unused_classes | Unused styles/classes are cleaned up | MANUAL | designer-mcp | Class usage graph is not currently extracted from Designer metadata. |
| styles.base_tag_styles | Base styles applied to HTML tags | PASS | designer-mcp | all required base tag selectors detected |
| styles.base_uses_variables | Variables used to define base tag styles | MANUAL | designer-mcp | Variable linkage is not exposed in current metadata payload. |
| styles.combo_depth | No more than 3-4 combo classes per element | MANUAL | designer-mcp | Element-level combo stack depth is not extracted in current metadata payload. |
| pages.home_seo_title_formula | Home SEO title matches required naming formula | FAIL | published-webmcp-crawl | homeTitle=Kingdom Construction \| Arlington and DFW Remodeling |
| pages.license_text_exact | License page contains exact required intro text | FAIL | designer-mcp + published-webmcp-crawl | Licenses page not detected in Designer extracted page list. |
| pages.image_loading_strategy | Below-the-fold lazy, essential above-fold eager | FAIL | published-webmcp-crawl | pagesWithAboveFoldLazy=28 |
| pages.videos_controls | No autoplay without controls and large videos have controls | FAIL | published-webmcp-crawl | autoplayWithoutControlsDetected=false; backgroundVideosMissingControlDetected=true |
| pages.meta_tags_static | Each static page has title, description and OG tags | FAIL | published-webmcp-crawl | pagesWithMissingMeta=26 |
| pages.meta_tags_cms_dynamic | CMS pages use dynamic SEO tags | PARTIAL | designer-mcp + published-webmcp-crawl | cmsCollectionsDetected=8; Dynamic field binding cannot be confirmed from current payloads. |
| pages.custom_404 | Custom branded 404 page with nav and CTAs | PASS | published-webmcp-crawl | status=404; navCount=2; linkCount=60 |
| pages.image_dimensions | Images have defined width/height | FAIL | published-webmcp-crawl | pagesWithMissingImageDimensions=29 |
| pages.transition_simple | Simple CSS transitions used for hover/press | MANUAL | published-webmcp-crawl | Transition-property linting not included in this run. |
| pages.wcag_contrast | WCAG color contrast met (default/hover/focus/active) | MANUAL | published-webmcp-crawl | Contrast calculation not included in this run. |
| pages.cms_used_relational | CMS used for repeatable/relational content | PASS | designer-mcp | cmsTemplatePages=8; cmsCollections=8 |
| assets.modern_formats | Modern image formats used (WebP, AVIF, JPEG, PNG) | FAIL | published-webmcp-crawl | detectedFormats=none |
| responsive.multi_breakpoint_check | Responsive check run on homepage + one additional page | MANUAL | published-webmcp-crawl | No multi-viewport screenshot diff run in this report. |

## Per-Page Fail List (Published Crawl)

- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/company-pages/about-legacy-20260214 (9): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:9, links_missing_accessible_name:2, links_placeholder_href:1, images_missing_dimensions:4, images_above_fold_lazy:3, forms_missing_labels:2, bg_video_missing_controls:1
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/ (8): meta_missing:og:image, skipped_heading_levels:1, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:8, images_above_fold_lazy:3, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/contact-pages/contact-v2-legacy-20260214 (8): meta_missing:og:image, images_missing_alt:6, blank_target_missing_rel:16, links_missing_accessible_name:2, images_missing_dimensions:5, images_above_fold_lazy:9, forms_missing_labels:4, bg_video_missing_controls:3
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/home-pages/home-v3-legacy-20260214 (8): meta_missing:og:image, images_missing_alt:8, blank_target_missing_rel:12, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:2, forms_missing_labels:4, bg_video_missing_controls:3
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/401 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:9, links_missing_accessible_name:3, images_missing_dimensions:5, images_above_fold_lazy:2, forms_missing_labels:3
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/404 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:5, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/archive-home-internal-do-not-use (7): meta_missing:og:title,og:description,og:image, images_missing_alt:5, blank_target_missing_rel:9, links_missing_accessible_name:12, images_missing_dimensions:14, images_above_fold_lazy:4, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/blog-pages/blog (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:2, forms_missing_labels:6
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/blog-pages/blog-v2-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:4, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/blog-pages/blog-v3-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:5, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:2, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/blog-posts/how-to-give-maintenance-to-your-wooden-furniture-the-full-guide (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:5, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/company-pages/team-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:9, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/contact-pages/contact (7): meta_missing:og:image, images_missing_alt:5, blank_target_missing_rel:9, links_missing_accessible_name:2, images_missing_dimensions:5, images_above_fold_lazy:4, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/contact-pages/contact-v3-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:5, blank_target_missing_rel:9, links_missing_accessible_name:2, images_missing_dimensions:5, images_above_fold_lazy:1, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/home-pages/home-v2-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:4, images_missing_dimensions:4, images_above_fold_lazy:5, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/landing-pages/book (7): meta_missing:og:image, images_missing_alt:5, blank_target_missing_rel:8, links_missing_accessible_name:3, images_missing_dimensions:7, images_above_fold_lazy:1, forms_missing_labels:5
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/landing-pages/coming-soon-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:3, images_missing_dimensions:6, images_above_fold_lazy:1, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/portfolio-pages/projects (7): meta_missing:og:image, images_missing_alt:8, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:3, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/portfolio/house-architecture-design-in-los-angeles-ca (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:5, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/service-pages/services (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:5, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/services/exterior-design (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:5, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/template-pages/changelog-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:1, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/template-pages/licenses-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:12, links_missing_accessible_name:2, images_missing_dimensions:4, images_above_fold_lazy:1, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/template-pages/start-here-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:4, blank_target_missing_rel:12, links_missing_accessible_name:2, images_missing_dimensions:16, images_above_fold_lazy:1, forms_missing_labels:2
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/template-pages/styles-components-legacy-20260214 (7): meta_missing:og:image, images_missing_alt:85, blank_target_missing_rel:8, links_missing_accessible_name:9, links_placeholder_href:20, images_missing_dimensions:20, forms_missing_labels:18
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/blog-posts/12-design-tricks-for-picking-the-perfect-home-color-palette (6): images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:5, images_above_fold_lazy:3, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/blog-posts/15-mind-blowing-floor-designs-to-make-your-home-look-great (6): images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:5, images_above_fold_lazy:3, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/blog-posts/25-color-trends-designers-cant-wait-to-see-in-2026 (6): images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:5, images_above_fold_lazy:3, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/blog-posts/clever-diy-home-improvements-you-can-easily-do-anytime (6): images_missing_alt:4, blank_target_missing_rel:8, links_missing_accessible_name:2, images_missing_dimensions:5, images_above_fold_lazy:3, forms_missing_labels:4
- https://archiprotemplate-70629effe7faff236c7aca.webflow.io/team/john-carter (2): meta_missing:og:image, missing_h1

## Output Files

- /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-site-analyzer-mcp/reports/archipro-review-checklist-2026-03-02.json
- /Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/webflow-site-analyzer-mcp/reports/archipro-review-checklist-2026-03-02.md