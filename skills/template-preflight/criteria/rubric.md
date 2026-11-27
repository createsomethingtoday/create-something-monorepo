# Grading Rubric — Self-Assessment Guide

Source: https://webflow.com/templates/grading-rubric

Three tiers per dimension. **Passing = "Good" on every dimension.** Submissions in the "Satisfactory" range are eligible for feedback and revision; failing to fully reach "Good" after 2 rounds of feedback may result in rejection.

When self-assessing, be pessimistic: reviewers judge against current marketplace quality, and "it works" is Satisfactory, not Good. For each dimension, record the tier and the evidence (page, section, behavior).

## Design criteria

### Overall user experience

| Tier | Standard |
|------|----------|
| Satisfactory | UX serves its purpose despite lacking some visual best practices. Usable but not 100% intuitive. May feel a bit dated, not adhering to modern trends. |
| Good | Better-than-average UX. Lures the user in aesthetically; free of elements that confuse, strain, or distract. Strong command of visual design best practices. Feels on-trend. |
| Exceptional | Purely delightful. An innovative "wow factor" or two without confusion. Mastery of visual best practices; original, potential to set trends. |

**Self-check**: Would a stranger navigate this without thinking? Does anything strain or distract?

### Graphic design

| Tier | Standard |
|------|----------|
| Satisfactory | Visuals may lack originality, technical quality (low-res), or branding consistency; can be distracting or confusing at times. |
| Good | High-quality, relevant, aesthetically pleasing, strategically placed. Cohesive branding. Adds both aesthetic and informational value. Room for improvement on 1–2 visual design principles. |
| Exceptional | High-quality, innovative, stunning visuals. Mastery of visual design principles. |

**Self-check**: Any low-res, generic-stock, or dated imagery? Is the branding stylistically consistent while still varied? Does every text/background pairing pass WCAG contrast, including muted labels, placeholders, and text over images? (One failing pairing used sitewide is the most common accessibility note.)

### Typography

| Tier | Standard |
|------|----------|
| Satisfactory | Legible/readable but hierarchy needs work; falls short of some submission guidelines. |
| Good | Legible/readable, good hierarchy, meets submission guidelines (with room for improvement). |
| Exceptional | Hierarchy implemented perfectly; meets all submission guidelines. |

**Self-check**: Tag-level base styles set? Responsive sizes at every breakpoint? Percentage line-heights? Clear size/weight ladder H1→H6?

### Interaction design

| Tier | Standard |
|------|----------|
| Satisfactory | Interactions serve a purpose but are superfluous in places; sometimes distract more than engage; occasional cognitive overload or non-standard behavior. |
| Good | Interactions direct the user and promote information processing — they reduce cognitive load rather than add to it. |
| Exceptional | Interactions treated as brand attributes with personality and a pleasant cadence, while still reducing cognitive load. |

**Self-check**: Does every animation help the user understand something, or is it decoration? Anything that moves without purpose is a Satisfactory signal.

## Layout and structure

### Hierarchy

| Tier | Standard |
|------|----------|
| Satisfactory | Processing information takes some effort; several elements' placement/composition could improve visual hierarchy. Content aligns with the primary tag; IA makes sense. |
| Good | Processing information feels easy; clear intention behind the information architecture. |
| Exceptional | Empathizes with the end user; processing feels effortless, even fun. Visual hierarchy impeccable. |

### Layout design quality

| Tier | Standard |
|------|----------|
| Satisfactory | Nearly all layout requirements implemented; may appear crammed/cluttered; Gestalt principles lacking in glaring ways. |
| Good | All layout requirements implemented; good page-to-page variety; consistent spacing; not crammed; adheres to Gestalt principles. |

**Self-check**: Put the inner pages next to the homepage. Do they reuse the same section stack with only the copy changed? "Repetitive layouts, many pages use the same or very similar structures" is the most common reason a template is held at Satisfactory on this dimension. Does the design read as generic within its category (default SaaS/agency patterns), or does it have a point of view?
| Exceptional | Everything functional and as-expected; layout demonstrates mastery of Gestalt principles. |

### Responsive design

| Tier | Standard |
|------|----------|
| Satisfactory | Fully responsive with a minimal number of bugs across screen sizes. |
| Good | Fully responsive with **no more than 2 bugs**. |
| Exceptional | Fully responsive with **no bugs** or visual hierarchy issues. |

**Self-check**: sweep desktop / tablet / mobile landscape / mobile portrait on every page. Count actual bugs — text overflow, horizontal scroll, broken grids, unreadable sizes.

## Functionality criteria

### Conversion best practices

| Tier | Standard |
|------|----------|
| Satisfactory | Action items (CTAs, carts, forms) not immediately obvious, though findable with minimal effort. |
| Good | Easy to convert without digging. CTAs ubiquitous, in high-traffic locations (nav, homepage hero), stand out, repeat appropriately. |
| Exceptional | Expert conversion-centered design: user journey designed around the goal; intentional spaces for credibility, objection handling, social proof, ease-of-use, and results. |

### Site optimization (PageSpeed Insights)

Run https://pagespeed.web.dev/ on the main pages.

| Tier | SEO | Performance | Best Practices |
|------|-----|-------------|----------------|
| Satisfactory | 51–70 | 51–70 | 51–70 |
| Good | 70–90 | 51–70 | 51–70 |
| Exceptional | 90–100 | 70–90 | 70–90 |

### Accessibility

| Tier | Standard |
|------|----------|
| Satisfactory | PageSpeed Accessibility score 51–70 |
| Good | PageSpeed Accessibility score 70–90 |
| Exceptional | 90–100 plus: high legibility, passing contrast ratios, unique meaningful button/link names, near-total adherence to the Webflow accessibility checklist |

## What reviewers most often ask creators to fix

These are the most common design notes in recent review feedback. Fixing them before you submit is the fastest way from Satisfactory to Good.

| Dimension | Common notes |
|-----------|--------------|
| Graphic design | Imagery not cohesive (mixed styles, crops, color tones); pixelated or blurry graphics; human cutouts; real brand logos instead of fake ones; repetitive graphics |
| Typography | Text too small (mobile minimum 16px); line height too tight or too loose; letter spacing too tight; a dated display font; one font for headings and body with no hierarchy; all-caps long text; manual line breaks instead of responsive wrapping |
| Layout design quality | The same layout repeated page to page; inner pages only repeat homepage sections; default/common patterns with no distinct structure; uneven spacing; too much or too little white space |
| Hierarchy | Too many elements competing for attention; hero content cut off below the fold |
| Responsive design | Everything stacks into one column on mobile — use two-column layouts, carousels, and resized sections; elements cut off or overlapping; horizontal scroll with no indicator |
| Interaction design | Hover effects that do not work on touch screens; the same animation repeated everywhere; too few interactions in crowded categories (portfolio, agency) |
| Accessibility | Low contrast, often text over images — add a light overlay so text stays readable when buyers swap the image; missing alt text; skipped heading levels |
| Site optimization | Images without width and height; no lazy loading below the fold; browser console errors; unused classes |

## Reference examples

Webflow's cited accepted-quality examples (linked from the rubric page): **Juniper** (single page), **Brick** (multi page), **Atlantic** (multi layout), **Wave Studio** (ecommerce). Compare against these, not against the template in isolation.
