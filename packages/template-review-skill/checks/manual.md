# Manual / Judgment Checks

Things HTML alone can't decide. Use WebFetch to read structure and copy, then make a judgment grounded in evidence you can cite. If you can't justify a tier from what you observed, mark `UNVERIFIABLE — needs visual review` and explain.

## Visual design quality

Use WebFetch with a prompt that asks for:
- Hero section layout (centered? full-bleed? split?)
- Color palette (named colors, usage frequency)
- Typeface choice and pairing
- Image quality and originality (stock-feeling or custom-feeling)
- Density and white space
- Overall consistency between pages

From the returned summary, judge:

| Tier | Signals |
|------|---------|
| Satisfactory | Generic stock imagery, default-feeling typography, layouts that look familiar from 2018-era templates. Composition works but doesn't surprise. |
| Good | Coherent palette and type pairing. Imagery feels chosen, not picked. Layouts have rhythm between sections — not every section is "image left, text right." |
| Exceptional | Visual identity is specific and consistent across every page. Imagery and type feel curated. Layout choices feel intentional and serve the content. |

When in doubt, downgrade to Satisfactory and note what would lift it to Good.

## Typography hierarchy

From the fetched style guide page + at least one content page:

| Tier | Signals |
|------|---------|
| Satisfactory | All H tags styled, but H1/H2 only differ by ~10% in size. Hierarchy weak. |
| Good | Clear visual jumps between H1 → H2 → H3. Display font on H1 if applicable. Line height set in % or unitless. |
| Exceptional | Type system is a system — sizes follow a scale, line heights pair with sizes, weight contrast is used purposefully. |

Cite specific font sizes from the HTML or CSS where possible.

## Interaction design

Without rendered JS you can only assess interactions partially. What you can check:
- Is the cursor `pointer` on hover-targets?
- Do buttons and links have transition rules in CSS?
- Are there obvious interaction patterns in classes? (e.g. `is-active`, `is-open`, `interactions-*`)

What you can't check without rendering:
- Whether interactions actually feel good
- Whether interactions distract
- Preloader behavior

For the parts you can't judge: mark `UNVERIFIABLE — needs visual review` and list specific things to check (mobile menu open, scroll-triggered reveals, hover states on cards, form input focus).

## Layout quality

Things to judge from HTML structure:
- Section variety: are sections structurally different, or just the same `image+text` block repeated?
- Grid usage: does the site use varied grids, or default 2-column / 3-column everywhere?
- Whitespace: are sections padded consistently? (Inspect padding classes on section wrappers.)

| Tier | Signals |
|------|---------|
| Satisfactory | Most sections are the same shape (alternating image/text). Whitespace is OK but not strategic. |
| Good | Sections vary meaningfully. Whitespace is consistent across pages and breathing room is generous. |
| Exceptional | Each section earns its layout. The structure of the page itself helps the reader understand the content's priority. |

## Conversion design

From the homepage and one product/service page:
- Where is the primary CTA? (Above the fold? In nav? In footer?)
- Is there ONE clear conversion goal or many competing ones?
- Are CTAs distinguishable from secondary actions? (Color, size, weight)
- Does copy lead with value or features?

| Tier | Signals |
|------|---------|
| Satisfactory | CTAs exist and aren't broken, but they're not the first thing you'd notice. Copy is generic. |
| Good | The primary CTA is easy to find on every page. Copy speaks to the user, not the template's vertical in general. |
| Exceptional | Every section is in service of the conversion goal. Social proof, objection handling, ease-of-use signals all show up where they need to. |

Look at the comparison examples linked in the conversion best practices section of the submission guidelines.

## Responsive design

You can't test responsive behavior in a browser from the skill. What you CAN do:
- Read CSS class rules for breakpoint-specific overrides
- Check for `vw` / `vh` / `clamp()` usage in CSS (signals fluid design)
- Check that the body / viewport meta is set correctly

For actual responsive quality: mark `UNVERIFIABLE — needs visual review at desktop / tablet / mobile / 400% zoom`. List specific pages and sections the human should test.

## Hierarchy (cognitive load)

Read the homepage copy. Ask:
- Can I tell what the company / product / template subject is in 5 seconds?
- Is the visual hierarchy guiding my eye, or competing with itself?
- Are there too many "look at me" signals (multiple CTAs, multiple bold elements per section)?

| Tier | Signals |
|------|---------|
| Satisfactory | I can figure it out, but I'm scanning to find the answer. |
| Good | The first screen tells me what this is and what to do. Subsequent sections support, don't compete. |
| Exceptional | Every page guides the eye on rails. Reading the page feels effortless. |

## Content fit

Compare the rendered content to the claimed primary tag. For example:
- Agency template → does it have services, case studies, team, contact?
- Restaurant template → does it have menu, location, hours, reservations?
- SaaS template → does it have features, pricing, docs, onboarding?

If content patterns don't match the claimed tag: flag as content/tag mismatch and suggest a better tag or content additions.

## Inclusive content

Walk the copy and imagery for:
- People in imagery — represented diversity, no ableist/ageist tropes
- Language — no idioms that don't translate globally, no industry jargon that excludes
- No political party, religion, or culturally specific references unless the template's vertical requires it (e.g. a Church template)

Flag any item that's likely to cause concern for a global audience.

## Things you simply cannot check from the published site

Flag these as "Designer access required":

- Class re-use and unused styles
- Component structure
- CMS collection structure (only visible parts)
- Variable usage and naming
- Form Notifications settings
- Integration settings (API tokens, third-party)
- Site total weight
- CSS minification (partial — you can see if classes are minified in the served HTML)
- Ecommerce setup state (business address, shipping, tax, payment provider, hosting, checkout)
- Designer-side combo class depth

For these, the report should say "Designer-side verification required" and list each in the punch list so the human reviewer knows to open the Designer.
