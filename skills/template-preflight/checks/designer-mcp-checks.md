# Build-Time Checks via the Webflow MCP

These checks run against the site **as it exists in the Designer**, using the official Webflow MCP (https://developers.webflow.com/mcp). They catch what published HTML can't show — class naming, variables, unused styles, form settings, CMS structure — while fixes are still one edit away.

## Setup

1. If the MCP exposes a guide/discovery tool (e.g. `webflow_guide_tool`, `get_more_tools`), call it **once** at session start to learn the current tool surface. Tool names below are indicative — match by capability, since names vary across MCP versions.
2. Resolve the site: list sites (`data_sites_tool` or equivalent) and confirm with the creator which site is the template.
3. Never publish, delete, or restructure without the creator's explicit ask. Preflight is read-and-report; fixes happen as separate, explicit edits.

## Check groups

Run in this order — later groups assume earlier ones passed.

### 1. Pages and slugs (capability: pages)

Pull the page list with names, slugs, and page-level SEO/custom-code settings.

| Check | Pass condition |
|-------|----------------|
| Required pages exist | Pages with slugs exactly `style-guide`, `licenses`, `changelog` (and `instructions` when required — see group 2) |
| Slug spelling | `licenses` plural; no nesting (not under a `/template/` folder) |
| Page naming | Title Case names; name matches slug |
| noindex on utility pages | `<meta name="robots" content="noindex">` in the required pages' custom head code — and on **no other page** (reviewers flag a noindexed FAQ or Services page as a defect) |
| 404 page | Custom branded 404 exists with nav + CTAs |
| Per-page SEO | Every page (incl. CMS templates): **unique** meta title < 60 chars; **unique** description that describes the page (150–160 chars recommended, not a blocker); OG title/description/image set (CMS template pages must bind an OG image field) |
| Homepage title format | Exactly `{Template Name} - Webflow HTML website template` or `... - Webflow Ecommerce website template` — lowercase "website template", spaced hyphen; "Webflow HTML Website Template" is flagged |
| Title consistency | Inner pages follow one pattern (`{Page} - {Template Name}`) with one separator; the template name is spelled/cased identically in every title, the listing name, the description, and the logo wordmark |

### 2. Custom code audit (capability: scripts / custom code / page settings)

Enumerate: site-level head/footer code, page-level head/footer code, registered/hosted scripts, and embed elements on every page.

Allowed — everything else is a **BLOCKER**:

1. GSAP custom code → requires the Instructions "How to Edit GSAP Animations" section (Element Map, Customizing Key Variables, Removing GSAP Animations)
2. Font smoothing CSS in project settings
3. `noindex` meta on required utility pages
4. Inline SVG embeds → requires an Instructions page documenting usage
5. Lenis smooth scrolling, including its initialization code

Distinguish: GSAP via Webflow's **native Interactions** (no custom `<script>` needed; assets served from `cdn.prod.website-files.com/gsap/...` on publish) is *not* custom code and triggers no Instructions requirement.

### 2b. Licenses page content (capability: pages / DOM)

| Check | Pass condition |
|-------|----------------|
| Boilerplate | The exact sentence *"All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below."* appears **once**, verbatim (no truncation, no rewording, closing period present), as the opening text |
| Per-asset entries | Every custom font, image source, and icon set listed with a source or license link |
| Reachability | Linked from the footer on every page (a "Legal"/"Privacy" footer without a Licenses link fails) |

### 3. Styles, classes, variables (capability: styles / variables)

| Check | Pass condition |
|-------|----------------|
| Tag-level base styles | Styles defined on All H1–H6, All Paragraphs, All Unordered Lists, All Ordered Lists, All Blockquotes, All Figures, All Figure Captions, All Links |
| Naming convention | One consistent format across all classes (or a declared framework: Client-First, Mast, Knockout, …) |
| No auto-generated names | Zero `Div Block N` / `Image N` / `Section N` style names |
| Combo class depth | ≤ 3 levels of combo classes; combo naming matches base-class format |
| Unused styles | Style list free of unreferenced classes (Designer's clean-up tool) |
| Variables exist | Groups for colors, typography, spacing (+ brand specifics); Title Case names; ordered ramps |
| Variable Modes | Responsive modes for tablet / mobile landscape / mobile portrait where values change — "define Variables + set up Variable Modes for breakpoints" is one of the most repeated review notes |

### 4. Components (capability: components)

| Check | Pass condition |
|-------|----------------|
| Required components | Navbar, Footer, CTA sections exist as Components and are instantiated on each page |
| Naming | Component + variant names in Title Case, concise, human-readable |
| Structure | Props/slots/variants used instead of duplicated near-identical structures; no same-type nesting (slider in slider, tabs in tabs) |

### 5. CMS (capability: cms / collections)

For each collection:

| Check | Pass condition |
|-------|----------------|
| Name | Title Case; natural in "This is a Collection of {plural}" / "Create a new {singular}" |
| Slug | Short, **singular**, descriptive (`article`, `project`, `member`) |
| Item count | 3–7 items with realistic dummy content matching the template category |
| Fields | Sentence-case names; help text present; essential fields required; option fields for fixed values; references for relationships |
| Collection pages | Dynamic SEO metadata bound; content/design fits the category; conditional visibility on optional fields |
| Media | CMS images < 4MB, compressed (AVIF/WebP via Webflow-native compression) |

### 6. Forms (capability: forms)

| Check | Pass condition |
|-------|----------------|
| Labels | Every input/select/textarea has an associated label or accessible name (unique id/for, enclosing label, valid aria-label or aria-labelledby); inspect visible field context for ARIA-only names. A label count is insufficient |
| Field types | Email fields typed `email`; phone `tel`; etc. |
| Names | Descriptive form and field names (they surface in notification emails) |
| Success/error | Success message customized to the design |
| Notifications | Form Notifications settings **empty** |
| Default artifacts | No Webflow default names (`Email Form`, `Field 2`, `field-3`), no default success text ("Thank you! Your submission has been received!"), no default error text, no "Example Text" placeholders; submit button gives visible feedback |

### 7. Interactions (capability: interactions, or via ask/AI tool)

| Check | Pass condition |
|-------|----------------|
| System | GSAP-powered Webflow Interactions (Marketplace default since May 1, 2026); no legacy interactions on new templates |
| Naming | Sentence case, descriptive ("Slide nav down on scroll") |
| Performance | Animates transform/opacity only; durations 150–800ms; Initial Appearance for visibility |
| Hygiene | Unused interactions deleted |
| Hover states | Links/buttons have hover feedback with transitions on the specific changing properties |

### 8. Site settings (capability: sites / settings / fonts)

| Check | Pass condition |
|-------|----------------|
| Favicon + webclip | Custom, theme-matched, present |
| Fonts | Google or free OFL fonts only — no Typekit/custom uploads |
| Integrations | All defaults; no API tokens; no Maps API key |
| Installed apps | Only apps the template needs (the Template Validator is fine); reviewers ask creators to remove unrelated connected apps |
| Favicon contrast | Favicon and webclip visible against both light and dark browser chrome |
| Images | Responsive images enabled |
| Performance | CSS minified; total site weight < 10MB |
| **Localization** | **Not enabled** — enabling it fails the submission |

### 9. Ecommerce (if applicable)

| Check | Pass condition |
|-------|----------------|
| **Business address** | **Absent.** It cannot be removed once set; a template with one is unfixable and will be rejected |
| Setup Guide | Business address, Shipping, Tax, Payment provider, Hosting, Checkout — all unchecked |
| Store settings | No currency/shipping/tax configuration |
| Required pages | Checkout, Checkout PayPal, Order confirmation per the checklist; no preloaders on Products/Categories/Checkout/Order confirmation |
| Products | 3–7 dummy products, consistent casing/spelling, variants where sensible |

### 10. Copy and content proofread (capability: pages / DOM text, CMS items)

Copy defects are a leading pattern in the supplied reviewer feedback; category ranks are qualitative, not measured frequencies. Pull the visible text of every static page and every CMS item and check:

| Check | Pass condition |
|-------|----------------|
| Spelling and grammar | No typos ("KEY MATRIC", "SCEDHULE"), no doubled words ("From daily for care tips"), consistent casing of the template/brand name |
| Complete sentences | No copy that stops mid-sentence or mid-word |
| Uniqueness | No identical excerpt/label/stat repeated across sibling cards or CMS items (three blog cards with the same excerpt and date; two stats both labelled "Projects Delivered") |
| Category fit | Copy matches the template's claimed vertical — no leftover text from another template ("furniture" copy in a hospitality template, "dental" line in a storage template) |
| No internal labels | No content-model labels in the copy ("Description: ...", "Title: ..."), no version tags in nav/pages/badges ("Home V1.1", "About V2"), no "Draft"/"WIP"/"TODO" |
| Real names only where allowed | Mockups, dashboards, and logo strips use invented brands — no Stripe/Slack/Segment/YouTube etc. inside artwork or as "integrations" |
| Listing copy | The submission description names only pages that exist, uses the template name identically, and contains no copy from another template |

### 11. Images (capability: assets / DOM)

| Check | Pass condition |
|-------|----------------|
| Dimensions | Every image has explicit width/height (or an aspect-ratio box) — "images should have defined width and height, sitewide" is a recurring note |
| Lazy loading | Below-the-fold images lazy-loaded; above-the-fold eager |
| Weight and sharpness | ≤ 150KB where possible, no pixelation/blur at 2x |

## Reporting

For each failed check emit one line: `group / check — page or element — what to change`, e.g.

```
pages/slug — "License" page — slug is `license`; the required slug is exactly `licenses` (plural). Rename the slug.
styles/naming — class `Div Block 27` on Home hero — auto-generated name; rename descriptively in your chosen convention.
cms/items — Collection "Projects" — 2 items; requirement is 3–7 with realistic dummy content.
```

Anything not exposed by the connected MCP version (e.g. interaction definitions, site weight) → mark `UNVERIFIED via MCP — check manually in the Designer` rather than guessing.
