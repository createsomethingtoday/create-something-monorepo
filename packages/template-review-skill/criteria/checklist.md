# Hard Requirements Checklist

Source: Submission Guidelines (markdown + https://webflow.com/templates/submission-guidelines)

Every item is binary. PASS / FAIL / UNVERIFIABLE.

## Required pages

| Requirement | How to verify |
|-------------|---------------|
| `/style-guide` exists with all tags (H1-H6, paragraphs, links, lists, buttons, blockquotes, figures) | Fetch `/style-guide`, confirm presence of each tag |
| `/licenses` exists at exactly that slug | Fetch `/licenses` — 200 response, has expected text |
| `/licenses` includes the boilerplate text starting "All graphical assets in this template are licensed for personal and commercial use." | Grep the fetched HTML |
| `/licenses` has `<meta name="robots" content="noindex">` in head | Grep `<head>` |
| `/changelog` exists | Fetch `/changelog` |
| `/changelog` has `<meta name="robots" content="noindex">` | Grep `<head>` |
| `/instructions` exists if site uses advanced/hidden components or SVG code or GSAP custom code | Conditional — check only if relevant |
| Custom branded 404 page exists with full navigation and CTAs | Fetch `/404` or any non-existent path |

## Footer

| Requirement | How to verify |
|-------------|---------------|
| Footer includes "Powered by Webflow" link to webflow.com | Grep footer HTML for the phrase and the link |
| Footer includes "Licensing" link to `/licenses` | Grep footer HTML |

## Template name and listing

| Requirement | How to verify |
|-------------|---------------|
| Name is 1-2 words, preferably 1 | Reviewer input |
| Name is not the same as a category or primary tag | Reviewer input |
| Name doesn't duplicate an existing marketplace template | Reviewer input (search marketplace) |
| Name has no slang, special characters, or brand/author names | Reviewer input |

## SEO

| Requirement | How to verify |
|-------------|---------------|
| Home page `<title>` matches format: `{Template Name} - Webflow HTML website template` (static/CMS) or `{Template Name} - Webflow Ecommerce website template` (ecommerce) | Read `<title>` |
| Exactly one `<h1>` per page (multiple allowed only inside `<section>`/`<article>`) | Count `<h1>` per page |
| `<h2>`-`<h6>` follow hierarchical order — no skipped levels | Walk heading sequence |
| Every page has unique meta title (<60 chars) | Read meta per page |
| Every page has meta description (150-160 chars) | Read meta per page |
| OG metadata present: title, description, image ≥1200×630px, JPEG or PNG (not WebP), 1.91:1 ratio | Read OG tags + check image |

## Tag styling (verify on /style-guide)

All of these must be styled at the **tag selector** level (not just on classes):
- All H1-H6
- All Paragraphs
- All Unordered Lists, All Ordered Lists
- All Blockquotes
- All Figures, All Figure Captions
- All Links

Verification: load `/style-guide`, confirm each element type renders distinctly with consistent styling (you may need to note this is partial without Designer access).

## Layout

| Requirement | How to verify |
|-------------|---------------|
| No horizontal scrolling at any breakpoint | Fetch + check viewport meta, inspect for fixed widths exceeding viewport |
| Sections use `min-height` not `height` (especially heroes) | Inspect inline styles / class rules |
| Fluid units preferred (no rigid px-only layouts at scale) | Inspect class rules |
| Body uses primary font set on Body element | Inspect body style |

## Images and assets

| Requirement | How to verify |
|-------------|---------------|
| All images have alt text (or are marked decorative) | Walk `<img>` tags |
| Large background images < 300KB target, max 4MB | HEAD each large image |
| Small assets < 20KB target | HEAD each |
| Modern formats where possible (WebP, AVIF, PNG, JPEG) | Check file extensions |
| Below-the-fold images lazy-loaded | Check `loading="lazy"` |
| No trademarked logos (Google, Slack, etc.) — use logo ipsum or fake brands | Pattern-match HTML and image filenames |
| Logo in navbar is an image (not text), with filename matching template name | Inspect nav |

## Content

| Requirement | How to verify |
|-------------|---------------|
| Content matches the claimed primary tag / vertical | Reviewer judgment — does an "Agency" template have agency content? |
| No "lorem ipsum" in headings (paragraphs may use it) | Grep headings for "lorem"/"ipsum" |
| No offensive content, nudity, violence, drug use, political/religious bias | Reviewer judgment |
| All CTAs link somewhere (no empty href="#") | Walk all anchors |
| Hover states on links and buttons; no hover on non-interactive elements | Partial — inspect class rules |

## Forms

| Requirement | How to verify |
|-------------|---------------|
| Email fields are type `email`, not `text` | Inspect form HTML |
| All form fields have labels | Walk form fields |
| Form Notifications settings empty (Designer-only check) | Flag as Designer-only |
| Form/field elements have descriptive names | Inspect form attrs |

## Custom code

Custom code is **not allowed** except for these three:

1. Font smoothing: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`
2. `<meta name="robots" content="noindex">` on /licenses and /changelog
3. SVG inline code (requires /instructions page documenting it)

GSAP custom code is allowed but requires Instructions page documentation (see `new-requirements.md`).

Verification: extract all `<script>` and inline `<style>` from every page. Flag anything that isn't:
- Webflow's own generated scripts (webflow.js, jquery)
- The three allowed custom code patterns above
- GSAP (if Instructions page is present and documents it)

## Site settings (Designer-only — flag as such)

- Favicon and webclip present, custom, match template theme
- Only Google fonts or free OFL fonts (no Typekit)
- All integration settings default — no API tokens, no third-party integrations
- Total site weight < 10MB
- CSS minified
- Maps have no API key

## Ecommerce (if applicable)

Critical: business address, once added, cannot be removed. Ecommerce templates with these set must be rejected.

In Ecommerce > Setup Guide, these must remain **unchecked**:
- Business address
- Shipping method
- Tax settings
- Payment provider
- Hosting
- Checkout

Required cart elements:
- Cart in navbar or visible on each page
- Items, subtotal, checkout buttons functional
- Regular checkout, PayPal checkout (Webpayments optional)

Required checkout pages: Checkout (form + items + summary), Checkout PayPal (consistent styling), Order Confirmation (with confirmation element)

Required product pages:
- Product template: Add to Cart, description, image
- Category template: categories list, links to products
- 3-7 dummy products with consistent casing and spelling
- Some products with variants where it makes sense

Pages **without** preloaders: Products template, Categories template, Checkout, Order confirmation

## CMS (if applicable)

| Requirement | How to verify |
|-------------|---------------|
| Collections match the template category content (e.g. Band template has Songs, Albums, Shows) | Reviewer judgment via Designer |
| Collection slugs are singular (`/article/page` not `/articles/page`) | Inspect dynamic page URLs |
| Collections have 3-7 items | Count items on collection list pages |
| Dummy content matches the template category | Reviewer judgment |
| Conditional visibility used where fields are optional | Designer-only check |
| Dynamic grids tested with long item names | Designer-only |

## Naming conventions (Designer-only — flag as such)

- No auto-generated class names (Div Block 45, Image 4)
- Classes reused where styles are the same
- Consistent naming convention across the template (Title Case, kebab-case, BEM, etc.)
- Descriptive names, not abbreviations
- Combo classes ≤ 3-4 levels
- Unused styles cleared
- Components in Title Case
- Pages in Title Case with matching slugs
- Interactions in sentence case with descriptive names

## Accessibility

| Requirement | How to verify |
|-------------|---------------|
| Allows zoom without forcing horizontal scrolling (up to 400%) | Reviewer manual test |
| Color not the only way information is conveyed | Reviewer judgment |
| Color contrast ≥ 4.5:1 (or 3:1 for large/bold text) | Run automated contrast check or PageSpeed |
| Inclusive, plain language | Reviewer judgment |
| Unique, descriptive link labels (no "click here") | Walk link text |
| Alt text on every important image | Walk img tags |
| No autoplay media without controls | Check video/audio attrs |
| Background videos have pause/skip controls | Inspect video elements |
