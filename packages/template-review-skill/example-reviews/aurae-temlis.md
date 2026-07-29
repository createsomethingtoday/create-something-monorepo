# Template Review: Aurae

**URL:** https://aurae-temlis.webflow.io/
**Version ID:** N/A (URL-only review)
**Reviewer:** claude-sonnet-4-6 via template-review skill
**Date:** 2026-05-11

## Verdict

**Revise.** The design quality and content sit at Good across visible dimensions, but several hard requirements are unmet — required pages live under the wrong slugs, the GSAP usage isn't documented in an Instructions page, custom code (Swiper, GSAP plugins, including paid SplitText) is loaded from CDNs without the required documentation exception, "Powered by Webflow" is absent from the footer, OG image is WebP (not allowed for OG), and the contact form fields use placeholders instead of labels. All correctable, but the custom-code situation needs the most attention.

## Hard requirement failures

- [Required Pages] Style guide is at `/template/style-guide` — guidelines require `/style-guide` at root
- [Required Pages] Licenses is at `/template/licensing` — guidelines require exactly `/licenses` (plural, at root)
- [Required Pages] Changelog is at `/template/changelog` — guidelines require `/changelog` at root
- [Required Pages] No `/instructions` page exists (404 at `/template/instructions` too), but GSAP is in use — Instructions page with GSAP documentation is required when GSAP is used in custom code
- [Footer] "Powered by Webflow" link missing — searched all home-page HTML and footer; zero occurrences of the phrase and no link to webflow.com
- [Custom Code] External script `https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js` loaded — not in the three allowed exceptions (font smoothing, noindex meta, SVG). Note: Webflow does inject this for Google Fonts, so verify in Designer whether this is auto-generated or manually added.
- [Custom Code] External script `https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js` loaded — Swiper is custom code, not allowed. Use Webflow's native slider component instead.
- [Custom Code] GSAP scripts loaded from CDN: `gsap.min.js`, `SplitText.min.js`, `ScrollTrigger.min.js` — these are custom code. Allowed only if `/instructions` page documents them.
- [Custom Code / Licensing] `SplitText.min.js` is a GSAP Club (paid) plugin. Marketplace templates can't include paid licensed assets. Either replace the SplitText usage or document the licensing situation explicitly.
- [SEO / OG] `og:image` is `_Ophen%20Graph_1x.webp` — OG images must be JPEG or PNG. WebP isn't reliably supported by OG consumers.
- [Forms] Contact form fields (name, email, phone, message) use placeholder text only — no `<label>` elements. Submission guidelines require all form fields to have labels for accessibility.

## Rubric assessment

| Dimension | Tier | Evidence |
|-----------|------|----------|
| Overall UX | Good | Clear product focus, coherent skincare-brand narrative, nav structure (Products dropdown, About, Contact) is conventional and easy to scan. |
| Graphic Design | Good | Warm neutral palette (olive, amber, beige), high-quality product imagery (`.avif`, `.webp`), consistent visual language across home/about/products. No stock-feeling generic imagery observed. |
| Typography | Good | Italic emphasis pattern in headings (`_designed_`, `_work_`, `_your_`, `_results_`) is a deliberate stylistic choice used consistently. Heading hierarchy on home page reads H1 → multiple H2s without skipped levels. One H1 per page on home and /about/about-v1. |
| Interaction Design | UNVERIFIABLE — needs visual review | GSAP + ScrollTrigger detected. Without rendered JS, can't judge interaction quality. Reviewer to test: hero animations, scroll-triggered reveals, slider behavior, mobile menu, hover states on product cards. |
| Hierarchy | Good | Home page heading sequence tells the brand story (statement → benefits → product → routine → testimonials → CTA). Each H2 advances a distinct idea. |
| Layout Design Quality | Good | Section variety from the home page: hero, 3-column feature grid, statement, stats with imagery, step-by-step routine, product showcase, social proof carousel, testimonials, CTA. Not a repeated "image-left/text-right" pattern. |
| Responsive Design | UNVERIFIABLE — needs visual review | No rendered viewport tests possible. Test all main pages at 320px, 768px, 1024px, and at 400% zoom. Confirm no horizontal scroll. |
| Conversion Best Practices | Good | Single conversion goal (product purchase) is the through-line on every section. CTAs are present in hero, after stats, and in dedicated CTA section. Cart visible in nav with `(0)` indicator. |
| Site Optimization — SEO | UNVERIFIABLE — run pagespeed | https://pagespeed.web.dev/?url=https://aurae-temlis.webflow.io/ |
| Site Optimization — Performance | UNVERIFIABLE — run pagespeed | Same URL. Image weights are excellent (3KB–75KB range, well under the 150KB target), so performance should pass at "Good" assuming JS execution isn't blocking. |
| Site Optimization — Best Practices | UNVERIFIABLE — run pagespeed | Same URL. |
| Accessibility | Partial fail — Satisfactory at best | Forms without labels is a known accessibility failure (placeholders aren't labels for screen readers). Run pagespeed for the score. Also verify color contrast on the warm-tone palette — the olive/amber on cream could be borderline. |

## Punch list

1. [All required pages] Rename pages to root slugs: `/template/style-guide` → `/style-guide`, `/template/licensing` → `/licenses` (note: plural, exactly), `/template/changelog` → `/changelog`. Update all footer links accordingly.
2. [Instructions page] Create `/instructions` page documenting the GSAP usage. Required sections: Element Map (list every GSAP-animated selector with what it does), Customizing Key Variables (code snippets for duration/delay/ease/ScrollTrigger), Removing GSAP Animations (steps to disable without breaking layout).
3. [Custom code — SplitText] Remove the paid SplitText plugin. Marketplace templates can't ship paid licensed assets. Replace any SplitText-driven effects with free GSAP plugins or Webflow native interactions.
4. [Custom code — Swiper] Replace the Swiper-powered sliders with Webflow's native slider component. Swiper isn't in the allowed custom-code exceptions.
5. [Custom code — GSAP / webfont.js] Verify in Designer whether these are added via custom code or auto-injected. If custom: either remove or ensure the Instructions page (step 2) covers them.
6. [Footer, all pages] Add "Powered by Webflow" link to footer pointing to https://webflow.com — required attribution.
7. [OG metadata] Replace the `.webp` OG image with a JPEG or PNG version, ≥1200×630px, 1.91:1 aspect ratio.
8. [Contact form] Add `<label>` elements for every field — name, email, phone, message. Placeholders aren't a substitute. The labels can be visually hidden if the design requires, but they must be in the DOM and associated with their inputs.
9. [Home page H1] Review the H1 copy "Naturally better skin start here." — likely a typo, "start" → "starts". Verify intentional.
10. [Footer attribution / Temlis branding] The footer contains designer branding ("Temlis, 130+ Premium Templates, Join our AI community"). Allowed, but verify with the marketplace policy on third-party attribution — usually fine if it doesn't compete with Webflow's branding for primary attention.

## Designer-side checks required

- Class re-use across pages — confirm no auto-generated class names (Div Block 45, etc.)
- Variables defined for color, typography, spacing per new guidelines
- Components used for Navbar, Footer, CTAs (Title Case names)
- Combo classes within 3-4 level limit
- Unused styles cleared
- CMS collections (if any) — check item counts (3-7), slugs singular, field names sentence case
- Site total weight < 10MB
- Favicon and webclip present, custom, match theme
- Only Google fonts or OFL fonts (verify in Project Settings — relevant given the webfont.js script)
- Form Notifications settings empty
- Integration settings default (no API tokens)
- Responsive images enabled in Project Settings
- Style guide page presence of tag-level styling (not just class-based styling) for All H1-H6, All Paragraphs, All Lists, All Blockquotes, All Figures, All Links

## Manual / visual checks required

- Mobile responsiveness at 320px, 768px, 1024px on every main page (home, about variants, product pages, contact, blogs)
- 400% zoom test on home, /about/about-v1, /contact — confirm reflow without horizontal scroll
- Mobile menu open/close behavior
- Scroll-triggered reveals (GSAP) — purposeful or distracting?
- Hover states on product cards, nav items, CTAs
- Slider interactions (currently Swiper-driven — note this will need to change)
- Background videos (if any) have pause/skip controls
- Color contrast on the warm-tone palette — especially text on cream/beige backgrounds
- Page count and layout variety — does it qualify for Multi-layout tag?

## PageSpeed (must be run)

```
https://pagespeed.web.dev/?url=https://aurae-temlis.webflow.io/

Need on both mobile AND desktop:
- SEO ≥ 70
- Performance ≥ 51
- Best Practices ≥ 51
- Accessibility ≥ 70

Run for at least: home, /about/about-v1, /contact, one product page.
```

## Suggested feedback for designer

The Aurae template has strong visual direction — the warm-toned palette and the italic-emphasis typography pattern give it a clear identity, and the home page layout has good rhythm between sections. To get this through marketplace review, the biggest items are around code and required-page structure: (1) the style guide, licenses, and changelog pages need to live at `/style-guide`, `/licenses`, and `/changelog` exactly — they're currently nested under `/template/` and the slug rules are strict; (2) GSAP plus Swiper plus SplitText are all loaded as custom code, but only documented GSAP is allowed and SplitText is a paid GSAP Club plugin which can't ship with a marketplace template — please remove SplitText, replace Swiper with Webflow's native slider, and add an `/instructions` page that documents the GSAP usage per the submission guidelines; (3) the footer needs a "Powered by Webflow" link to webflow.com; (4) the contact form fields need real `<label>` elements (placeholders alone don't satisfy accessibility requirements); (5) the OG image needs to be JPEG or PNG (WebP isn't supported by OG). Once these are addressed, please resubmit and we'll re-run the review.
