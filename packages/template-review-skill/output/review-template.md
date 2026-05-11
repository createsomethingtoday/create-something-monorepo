# Report Template

Use this exact structure for the review output. Don't add sections; don't rearrange.

---

# Template Review: {Template Name}

**URL:** {published URL}
**Version ID:** {version_id if MCP context provided, else "N/A"}
**Reviewer:** {agent identity, e.g. "claude-sonnet-4-6 via template-review skill"}
**Date:** {YYYY-MM-DD}

## Verdict

One of:
- **Pass** — meets "Good" on every rubric dimension and has zero unresolved hard requirements
- **Revise** — meets "Satisfactory" on the rubric but has hard-requirement failures the designer can fix, OR sits at "Satisfactory" on rubric items that are revision-eligible
- **Reject** — falls below "Satisfactory" on one or more rubric dimensions, OR has hard-requirement failures that aren't easily fixable

One-sentence justification.

## Hard requirement failures

List every requirement that failed. Skip those that passed — the absence of an item means pass.

Format each as:
```
- [Category] {Requirement} — {Specific evidence with page URL or selector}
```

Example:
```
- [Required Pages] /licenses page missing — fetched https://aurae-temlis.webflow.io/licenses, got 404
- [Footer] "Powered by Webflow" link missing — footer on home page contains no link to webflow.com
- [SEO] Home page title doesn't match required format — current: "Aurae | Cosmetics Brand", expected: "Aurae - Webflow HTML website template"
```

If zero failures: write "None."

## Rubric assessment

| Dimension | Tier | Evidence |
|-----------|------|----------|
| Overall UX | Good / Satisfactory / Exceptional / UNVERIFIABLE | {1-2 sentence cite} |
| Graphic Design | … | … |
| Typography | … | … |
| Interaction Design | … | … |
| Hierarchy | … | … |
| Layout Design Quality | … | … |
| Responsive Design | UNVERIFIABLE — needs visual review | {pages to test} |
| Conversion Best Practices | … | … |
| Site Optimization — SEO | UNVERIFIABLE — run pagespeed | https://pagespeed.web.dev/?url=… |
| Site Optimization — Performance | UNVERIFIABLE | … |
| Site Optimization — Best Practices | UNVERIFIABLE | … |
| Accessibility | UNVERIFIABLE | … |

## Punch list

Numbered, ordered by severity (blockers first, polish last). Each item is one specific actionable change.

Format each as:
```
N. [Page or location] {What to change} — {Why it matters / rule reference}
```

Example:
```
1. [Footer, all pages] Add "Powered by Webflow" link pointing to webflow.com — required by submission guidelines
2. [/services hero] Change `height: 100vh` to `min-height: 100vh` — submission guidelines require min-height on hero sections to avoid content clipping
3. [Home page H1] Replace "Lorem ipsum dolor sit amet" with relevant headline copy — lorem ipsum is not allowed in headings
4. [Product cards on /shop] Add alt text to product images — currently missing on 8 of 12 images
```

Aim for ≤ 15 items in the punch list. If there are more than 15 failures, the template likely belongs in Reject — list the top 15 most blocking and note "and N additional issues."

## Designer-side checks required

Items the human reviewer must verify in the Designer (you couldn't check from the published site):

```
- Class reuse and unused styles
- Form Notifications settings (must be empty)
- Ecommerce setup state (if applicable)
- ...
```

## Manual / visual checks required

Items requiring rendered visual inspection:

```
- Mobile responsiveness at 320px, 768px, 1024px (test all pages)
- 400% zoom behavior on home, /services, /contact
- Interaction quality: mobile menu, scroll reveals, hover states
- Background video pause/skip controls if present
```

## PageSpeed (must be run)

```
https://pagespeed.web.dev/?url={template-url}

Need ≥70 SEO, ≥51 Performance, ≥51 Best Practices, ≥70 Accessibility
on BOTH mobile and desktop to pass at "Good" tier.
```

## Suggested feedback for designer

If verdict is "Revise", end with a single paragraph suitable for sharing with the designer. Tone: specific, not preachy. Lead with what works, then list what to fix.

If verdict is "Reject" or "Pass", skip this section.

Example:
```
The visual direction on Aurae is consistent and the typography hierarchy
holds up well across pages. To get this to "Good" for marketplace acceptance,
focus on three things: (1) add the required /licenses page with the standard
licensing copy and link it from the footer, (2) replace the placeholder
headings on /about and /services with relevant copy — lorem ipsum isn't
allowed in headings, and (3) fix the hero on /services where the section
clips content on longer copy (switch to min-height). Once those are in,
re-submit for another pass.
```
