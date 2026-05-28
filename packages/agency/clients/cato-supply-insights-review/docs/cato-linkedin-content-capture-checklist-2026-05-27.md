# Cato LinkedIn Content Capture Checklist

Date: 2026-05-27

Goal: keep the Insights content source of truth in the Webflow CMS. Code component fallback data should remain preview/demo support only, not production copy.

## Current Status

Full LinkedIn source body is now in CMS and published for:

- `gowns-drapes-disruption`
- `bair-hugger-backorders`
- `iv-sets-allocation`
- `stryker-cyberattack`
- `avagard-shortage`
- `nbr-medical-supplies`
- `capstone-partnership`
- `neurosponges-disruption`
- `nasal-oral-ett-backorders`
- `vascular-angiographic-dialysis-kits-shortages`

Remaining LinkedIn captures needed:

None. All 10 requested LinkedIn-backed Insights records have full source content in CMS and have been published.

## Capture Format

For each remaining post, capture:

- `slug`
- `cms_item_id`
- `source_url`
- `source_body`
- `source_comment_url`, if the Risk Radar or reference link is in a LinkedIn comment
- `media_url`, if an image or video should be represented in the CMS

Plain text from the LinkedIn post is enough. HTML from the LinkedIn DOM is also acceptable because it can be cleaned before import.

## CMS Mapping

Use the existing Insights CMS items and update fields directly:

| CMS field | Source |
| --- | --- |
| `short-summary` | One concise summary from the source post |
| `main-content` | Clean rich text HTML derived from the LinkedIn source body |
| `key-takeaways` | Three CMS-backed bullets derived from the source body |
| `external-url` | Original LinkedIn post URL |
| `cta-label` | Existing CTA copy unless the source post needs a more specific action |
| `featured-image` | Optional, only if a usable source image is available |

Recommended `main-content` structure:

```html
<h3>Alert context</h3>
<p>...</p>
<h3>Supply Gap Analysis</h3>
<p>...</p>
<h3>What health systems can do now</h3>
<ol>...</ol>
```

Use `<h3>` for CMS body section headings unless the Webflow Rich Text Block has a scoped class with nested `h2` styles. This avoids the site-wide `All H2 Headings` selector from oversizing section titles inside Insight body content.

Keep each idea in its own `<p>` and let the Rich Text class handle rhythm. Do not use empty paragraphs or repeated `<br>` tags for spacing; the intended body rhythm is roughly `1.65` line height with about `1.1rem` of paragraph bottom margin.

Do not append a source-link or `Original post` section to `main-content`. Store the source URL in `external-url` so attribution can be handled by the template or CTA layer instead of the article body.

For Newsroom items, replace the alert headings with editorial headings that match the post.

## Production Rule

The production Webflow pages should read content from CMS fields:

- Hub/archive cards: CMS item data or a CMS-derived JSON prop.
- Detail pages: bound CMS fields for title, summary, resource type, publish date, main content, key takeaways, audience, and archive.

If a code component renders fallback content while a CMS field is empty, treat that as a staging signal to bind or import the missing CMS field before publish.
