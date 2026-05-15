# Webflow Template Checklist MCP Coverage Matrix

Date: 2026-03-02  
Scope: Coverage of the checklist items shared by the reviewer for current MCP-capable automation.

Legend:
- `Auto`: Can be validated deterministically now via MCP tooling.
- `Partial`: Some signal is available, but policy-complete validation still needs human review or deeper extraction.
- `Manual`: Not realistically automatable with current MCP data access.

Automation sources used for this historical matrix:
- Published-site checks: `window.__wfReview` tools (`audit_webflow_way`, `audit_meta`, `audit_headings`, `audit_links`, `audit_images`, `audit_forms`, `audit_media`, `audit_404`, `audit_ix2`, `audit_ix3`, `get_sitemap_urls`).
- Designer checks: retired analyzer extraction is no longer an active reviewer route. Treat Designer-only assertions as manual unless a current sandbox/manual inspection artifact supplies direct evidence.

## CMS and Ecommerce

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| CMS Structure | Use collection pages for repeatable/relational content | Partial | `extract_designer_metadata.cmsCollections` presence |
| CMS Structure | Each CMS page includes dynamic SEO metadata | Partial | Crawl CMS URLs + `audit_meta` per page |
| CMS Structure | Compress CMS media before upload (<4MB) | Partial | Media URL/file-size probes (not guaranteed for all assets) |
| CMS Naming | Collection names Title Case + proper singular/plural | Partial | `cmsCollections.name` naming heuristics |
| CMS Naming | Natural language singular/plural phrasing checks | Manual | Human language judgment |
| CMS Naming | Slugs short, singular, descriptive | Partial | URL slug linting from sitemap/pages |
| CMS Naming | Collection field names sentence case | Manual | Field schema not extracted today |
| CMS Naming | Collection fields include short description | Manual | Field help text not extracted today |
| CMS Naming | Collection slugs must be singular | Partial | Slug linting by regex/NLP heuristics |
| CMS Naming | Collection fields have clear help text | Manual | Field settings not extracted |
| CMS Structure | 3–7 items per collection with realistic content | Partial | Item counts auto; “realistic” content manual |
| CMS Structure | Dynamic pages fit template category | Manual | Semantic quality judgment |
| CMS Best Practices | Correct field type selection | Manual | Field schema/type history inaccessible |
| CMS Best Practices | Use reference/multi-reference for relationships | Manual | Field schema inaccessible |
| CMS Best Practices | Use option fields for fixed values | Manual | Field schema inaccessible |
| CMS Best Practices | Paginate large lists | Partial | DOM pagination signal check possible |
| CMS Best Practices | Essential fields marked required | Manual | Field config inaccessible |
| CMS Best Practices | Conditional visibility used correctly | Manual | Field config inaccessible |
| Ecommerce Structure | No business address/ecommerce setup configured | Manual | Ecommerce settings panel inaccessible |
| Ecommerce Setup Guide | Keep setup steps unchecked | Manual | Ecommerce setup state inaccessible |
| Ecommerce Business Address | Business address not added | Manual | Ecommerce settings inaccessible |
| Ecommerce Design | No preloaders on required ecommerce pages | Partial | Page DOM/preloader checks possible |
| Ecommerce Cart | Cart visible on each page | Partial | Cart link/button presence crawl |
| Ecommerce Cart | Cart has standard elements + functional | Partial | DOM elements detectable; behavior partially testable |
| Ecommerce Cart | Payment method options present | Partial | Checkout button/PayPal/Web Payments presence |
| Ecommerce Checkout | Checkout page includes form/items/summary | Partial | DOM structure checks |
| Ecommerce Checkout PayPal | Includes PayPal form/items/summary + style consistency | Partial | Form/items/summary detectable; style consistency manual |
| Ecommerce Order Confirmation | Includes confirmation element | Partial | DOM marker checks |
| Product Template | Add-to-cart, description, image present | Partial | DOM checks |
| Category Template | Category list + links to products | Partial | DOM/link checks |
| Product Management | Product/category naming quality | Partial | Naming linting only |
| Product Management | Sufficient dummy products/categories | Partial | Count checks |
| Product Management | Variants included when appropriate | Partial | Variant presence detectable; appropriateness manual |

## Custom Code and Site Settings

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| Custom Code | No custom code except approved cases | Partial | Script/style tag and external library detection; not full project settings coverage |
| Custom Code | Font smoothing only allowed project code | Partial | CSS snippet detection possible |
| Custom Code | No-index on Licenses/Changelog only | Partial | Per-page robots tag checks |
| Custom Code | SVG usage requires Instructions page | Partial | SVG presence + instructions page presence |
| Site Settings | Custom favicon and webclip included | Partial | Favicon/webclip link presence |
| Site Settings | Responsive images enabled | Partial | `srcset/sizes` usage heuristic |
| Site Settings | Form notifications empty | Manual | Project setting inaccessible |
| Site Settings | Only Google/OFL fonts; no Typekit/custom paid | Partial | Loaded font source detection |
| Site Settings | Integrations default; no API token/3p integrations | Manual | Integrations settings inaccessible |
| Site Settings | Total site weight <10MB | Partial | Resource transfer estimate from crawled pages |
| Site Settings | CSS minified | Partial | CSS minification heuristics |
| Site Settings | Maps without API key | Partial | Map embed/API key string scans |

## Forms and Conversion Design

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| Conversion Design | Navigation clear and conversion path obvious | Manual | Strategic UX judgment |
| Conversion Design | CTAs in high-traffic, obvious locations | Partial | CTA count/placement heuristics |
| Conversion Design | Leading headlines support conversion narrative | Manual | Copy strategy judgment |
| Conversion Design | Social proof/objection handling/ease/results present | Partial | Section keyword/pattern detection |
| Forms | Success messages customized | Partial | Default success text detection |
| Forms | Input focus states customized | Partial | CSS focus-state presence checks |
| Forms | Form text/placeholders legible | Partial | Contrast/size heuristics |
| Forms | Meaningful form/field names in settings | Manual | Webflow form settings inaccessible |
| Forms | All forms include field labels | Auto | `audit_forms` |
| Forms | Correct field types (email not text, etc.) | Partial | Input type validation heuristics |

## Layout and Content

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| Layout | No empty links/buttons | Auto | `audit_links` + `audit_dom` |
| Layout | Repeating grid main image is clickable | Partial | Grid/image-to-link relationship checks |
| Layout | Consistent spacing; no clutter | Manual | Visual/system design judgment |
| Layout | Proper section/container structure + reusable components | Partial | DOM sectioning + Designer components |
| Layout | Use min-height over fixed height for sections | Partial | CSS style scan |
| Content | Content aligns with template category | Manual | Semantic judgment |
| Content | Content suitable for global audience | Manual | Policy/content moderation judgment |
| Responsive | Fluid responsive layouts across viewports | Partial | Multi-viewport snapshot/layout checks |
| Responsive | Use fluid units; prefer rem for typography | Partial | CSS unit linting |
| Responsive | Consistent unit types | Partial | CSS unit consistency linting |
| Responsive | Components function across breakpoints | Partial | Multi-viewport behavioral tests |
| Responsive | Responsive spacing system adapts by breakpoint | Partial | Multi-viewport spacing diffs |
| Rich Text | Rich text tag styles via selectors | Partial | CSS/DOM rich text style checks |
| Rich Text | Per-rich-text overrides via class-scoped tags | Partial | Selector pattern checks |

## Images, Assets, Logo

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| Images | High-quality, current visuals | Manual | Subjective quality judgment |
| Images | Compress to <=150KB where possible | Partial | URL/file-size probes |
| Images | Max file size 4MB | Partial | URL/file-size probes |
| Images | Use modern formats (WebP/AVIF/PNG/JPEG) | Auto | `audit_images.formats` |
| Images | Lazy-load below fold; eager only essentials | Auto | `audit_images` |
| Images | Responsive images enabled | Partial | `srcset/sizes` heuristics |
| Images | Videos compressed | Partial | Media-size heuristic |
| Images | Avoid autoplay videos without controls | Auto | `audit_media` |
| Licensed Assets | Resale-safe licensing for all assets | Manual | Legal/source provenance check |
| Licensed Assets | No premium/trademarked assets/logos | Manual | Legal/brand review |
| Logo | Nav logo matches template name and is image | Partial | Navbar logo image + naming heuristic |
| Logo | Logo quality/modern brand fit | Manual | Design judgment |

## Accessibility

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| Accessibility | Pass Core Web Vitals on desktop/mobile | Manual | External PageSpeed/CWV gating not integrated |
| Accessibility | One H1 + serial heading hierarchy | Auto | `audit_headings` |
| Accessibility | Follow Webflow accessibility checklist | Partial | Aggregated a11y heuristics only |
| Accessibility | WCAG contrast for default/hover/focus/active | Partial | Contrast tooling can be added; not full today |
| Accessibility | Semantic HTML + ARIA where needed | Partial | DOM role/label checks |
| Accessibility | Inclusive/plain language | Manual | Language quality judgment |
| Accessibility | Unique descriptive link labels | Partial | Link text uniqueness heuristics |
| Accessibility | Alt text for important; decorative marked correctly | Partial | Missing alt auto; decorative intent manual |
| Accessibility | Avoid autoplay media | Auto | `audit_media` |

## SEO

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| SEO | Homepage title matches template naming formula | Partial | `audit_meta.title` + provided template name |
| SEO | Footer includes "Powered by Webflow" link | Partial | Footer/link crawl |
| SEO | Main pages pass PageSpeed SEO score | Manual | External Lighthouse/PageSpeed gating not integrated |
| SEO | Each page has unique title/description/OG metadata | Partial | Per-page crawl + `audit_meta` |
| SEO | Custom branded 404 page with nav/CTAs | Partial | `audit_404` + page structure checks |
| SEO | Meta tags written naturally for users | Manual | Content quality judgment |
| SEO | Concise descriptive slugs | Partial | URL slug linting |
| SEO | OG tags valid; avoid unsupported formats | Partial | OG image format check |
| SEO | One H1 and correct heading hierarchy | Auto | `audit_headings` |

## Interactions and GSAP

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| Interactions | Use GSAP/new interactions; avoid legacy | Partial | Script/library + IX2/IX3 presence |
| Interactions | Links/buttons have hover states | Partial | CSS hover selector scan |
| Interactions | Sentence-case descriptive interaction naming | Manual | Interaction naming not extracted reliably |
| Interactions | Simple transitions for hover/press | Partial | CSS transition-property checks |
| Interactions | Pause/skip controls on background videos | Auto | `audit_media` |
| Interactions | Delete unused interactions | Partial | `audit_ix2`/`audit_ix3` signals |
| Interactions | Breakpoint spot checks (overflow/adaptation/font-size) | Partial | Multi-viewport visual checks |
| Interactions | Explicit image dimensions/aspect ratio to prevent CLS | Auto | `audit_images.missingDimensions` |
| Interactions | Animation performance property constraints | Partial | CSS/interaction-property linting |
| Interactions | Duration between 150–800ms | Partial | CSS duration linting |
| Interactions | Use Initial Appearance, avoid hidden hacks | Partial | Style/interaction rule scans |
| GSAP Docs | Instructions page includes GSAP edit guide content | Partial | Instructions page presence + content regex checks |
| Transitions | Apply transitions to specific properties, not all | Partial | CSS transition-property linting |
| Transitions | Consistent transition behavior | Partial | Transition token consistency check |
| Transitions | Transition every property changed on hover | Partial | CSS diff between base/hover states |

## Design Systems and Required Pages

| Section | Checklist Item | Coverage | MCP Signal |
|---|---|---|---|
| Components | Nav, Footer, CTA as reusable Components | Partial | `extract_designer_metadata.components` heuristics |
| Components | Component/variant names Title Case and readable | Partial | Naming linting |
| Components | Props/slots/variants used (no duplication) | Manual | Component architecture judgment |
| Components | Avoid nested sliders/tabs components | Partial | DOM nesting checks |
| Typography | No lorem ipsum/placeholder copy | Partial | Placeholder text detection |
| Typography | Percentage line-heights | Partial | CSS unit scan |
| Typography | No text crashing across devices | Partial | Multi-viewport overflow checks |
| Typography | Primary font on body, secondary by tags/classes | Partial | CSS cascade checks |
| Typography | Correct spelling/grammar | Partial | Automated grammar checks possible; editorial review needed |
| Variables | Reusable variables defined (color/type/spacing/brand) | Manual | Variables panel not extracted |
| Variables | Variable names in Title Case | Manual | Variables panel not extracted |
| Variables | Variable modes for breakpoints | Manual | Variables panel not extracted |
| Variables | Variable grouping/ramp ordering best practices | Manual | Variables panel not extracted |
| Styles | Baseline styles applied to required tags | Partial | Global class/tag-style heuristics |
| Styles | Override styles use separate classes | Manual | Style architecture judgment |
| Styles | Variables define baseline tag styles | Manual | Variables linkage not extracted |
| Styles | Combo classes <= 3-4 per element | Partial | DOM class-stack linting |
| Styles | Clean unused styles/classes | Partial | Designer style class inventory + usage heuristics |
| Styles | Hover/pressed/focus states styled | Partial | CSS state selector detection |
| Styles | Consistent grids/spacing from style guide | Manual | Design system judgment |
| Naming Conventions | One consistent class naming format | Partial | Class-name pattern consistency linting |
| Naming Conventions | Descriptive class names | Partial | Naming heuristics |
| Naming Conventions | Combo class max 3 levels | Partial | Combo-depth linting |
| Naming Conventions | Combo names match base format | Partial | Naming pattern linting |
| Naming Conventions | Avoid redundant styles | Manual | CSS intent judgment |
| Required Pages | Page names Title Case | Partial | `pages.name` linting |
| Required Pages | Page name matches slug | Partial | Names + sitemap slug matching |
| Required Pages | Required pages include noindex head code | Partial | Per-page robots meta checks |
| Required Pages | Style Guide page exists and includes all tags | Partial | Page existence auto; “all tags” partial |
| Required Pages | Instructions page exists when needed | Partial | Interaction complexity heuristics + page existence |
| Required Pages | License page exists with `/licenses` slug | Partial | Sitemap/page checks |
| Required Pages | Exact required license text at top | Auto | Page-content exact-match check |
| Required Pages | Footer links to Licenses on every page | Partial | Multi-page footer-link crawl |
| Required Pages | License info for custom fonts/assets with links | Partial | Content/link presence check; legal sufficiency manual |

## Coverage Totals (This Checklist)

- `Auto`: 13
- `Partial`: 105
- `Manual`: 32

Notes:
- `Partial` is high because many checks are detectable only as heuristic signals without full Designer/Admin panel state.
- Biggest current automation gap is the Variables panel + Admin/Settings internals + legal/content quality judgment.
