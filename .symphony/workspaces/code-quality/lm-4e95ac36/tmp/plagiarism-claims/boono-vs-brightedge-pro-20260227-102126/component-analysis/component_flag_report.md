# Component-Level Flag Report

## Scope
Compared:
- `https://brightedge-pro.webflow.io/`
- `https://boono.webflow.io/`

Using raw HTML extraction plus normalized script/style fingerprinting.

## What Was Flagged

### 1. Navigation component family
Evidence:
- Shared class tokens: `navbar`, `w-nav`, `w-nav-brand`, `toggle-button`, `w-inline-block`, `w--current`
- Shared nav labels: `Home`, `About`, `Services`, `Pricing`, `Contact`, `Style Guide`, `Changelog`

Interpretation:
- Both templates use very similar Webflow nav architecture and menu/link structure.

### 2. Hero component family
Evidence:
- Shared class token: `hero-heading`
- Shared media primitives: `w-background-video`, `w-background-video-atom`

Interpretation:
- Both use hero sections with background-video based presentation and heading-driven layout.

### 3. FAQ accordion component family
Evidence:
- Shared class token: `faq-title`
- Shared Webflow interaction primitives: `w-dropdown`, `w-dropdown-toggle`, `w-dropdown-list`
- Counts are near-identical (`faq-title`: brightedge=11, boono=10)

Interpretation:
- Both implement FAQs with near-identical dropdown/accordion composition patterns.

### 4. CMS/repeater component family
Evidence:
- Shared class tokens: `w-dyn-list`, `w-dyn-items`, `w-dyn-item`

Interpretation:
- Both include CMS-driven repeated content blocks (blog/pricing/cards style structures).

### 5. Footer/social component family
Evidence:
- Shared class tokens: `footer-bottom-left`, `social-icon`

Interpretation:
- Similar lower-page composition with social/link blocks and copyright/subfooter treatment.

## What Was NOT Flagged as Direct Copy

### No direct interaction ID reuse
- Shared `data-w-id` values: **0**

Interpretation:
- This does **not** look like a straight copy-paste of Webflow interaction IDs.
- Similarity appears to be pattern/structure-level rather than literal interaction-ID duplication.

## Important signal-quality caveat
High pairwise vector scores are heavily influenced by platform-common assets.

Shared normalized runtime assets include:
- `jquery-3.5.1.min.dc5e7f18c8.js`
- `webflow.RUNTIME.js` (normalized)
- `webfont.js`
- `TEMPLATE.webflow.shared.css` (normalized)

This means high JS/CSS scores can partially reflect shared Webflow runtime conventions, not only unique design copying.

## Bottom line
The strongest concrete flags are at the **component pattern level**:
- Nav architecture
- Hero composition
- FAQ accordion implementation
- CMS block structure
- Footer/social layout conventions

But there is no direct shared `data-w-id` proof of literal interaction copy-paste.
