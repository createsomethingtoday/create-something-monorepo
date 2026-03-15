# Similarity Location Map: brightedge-pro vs boono

Compared URLs:
- https://brightedge-pro.webflow.io/
- https://boono.webflow.io/

## 1) Global Navigation
- Brightedge selector: `.navbar.w-nav`
- Boono selector: `.navbar._01.w-nav` (same core class family)
- Evidence:
  - Shared class tokens: `navbar`, `w-nav`, `w-nav-brand`, `toggle-button`, `w-inline-block`, `w--current`
  - Shared nav labels: `Home`, `About`, `Services`, `Pricing`, `Contact`, `Style Guide`, `Changelog`
- Visual crop refs:
  - `visual-crops/brightedge_nav.png`
  - `visual-crops/boono_nav.png`
  - `visual-crops/side_by_side_nav.png`

## 2) Hero Region
- Brightedge selector: `.hero-section`
- Boono selector: `.section.hero`
- Evidence:
  - Shared class token: `hero-heading`
  - Shared media primitives: `w-background-video`, `w-background-video-atom`
- Visual crop refs:
  - `visual-crops/brightedge_hero.png`
  - `visual-crops/boono_hero.png`
  - `visual-crops/side_by_side_hero.png`

## 3) FAQ/Accordion Region
- Brightedge selector: `.faq-section`
- Boono selector: `section.faq`
- Evidence:
  - Shared FAQ class token: `faq-title`
  - Shared Webflow accordion primitives: `w-dropdown`, `w-dropdown-toggle`, `w-dropdown-list`
  - Near-matching FAQ-title density: brightedge=11, boono=10
- Visual crop refs:
  - `visual-crops/brightedge_faq.png`
  - `visual-crops/boono_faq.png`
  - `visual-crops/side_by_side_faq.png`

## 4) CMS/Repeater Blocks
- Brightedge patterns: `pricing-collection-list w-dyn-list`, `blog-collection-list-wrap w-dyn-list`
- Boono pattern: `w-dyn-list`
- Evidence:
  - Shared CMS classes: `w-dyn-list`, `w-dyn-items`, `w-dyn-item`
- Interpretation:
  - Similarity is concentrated in Webflow CMS list/repeater structure.

## 5) Footer/Social Region
- Brightedge patterns: `footer-section`, `footer-bottom-left`, `footer-nav-link`
- Boono patterns: `footer`, `footer-socials-link w-inline-block`
- Evidence:
  - Shared class tokens: `footer-bottom-left`, `social-icon`, `w-inline-block`

## 6) Runtime/Platform Layer (site-wide)
- Shared script/runtime markers:
  - `jquery-3.5.1...`
  - `webflow.RUNTIME.js`
  - `webfont.js`
- Shared normalized style source pattern:
  - `.../css/TEMPLATE.webflow.shared.css`
- Interpretation:
  - A large part of similarity is platform-common Webflow runtime/CSS baseline.

## Non-location finding (important)
- Shared `data-w-id` values: **0**
- Interpretation:
  - No direct proof of interaction-ID copy/paste.
