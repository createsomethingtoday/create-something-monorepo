# Newer Requirements

These are from the live https://webflow.com/templates/submission-guidelines page that aren't in the older internal markdown. Apply them.

## GSAP and Custom Interactions

If the template uses GSAP — whether via Webflow's GSAP-native interactions or as custom code — the **Instructions page must include a "How to Edit GSAP Animations" section** covering:

| Section | Required content |
|---------|------------------|
| Element Map | List of all GSAP-animated CSS selectors with brief descriptions of what each does |
| Customizing Key Variables | Code snippets showing how to change `duration`, `delay`, `ease`, and `ScrollTrigger` config |
| Removing GSAP Animations | Step-by-step instructions to disable or delete animations without breaking layout |

Verification:
1. Search the HTML for GSAP usage: look for `gsap.`, `ScrollTrigger`, `Flip`, or imports of `gsap` in `<script>` blocks
2. If found, fetch `/instructions` and confirm it contains all three sections above
3. If GSAP is detected and Instructions page is missing or incomplete: **FAIL**

## Animation Performance

| Requirement | How to verify |
|-------------|---------------|
| GPU-friendly properties only (transform, opacity) | Inspect interaction definitions if available; flag if `top/left/width/height/filter/box-shadow` animations are observed |
| Animation duration between 150ms and 800ms | Inspect transition/animation rules |
| Use Initial Appearance for visibility control (not `display: none` for animated elements) | Designer-only — flag |
| Background videos have pause/skip controls | Walk video elements |

## Image Optimization (stricter than old guidelines)

| Requirement | How to verify |
|-------------|---------------|
| Compress images to ≤ 150KB where possible | HEAD each image, list those over 150KB |
| Max file size 4MB | HEAD each, fail any over 4MB |
| Modern formats: WebP, AVIF, PNG, JPEG | Check extensions |
| Lazy-load below-the-fold images | `loading="lazy"` on non-hero images |
| Eager load only above-the-fold essentials | `loading="eager"` only on hero |
| Responsive images enabled in Project Settings | Designer-only — flag |

## Template Name (stricter than old guidelines)

| Requirement | Notes |
|-------------|-------|
| 1-2 words, preferably 1 word | Old guidelines said "preferably single word"; new is stricter |
| Unique and memorable | Search marketplace to confirm |
| Reflects template's theme/purpose | Reviewer judgment |
| No keyword gaming (multiple keywords stuffed in) | Reviewer judgment |
| Professional tone — no slang, special characters, odd capitalization | Reviewer judgment |
| No brand or author names | Reviewer judgment |

## Thumbnail Images (new section)

| Asset | Requirements |
|-------|--------------|
| Main thumbnail | Showcases homepage or key page. Simple and clear. **Avoid:** complex multi-page views, angled mockups, tiled mockups. |
| Hover thumbnail | Shows a different section or page. Demonstrates versatility. Consistent style with main thumbnail. |

Both thumbnails must **avoid**:
- Badges or icons for features
- External logos or tool icons
- Template name or category text on the image
- CTAs or sales messaging
- Excessive text

Verification: review the thumbnail assets the designer submitted (visible in the review queue context, not on the published template URL).

## OG Metadata (specifics)

| Requirement | How to verify |
|-------------|---------------|
| OG image is JPEG or PNG (**not WebP** — OG doesn't support it reliably) | Check `og:image` URL extension |
| OG image dimensions ≥ 1200×630 px | HEAD or download and inspect |
| OG image aspect ratio 1.91:1 | Verify dimensions |
| Every page (including CMS templates) has unique OG title and description | Walk OG tags across pages |

## Style Variables (new emphasis)

The newer guidelines require **Variables** (Webflow's native CSS variable system) for:
- Colors (primary, secondary, background)
- Typography (font families, sizes, weights)
- Spacing (margins, paddings)
- Brand specifics (border radius, shadows)

Variable rules:
- Title Case with words separated by spaces
- Variable Modes used for responsive values
- Organized into purposeful groups
- Ramps ordered light-to-dark or small-to-large

This is mostly Designer-only. Flag accordingly.

## Combo Class Limit (stricter)

Old guidelines: max 2 levels deep.
New guidelines: max 3-4 levels.

The relevant check is whether **stacking is consistent and disciplined**, not the absolute number. Flag combo class chains beyond 4 as a likely issue.

## Localization

**Do not use localization on new templates.** If localization is enabled, fail the submission.

Verification: check for `<link rel="alternate" hreflang="...">` tags or locale switchers in the UI.
