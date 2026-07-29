# Template Review: Olipy

**URL:** https://olipy.webflow.io/
**Version ID:** N/A (URL-only review)
**Reviewer:** claude-sonnet-4-6 via template-review skill
**Date:** 2026-05-11

## Verdict

**Revise.** Visual direction is at Good (clean blog aesthetic, coherent hero, sensible section flow) and required pages exist at the right slugs. But the template ships a substantial amount of custom code (Lenis smooth-scroll, GSAP with paid SplitText + TextPlugin) without the required Instructions page, the "Powered by Webflow" attribution is a fake link (`href="#"`), forms have several quality problems (typo'd field names, `type="text"` for email fields, no labels), and the style guide is incomplete (missing H5/H6, lists, blockquotes, figures). All correctable, but the custom-code and form issues are non-trivial work.

## Hard requirement failures

- [Custom Code] Lenis smooth-scroll library loaded from CDN (`https://unpkg.com/lenis@1.1.18/dist/lenis.min.js`) — not in the three allowed exceptions
- [Custom Code] GSAP loaded from CDN with multiple plugins: `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js`, `TextPlugin.min.js`. Inline code calls `gsap.registerPlugin(TextPlugin, ScrollTrigger, SplitText)`. Custom GSAP usage is only allowed if `/instructions` page documents it.
- [Custom Code / Licensing] `SplitText.min.js` is a GSAP Club (paid) plugin — marketplace templates cannot ship paid licensed assets. Remove or replace.
- [Custom Code] Two versions of GSAP referenced in scripts (3.12.2 and 3.15.0). Even if GSAP is allowed via Instructions documentation, mixing versions suggests sloppy bundling. Consolidate to one version.
- [Required Pages] `/instructions` page missing (404). Required given the GSAP / Lenis custom code in use.
- [Footer] "Powered by Webflow" attribution text exists in footer but the link `href="#"` points nowhere. Submission guidelines require the attribution to **link to Webflow's homepage** (https://webflow.com). Fix the href.
- [Footer] "Developed by Glimix Studio" link also uses `href="#"`. Either remove or make functional — broken links in the footer are a UX issue regardless of policy.
- [SEO / OG] `og:image` is `.webp` (`69b0afc0aae4228b26baf47a_open%20graph%20image%20(1200x630).webp`). New OG requirements: JPEG or PNG only.
- [Forms] Newsletter form field has typo'd `name="newsleeter"` and `data-name="newsleeter"`. Form/field names must be descriptive and correctly spelled — these names show up in form notification emails.
- [Forms] Second newsletter field has `name="name"` and `data-name="Name"` but the placeholder is "Enter your email" and the field is intended for email. Field name doesn't match its purpose.
- [Forms] Email-collection inputs use `type="text"` instead of `type="email"`. Submission guidelines require correct field types — email fields must be `type="email"`.
- [Forms] No `<label>` elements on any form fields. Submission guidelines require all form fields to have labels for accessibility (placeholders aren't a substitute).
- [Style Guide] `/style-guide` page is missing required tag types: H5, H6, Unordered List, Ordered List, Blockquote, Figure with caption. All of these must be styled and demonstrated on the style guide per submission guidelines.
- [Naming / Typos] Navigation and footer links use `/catagory` (should be `/category`). Both nav and footer reference the typo consistently — the underlying page slug needs renaming.
- [Naming / Typos] Header email link in nav: anchor text is `hello.olipy@gmail.com` but the href is `https://hello.olify@gmail.com` (typo: "olify" instead of "olipy", and uses `https://` instead of `mailto:`). The link is broken on two levels.

## Rubric assessment

| Dimension | Tier | Evidence |
|-----------|------|----------|
| Overall UX | Good | Clear blog-platform purpose. Nav is conventional (home, blogs, category, authors, story-submission, contact). Hero pairs a strong headline with imagery. Section flow makes sense for the vertical. |
| Graphic Design | Good | Clean, content-forward palette (off-white, dark text). Hero imagery is warm and curated-feeling. Section spacing reads generous without being sparse. |
| Typography | Good | Uses "EightiesComeback VAR" (display) and "Geist" (body) per the style guide — a deliberate display/body pairing, not default. One real H1 on home with clear visual prominence. |
| Interaction Design | UNVERIFIABLE — needs visual review | Lenis smooth-scroll + GSAP + SplitText + TextPlugin all loaded. Without rendered JS, can't assess whether interactions enhance or distract. Reviewer to test: scroll feel, text-reveal animations, hero behavior, mobile menu. |
| Hierarchy | Good | Home page headings advance ideas sequentially (Trending → Categories → Authors → Latest → Subscribe). Each H2 introduces a discrete section. |
| Layout Design Quality | Good | Section variety: hero, trending (3-card row), category grid (6-cell), author showcase (12-portrait grid), latest posts (5-item list), newsletter, footer. Not a repeated pattern. |
| Responsive Design | UNVERIFIABLE — needs visual review | Test home, /style-guide, /blogs, /contact (if exists), /authors at 320px, 768px, 1024px, and 400% zoom. Confirm no horizontal scroll, that the 12-author grid reflows sensibly on mobile, and that the multi-card hero stacks well. |
| Conversion Best Practices | Good | Two clear conversion goals (newsletter signup + "Tell your story" submission) both surfaced in nav. Newsletter form appears in body AND footer. Multiple paths to engage. |
| Site Optimization — SEO | UNVERIFIABLE — run pagespeed | https://pagespeed.web.dev/?url=https://olipy.webflow.io/ |
| Site Optimization — Performance | UNVERIFIABLE — run pagespeed | Caveat: a lot of script is being loaded (Lenis, GSAP core, ScrollTrigger, SplitText, TextPlugin, plus standard Webflow scripts). Likely to drag the performance score. |
| Site Optimization — Best Practices | UNVERIFIABLE — run pagespeed | The broken `href="#"` links may flag as a best-practices issue. |
| Accessibility | Partial fail — at most Satisfactory | Forms without labels is a known accessibility failure. The `href="#"` links also create issues for assistive tech (focusable but non-functional). Likely 60-70 range pending pagespeed. |

## Punch list

1. [Instructions page] Create `/instructions` page documenting every custom-code dependency: GSAP (with Element Map, Customizing Key Variables, Removing GSAP Animations sections per guidelines), Lenis (how to disable smooth scroll), SplitText (or remove — see #2).
2. [Custom code — SplitText] Remove the paid SplitText GSAP plugin. Marketplace templates cannot include paid licensed assets. Replace SplitText-driven effects with free alternatives or Webflow native interactions.
3. [Custom code — GSAP version cleanup] Multiple GSAP versions referenced (3.12.2 and 3.15.0). Consolidate to one version.
4. [Custom code — Lenis] Either remove Lenis (replace with Webflow's native scroll behavior) or include in Instructions page with disable-smooth-scroll documentation.
5. [Custom code — TextPlugin] If TextPlugin animations are kept, document them in Instructions; otherwise remove.
6. [Footer, all pages] Fix "Powered by Webflow" link — change `href="#"` to `href="https://webflow.com"`. The attribution doesn't satisfy the guideline as a non-link.
7. [Footer, all pages] Fix or remove the "Developed by Glimix Studio" link — `href="#"` is a broken link. Either link to designer's site or remove the attribution.
8. [Nav] Fix the email link: change anchor href from `https://hello.olify@gmail.com` to `mailto:hello@olipy.com` (or whatever the real email is). Two typos and wrong protocol.
9. [Nav / Footer / Page slug] Fix the `/catagory` typo to `/category`. Rename the page slug in Designer and update all internal links.
10. [Forms] Add `<label>` elements to every form field. Labels can be visually hidden but must be in the DOM and associated with the input via `for`/`id`.
11. [Forms] Change all email-collection input `type="text"` to `type="email"`.
12. [Forms] Fix the field name typo `newsleeter` → `newsletter`. Fix the second field's `name="name"` to `name="email"` since it's an email field.
13. [Forms] Verify form names in Designer: form notification emails will use these names, so they should be descriptive (e.g. "Footer Newsletter" not "Email Form 2").
14. [OG metadata] Replace the `.webp` OG image with a JPEG or PNG at 1200×630, 1.91:1 aspect ratio.
15. [Style guide] Add missing tag types to `/style-guide`: H5, H6, Unordered List, Ordered List, Blockquote, Figure with caption. Each must be styled at the tag-selector level, not via classes.

## Designer-side checks required

- Verify the four "Share Your Voice with the World" repetitions are not actually H1 tags (raw HTML showed only one H1 on home; the WebFetch crawler saw them as H1-styled, but they may be CMS-rendered cards). Confirm in Designer that they aren't using `<h1>` tags inside a Collection list.
- Class re-use and no auto-generated class names (Div Block 45, etc.)
- Variables defined for color, typography, spacing per new guidelines (the style guide mentions Geist + EightiesComeback VAR — verify these are set as Variables not just direct font assignments)
- Components used for Navbar, Footer, CTAs with Title Case names
- Combo classes within 3-4 level limit
- Unused styles cleared
- CMS collections: 3-7 items each, slugs singular, field names sentence case with help text. Specifically: Blogs collection, Authors collection, Category collection.
- "Category" Collection slug should be singular and correctly spelled (the current `/catagory` URL suggests the slug itself is the typo)
- Site total weight < 10MB
- Favicon and webclip present, custom, match theme
- Form Notifications settings empty
- Integration settings default — no API tokens
- Responsive images enabled in Project Settings
- Initial release date in changelog is "August 15, 2023" — confirm with designer whether this is accurate or a leftover from a previous template. Templates with stale changelogs sometimes signal a copied scaffold.

## Manual / visual checks required

- Mobile responsiveness at 320px, 768px, 1024px on every main page (home, /style-guide, /blogs, /authors, /storytale, /contact, individual blog/category/author templates)
- 400% zoom test on home, /blogs, /contact — confirm reflow without horizontal scroll
- Mobile menu open/close behavior
- Lenis smooth-scroll feel — purposeful or distracting?
- GSAP scroll-triggered animations on home — do they aid comprehension or compete for attention?
- Hover states on author cards, category cards, blog cards
- 404 page rendering — confirm `/404` content is served when a real 404 happens (test `https://olipy.webflow.io/something-random` in a browser)
- Color contrast — minimal palette with dark text on light bg should pass, but check any low-contrast accent text
- Newsletter form submission flow — does it accept invalid emails gracefully? Does success state match design?

## PageSpeed (must be run)

```
https://pagespeed.web.dev/?url=https://olipy.webflow.io/

Need on both mobile AND desktop:
- SEO ≥ 70
- Performance ≥ 51   ← likely the weak point given the JS payload
- Best Practices ≥ 51
- Accessibility ≥ 70

Run for at least: home, /blogs, one author page, one blog post, /contact (if exists).
```

## Suggested feedback for designer

Olipy has a clean editorial direction and the section structure on the home page tells the blog-platform story well. To get this through marketplace review, the biggest items are around code and forms: (1) the template loads Lenis, GSAP (with multiple versions), SplitText, and TextPlugin all as custom code — only documented GSAP is allowed by the submission guidelines, and SplitText is a paid GSAP Club plugin that can't ship with a marketplace template. Please remove SplitText, consolidate to a single GSAP version, and add an `/instructions` page documenting the GSAP and Lenis usage with the required sections (Element Map, Customizing Key Variables, Removing GSAP Animations). (2) The "Powered by Webflow" link in the footer uses `href="#"` — it needs to actually point to https://webflow.com to satisfy the attribution requirement. The "Developed by Glimix Studio" link has the same `href="#"` issue. (3) The newsletter forms have several problems: `name="newsleeter"` is a typo, the second form's email field is named `"name"`, all email inputs are `type="text"` instead of `type="email"`, and no fields have `<label>` elements. (4) The nav email link is broken in two ways — it's `https://hello.olify@gmail.com` instead of `mailto:hello@olipy.com`. (5) The `/style-guide` page is missing H5, H6, unordered lists, ordered lists, blockquotes, and figures — all tag types need to be demonstrated. (6) The page slug `/catagory` is a typo. (7) The OG image needs to be JPEG or PNG, not WebP. Once these are addressed, please resubmit.
