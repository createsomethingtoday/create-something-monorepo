# Automated Checks

Things you can verify from HTML / HTTP alone with WebFetch.

## Page existence

For each required page, fetch the URL and check the response:

```
GET /style-guide  → expect 200 (not the site's 404 page)
GET /licenses     → expect 200
GET /changelog    → expect 200
GET /instructions → expect 200 if GSAP / SVG code / advanced interactions detected; else optional
GET /a-page-that-doesnt-exist → expect a custom branded 404 (not Webflow's default)
```

A 404 page that's just the default Webflow message fails the "custom branded 404" requirement.

## Footer scan

Fetch any page with raw curl (not WebFetch — see SKILL.md on why) and grep the `<footer>`:

| Pattern | Required? | Verify how |
|---------|-----------|------------|
| `Powered by Webflow` phrase AND link to `webflow.com` | Yes | Extract the `<a>` wrapping the phrase — confirm `href="https://webflow.com"`, NOT `href="#"` |
| `Licensing` (or `License`) link to `/licenses` | Yes | Confirm href is `/licenses` exactly |

**Fake-link trap.** A common failure pattern: the footer reads "Powered by Webflow" but the link is `<a href="#">Webflow</a>`. The phrase is present, the link target is wrong. Always verify the `href` of the wrapping anchor, not just that the phrase appears in the page. Same trap applies to designer credit links — `href="#"` on any visible attribution is a broken link and a fail.

Use this exact check:

```bash
curl -s https://example.webflow.io/ | grep -ioE '<a[^>]+href="[^"]*"[^>]*>[^<]*Webflow[^<]*</a>'
```

If the href is `#`, empty, or anything other than a webflow.com URL, mark FAIL.

## Head scan

For `/licenses` and `/changelog`, the head must contain:
```html
<meta name="robots" content="noindex">
```

For the home page, the `<title>` must match:
```
{Template Name} - Webflow HTML website template
{Template Name} - Webflow Ecommerce website template
```

The template name should be the published subdomain stripped of `-template` or similar (e.g. `aurae` from `aurae-temlis.webflow.io`). Confirm with reviewer context if uncertain.

## Heading hierarchy

For every fetched page:
1. Count `<h1>` tags. Should be exactly 1, unless multiple are nested in `<section>` or `<article>`.
2. Walk H1→H6 in document order. Flag any skipped levels (e.g. H2 directly to H4).

## Headings: no lorem

Grep all `<h1>`–`<h6>` content for `lorem` / `ipsum` (case-insensitive). Headings must use unique, relevant copy. Paragraphs may use lorem ipsum.

## Custom code detection

Pull every `<script>` and `<style>` from every fetched page. Categorize:

| Pattern | Verdict |
|---------|---------|
| `webflow.js`, `jquery`, Webflow CDN scripts | Allowed (Webflow's own) |
| Inline `<style>` with only `-webkit-font-smoothing` / `-moz-osx-font-smoothing` | Allowed |
| Inline `<style>` or `<script>` in head of /licenses or /changelog with only `<meta name="robots" content="noindex">` | Allowed |
| Inline SVG elements | Allowed if `/instructions` exists and documents them |
| GSAP scripts | Allowed if `/instructions` exists with GSAP section |
| Anything else: Google Analytics, Hotjar, Stripe, custom JS, custom CSS | **FAIL** |

## Links audit

Walk all `<a href="...">` tags:
- `href="#"` or `href=""` without context → fail (empty link)
- `href="#"` on a "Buy template" CTA → allowed (activated after marketplace publish)
- All other anchors must resolve to a page or anchor on the site, or an external URL

## Image audit

For every `<img>`:
- Has `alt` attribute? (Empty alt OK if image is decorative; missing alt fails)
- File extension? (Modern formats preferred: WebP, AVIF, PNG, JPEG)
- Below the fold? (Should have `loading="lazy"`)
- Above the fold (hero)? (Should have `loading="eager"`)

For each image, HEAD request to get Content-Length:
- Hero/background images: flag if > 300KB, fail if > 4MB
- Small images (icons, thumbnails): flag if > 20KB
- Recommend target: ≤ 150KB across the board

## Trademark scan

Grep image filenames, alt text, and visible copy for known brand names:
```
google, slack, microsoft, apple, meta, facebook, instagram, twitter, x.com,
amazon, netflix, spotify, airbnb, uber, shopify, stripe, paypal
```

Allowed: social media icons (Instagram, X, etc.) linking to relevant accounts. Anywhere else, brand logos are a fail.

## Form audit

Walk every `<form>`, `<input>`, `<select>`, `<textarea>`:
- `type="email"` for fields named "email" (not `type="text"`)
- Every input has either an associated `<label>` or `aria-label`
- Form has a descriptive `name` or `data-name` (not "Email Form 2")
- Field elements have descriptive `name` attributes

## OG metadata

For every fetched page, read:
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:image">`

Validate:
- OG title and description present and unique per page
- OG image URL is reachable (HEAD)
- OG image extension is `.jpg`, `.jpeg`, or `.png` (not `.webp`)
- OG image dimensions ≥ 1200×630 (if you can fetch and inspect)

## Localization detection

Grep page HTML for:
- `<link rel="alternate" hreflang=...>` tags
- Webflow's locale switcher UI elements (look for `w-locales-list` or similar Webflow locale classes)

If localization is enabled: **FAIL** (not allowed on new templates).

## GSAP detection

Grep all `<script>` content and external script URLs for:
- `gsap` (any case)
- `ScrollTrigger`
- `Flip`
- `MotionPath`

If GSAP is detected, you MUST then fetch `/instructions` and verify it contains:
- "Element Map" section
- "Customizing Key Variables" section
- "Removing GSAP Animations" section

## PageSpeed (manual)

PageSpeed Insights can't be fetched from the skill. Output this for the human reviewer:

```
PageSpeed: open https://pagespeed.web.dev/?url=<template-url> and capture:
- SEO score (need ≥70 for "Good")
- Performance score (need ≥51 for "Good")
- Best Practices score (need ≥51 for "Good")
- Accessibility score (need ≥70 for "Good")

Run for both mobile and desktop. Both must pass.
```

Mark all four PageSpeed lines `UNVERIFIABLE — run pagespeed manually` in the rubric.
