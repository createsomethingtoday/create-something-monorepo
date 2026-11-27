# Hard Requirements — Creator Checklist

Source: https://webflow.com/templates/submission-guidelines (verify against the live page when in doubt — it changes).

To publish, a template must meet **all** of these AND score at least "Good" on every grading-rubric section. Each item below is binary: done or not done.

## Required pages

- [ ] Page names use Title Case and **match their slugs**.
- [ ] `/style-guide` exists at exactly that slug and shows **all** tags: H1–H6, paragraphs, links, buttons, unordered + ordered lists, blockquotes, figures + captions.
- [ ] `/licenses` exists at exactly that slug (**plural** — `/license` fails).
- [ ] `/licenses` opens with this exact text, **once**, verbatim with the closing period: *"All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below."* (Reviewers flag rewording, truncation, and the sentence appearing twice.)
- [ ] `/licenses` lists license info for every custom asset: each custom font with a license link; all images, icons, and other assets confirmed free for personal + commercial use with source/license links.
- [ ] `/changelog` exists.
- [ ] `/instructions` exists **if** the template uses advanced/complex interactions, hidden components, inline SVG code, or GSAP custom code — with brief guidance on how to access and edit them. GSAP custom code additionally requires the "How to Edit GSAP Animations" section (see Interactions below).
- [ ] The Licenses and Changelog pages have `<meta name="robots" content="noindex">` in Page settings → Custom code → Inside `<head>` tag (required). The Style Guide and Instructions pages do not need it. No content page has it (a noindexed FAQ or Services page is flagged).
- [ ] A custom, branded 404 page exists with the site navbar, the footer and CTAs.
- [ ] The footer on **every page** includes a visible link to the Licenses page.
- [ ] The footer includes **"Powered by Webflow" as a real link** to https://webflow.com (not plain text, not `href="#"`).

## Design systems

### Components
- [ ] Navbar, Footer, and CTAs are reusable **Components** used on every page.
- [ ] Component and variant names: Title Case, concise, human-readable.
- [ ] Buttons are a Component with variants, and those variants are used on every page (no hand-styled one-off buttons).
- [ ] Props/slots/style variants used instead of duplicated structures; no nested same-type components (e.g. slider inside slider).

### Typography
- [ ] No "lorem ipsum" — all copy is unique, relevant wording for the site type.
- [ ] Percentage-based line heights; text never crashes into itself at any breakpoint.
- [ ] Primary font set on the **Body** element; secondary fonts applied on tags/classes.
- [ ] Correct spelling and grammar throughout; no sentences cut off mid-way; no identical excerpts, labels, or stats repeated across sibling cards or CMS items.
- [ ] No internal labels shipped to visitors: no version tags in nav, page names, or badges ("Home V1.1"), no content-model prefixes left in copy ("Description: ..."), no copy from a different vertical.
- [ ] The template name is spelled and cased identically in the homepage title, every page title, the listing name, the listing description, and the logo wordmark.

### Variables
- [ ] Variables defined for colors (primary, secondary, background), typography (families, sizes, weights), spacing (margins, paddings), and brand specifics (radius, shadows).
- [ ] Variable names: Title Case, words separated by spaces; organized into purposeful groups; ramps ordered light→dark or small→large.
- [ ] Variable Modes used for responsive values (tablet, mobile landscape, mobile portrait).
- [ ] No one-off values promoted to Variables.
- [ ] Repeated static values (colors, font sizes, spacing, radius) are linked to Variables, not typed in per class.
- [ ] Variable names describe a role, not a value: `Spacing Large`, not `Gap32`.

### Styles and class naming
- [ ] Baseline styles applied at the **tag selector** level: All H1–H6, All Paragraphs, All Unordered Lists, All Ordered Lists, All Blockquotes, All Figures, All Figure Captions, All Links. Overrides live on separate classes.
- [ ] Variables used to set up the baseline tag styles.
- [ ] **One** consistent class naming format across the template (Default `Hero Container Element`, snake_case, PascalCase, camelCase, kebab-case, or BEM) — exception: a declared premade framework such as Client-First, Mast, or Knockout.
- [ ] Descriptive class names reflecting purpose; no auto-generated names (`Div Block 45`, `Image 4`).
- [ ] Combo classes max 3 levels (`section testimonials dark` ✅; `section testimonials dark customers horizontal` ❌), stacked combo classes ≤ 3–4 per element, combo naming matches the base class format.
- [ ] Unused styles and classes removed. Unused interactions removed.
- [ ] Hover, pressed, and focus states styled; no redundant styles.

## Interactions and GSAP

> Webflow Interactions powered by GSAP are the Marketplace default as of May 1, 2026. Prefer them; avoid legacy interactions.

- [ ] Links and buttons have hover states showing they're clickable.
- [ ] Interaction names: sentence case, descriptive ("Slide nav down on scroll" ✅, "Show nav" ❌).
- [ ] Simple CSS transitions (transform, opacity) for hover/press; complex multi-step interactions reserved for advanced cases.
- [ ] Transitions applied to **specific properties**, never "All"; every property that changes on hover has a transition; timing values consistent across similar elements.
- [ ] Animation performance: GPU-friendly properties only (transform, opacity); never animate top/left/width/height/filters/shadows/blend modes; durations 150–800ms; minimal affected area.
- [ ] Initial Appearance used for visibility control — not `display: none` / `visibility: hidden` / `opacity: 0` unless necessary.
- [ ] Background videos have pause/skip controls.
- [ ] Unused interactions deleted.
- [ ] Explicit width/height or aspect-ratio boxes on all images (prevents layout shift); no late-injected images.

### GSAP in custom code
If GSAP is included as custom code, the Instructions page (or a separate "GSAP Guide" page) must contain a **"How to Edit GSAP Animations"** section with all three parts:

1. **Element Map** — every GSAP-animated selector (class/ID/attribute) with a one-line description of its animation.
2. **Customizing Key Variables** — code snippets for duration, delay, ease, ScrollTrigger config, with plain-language instructions ("to slow the reveal, increase duration from 0.6 to 1.2 seconds").
3. **Removing GSAP Animations** — step-by-step disable/delete instructions (comment/remove code, delete matching ScrollTrigger, save & republish) plus visual side effects.

Keep it skimmable with fenced code blocks.

## SEO

- [ ] Homepage `<title>` format, exact case: `{Template Name} - Webflow HTML website template` (static/CMS) or `{Template Name} - Webflow Ecommerce website template` (ecommerce). "Website Template" capitalized is flagged.
- [ ] Inner page titles follow one pattern (`{Page} - {Template Name}`) with one separator; no two pages share a title or a meta description.
- [ ] Every page — including CMS collection pages — has a unique meta title (< 60 chars) and a meta description that describes that page. A length of 150–160 chars is recommended; the length alone does not block a submission.
- [ ] Open Graph metadata on every page: title, description, and a **JPEG or PNG** image ≥ 1200×630px at 1.91:1. **Not WebP or AVIF** — OG consumers don't reliably support it.
- [ ] One `<h1>` per page (multiple H1s allowed only when nested in `<section>`/`<article>`); H2–H6 in serial hierarchical order with no skipped levels.
- [ ] Concise descriptive slugs (`/blog/my-article`).
- Not required: `/sitemap.xml`. Webflow only serves the auto-generated sitemap on a paid Site plan, and your unhosted `*.webflow.io` demo has none, so a 404 there is expected. You do not need to enable Auto-generate sitemap for review.
- [ ] Main pages score a passing SEO grade on https://pagespeed.web.dev/ per the rubric.

## Accessibility

- [ ] Passing Core Web Vitals on desktop + mobile (PageSpeed Insights on all main pages).
- [ ] Heading order verified in Webflow's Audit Panel — no skipped levels, no missing alt text.
- [ ] WCAG color contrast met — including focus/hover/active states, text, borders, icons, overlays.
- [ ] Semantic HTML; ARIA roles/labels where needed; keyboard- and screen-reader-friendly ordering.
- [ ] Inclusive, plain language; unique descriptive link labels (no "click here").
- [ ] Alt text on important images; decorative images marked as such in the media library.
- [ ] No autoplaying media (or provide controls).

## Images and assets

- [ ] High-quality, contemporary imagery — no cutouts, low-res graphics, or generic overused stock.
- [ ] Images compressed to 150KB or less. Larger images block the submission (SVGs and Webflow-generated video posters are exempt). Absolute max 4MB per file.
- [ ] Modern formats (WebP, AVIF, PNG, JPEG); CMS images compressed to AVIF/WebP with Webflow-native tools.
- [ ] Below-the-fold images lazy-loaded; eager loading only for above-the-fold essentials; responsive images enabled in Project Settings.
- [ ] Videos compressed; no autoplay without controls.
- [ ] Mockups, dashboard screenshots, and logo strips contain no real product or brand names (Stripe, Slack, Segment, YouTube, ...) — reviewers zoom into the artwork.
- [ ] **Licensing**: every asset resale-safe — free, CC0, or explicitly licensed for resale (Stock Up, Pexels, Unsplash), with license links on `/licenses`. No premium stock, no trademarked logos or branded content (Google, Slack, …) — use fake/logo-ipsum brands. Exception: social media icons linking to real accounts.
- [ ] Nav logo: an **image file** (easy replacement) matching the template name; modern logomark + clean wordmark.

## Layout and content

- [ ] Every link and button goes somewhere — no empty `href`/`#` links.
- [ ] In repeating grids, the main image is a clickable link (not a hidden text link).
- [ ] Consistent spacing; no crammed/cluttered layouts; sections/containers/labeled divs structure the site; sections composed from reusable components.
- [ ] `min-height` (not `height`) on sections, especially heroes.
- [ ] Content matches the template's claimed category.
- [ ] Appropriate for a general global audience: inclusive language and imagery; no obscenity, nudity, violence, drug references, political/religious bias, or culturally insensitive material.
- [ ] No self-promotion anywhere in the template, including the Instructions page (`layout-and-content-18`): no Buy/Get template or pricing CTAs, no "More/All templates" links or links to your other templates, no floating badges, bars, banners or pop-ups, no customization/support/Figma/paid-service offers. Allowed: one "Designed by" credit in the footer linking to your site or creator profile.
- [ ] No ® or ™ in the copy (`layout-and-content-19`). Template brands are fictional, and these symbols claim a registered trademark.
- [ ] No page scrolls sideways at 375px, 768px or 1440px.
- [ ] Fluid, responsive layouts across all viewports; fluid units over absolute px (REM for typography); consistent unit choices in similar scenarios; responsive spacing system (e.g. 60px desktop → 20px mobile section padding).
- [ ] All elements function at every breakpoint (e.g. tabs stack on mobile).
- [ ] Rich Text elements styled via tag selectors; unique Rich Text styles applied through a class on the Rich Text element.

## Forms and conversion design

- [ ] Success messages customized to match the design.
- [ ] Input focus states customized and consistent.
- [ ] Legible form text and placeholders.
- [ ] Meaningful, descriptive names for forms and fields (they appear in email notifications) — no Webflow defaults like `Email Form` or `Field 2`; a descriptive `Name`/`name` field is valid.
- [ ] Default success text ("Thank you! Your submission has been received!"), default error text, and "Example Text" placeholders replaced; the submit button gives visible feedback.
- [ ] **Every field has a label** (accessibility requirement).
- [ ] Correct field types — email fields set to `email`, not `text`.
- [ ] Conversion design per the rubric: obvious CTAs in high-traffic locations, clear navigation, sections that support decision-making (social proof, objection handling, results).

## Custom code and site settings

Custom code (site settings, embeds, page settings) is **not allowed**, with exactly these exceptions:

1. GSAP custom code (with the required Instructions documentation)
2. Font smoothing in project settings: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`
3. `<meta name="robots" content="noindex">` on the Licenses and Changelog pages (required there)
4. Inline SVG code — requires an Instructions page explaining how to use it
5. Lenis smooth scrolling, including its initialization code
6. The Webflow Way Validator snippet in Site Settings → Custom Code → Head code (required for submission)

A hand-written script that is not GSAP (a counter, slider, menu or share script) is outside this list, even when it is small. Let GSAP or Webflow Interactions do the work.

Site settings:

- [ ] Custom favicon + webclip matching the template theme, displaying properly in both light and dark browser chrome.
- [ ] Responsive images enabled.
- [ ] Form Notifications settings **empty**.
- [ ] Every page loads with no uncaught JavaScript error (open the browser console on each page).
- [ ] Only Google fonts or free OFL fonts — no Typekit, no custom font files.
- [ ] All integration settings at defaults — no API tokens, no third-party integrations, no Maps API key.
- [ ] No installed/connected apps beyond what the template needs (reviewers ask for unrelated apps to be removed).
- [ ] Total site weight < 10MB; CSS minified.
- [ ] **Localization not enabled.**

## CMS (if applicable)

- [ ] Collection pages used for repeatable/relational content; each has dynamic SEO metadata.
- [ ] Collection names: Title Case with correct singular/plural — must sound natural in "This is a Collection of {plural}" / "Create a new {singular}".
- [ ] Collection slugs: short, **singular**, descriptive (`article`, `project`, `member` → `site.com/article/page`).
- [ ] Field names in sentence case, each with a short description / help text.
- [ ] 3–7 items per collection with realistic dummy content fitting the category.
- [ ] Essential fields marked required; conditional visibility on optional fields (e.g. show Facebook icon only when URL present).
- [ ] Reference/multi-reference for relationships; option fields for fixed values; large lists paginated.
- [ ] CMS media compressed (< 4MB) before upload.

## Ecommerce (if applicable)

> **Critical**: a business address, once added, can never be removed — and templates with one are rejected with no path to fix. Never add one.

- [ ] No business address, and no Ecommerce settings configured (currency, shipping, tax zones, …).
- [ ] Ecommerce → Setup Guide steps all **unchecked**: Business address, Shipping method, Tax settings, Payment provider, Hosting, Checkout.
- [ ] No preloaders on: Products template, Categories template, Checkout, Order confirmation.
- [ ] Cart in the navbar (or visible on every page) with items, subtotal, and working checkout buttons; regular checkout + PayPal checkout (Webpayments optional).
- [ ] Checkout page: form + order items + summary. Checkout PayPal page: PayPal form + items + summary, styled consistently. Order confirmation page: confirmation element.
- [ ] Product template: Add to Cart, description, image. Category template: categories list + links to products.
- [ ] Enough dummy products/categories for the design to look good; consistent casing and spelling; variants on some products where sensible.

## Template listing information (submission form)

### Name
- [ ] 1–2 words, preferably 1.
- [ ] Unique and memorable — not a duplicate, near-duplicate, or misspelled search term ("Startuq").
- [ ] Reflects the theme (Orbit for space, Haven for wellness); generic names ("Template 01") not allowed.
- [ ] No keyword gaming ("AI Startup Tech Creative").
- [ ] Professional tone — no slang, special characters, symbols, odd capitalization ("StArTuPz!!!").
- [ ] No brand or author names.
- [ ] Does not include a category name (e.g. not "Podcast", "Finance", "AI" in the name). If you rename, update the URLs, thumbnails, description, and every other reference to the name.

### Description
- [ ] About this template only (`template-listing-information-19`): no links to your site, other templates, bundles or paid services, and no support email. Buyers reach you from the Support tab.

### Categories and page count
- [ ] Up to 2 categories that accurately represent the template.
- [ ] Page count class correct: one page / multi page / **multi layout** (= at least 3 layout variations across 3 static pages, e.g. 3 versions each of Home, About, Pricing).

### Thumbnails
- [ ] **Main thumbnail**: homepage or a key page; simple and clear; no complex multi-page views, no angled or tiled mockups.
- [ ] **Hover thumbnail**: a different section or page; visually consistent with the main (colors, style, layout tone).
- [ ] Neither contains: badges ("New", feature icons, corner labels), external logos or tool icons ("CMS", "Figma"), template/category names as text, CTAs or sales messaging ("Buy Now"), or excessive text.
- [ ] After design changes, refresh the thumbnails and carousel images so they show the current design.
