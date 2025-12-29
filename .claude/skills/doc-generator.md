# Doc Generator Skill

AI-powered documentation from screenshots. Describe your app, Claude analyzes UI, generates docs with annotated images.

## Usage

**Basic:**
```
/doc-generator "F→N Admin Guide" ~/Screenshots/*.png
```

**With output directory:**
```
/doc-generator "Admin Guide" --output=./docs ~/Screenshots/*.png
```

**With web animations (for motion demos):**
```
/doc-generator "Onboarding Flow" --animate ~/Screenshots/*.png
```

## How It Works

```
Screenshots → Claude (analyze UI) → Sharp (crop/highlight) → Markdown + Images
```

1. **User provides** screenshots and a title
2. **Claude analyzes** each screenshot for UI elements, user flow steps, and important areas
3. **Sharp generates** cropped/zoomed/highlighted images
4. **Markdown output** creates structured documentation with embedded images
5. **Optional**: HTML with CSS animations for motion demos

No manual annotation. Just screenshots and a title.

## Agent Prompt Template

When analyzing screenshots for documentation:

```
Analyze this screenshot for documentation purposes.

Context: {title} - {description if provided}

Identify:
1. Key UI elements (buttons, forms, inputs, status indicators)
2. The user flow step this represents
3. Important areas to highlight or zoom

Return JSON:
{
  "pageTitle": "Dashboard - Connect Services",
  "description": "Main dashboard showing service connection status",
  "userFlowStep": 1,
  "elements": [
    {
      "x": 0.1,
      "y": 0.2,
      "width": 0.3,
      "height": 0.15,
      "label": "Fireflies Connection Card",
      "description": "Click to enter your Fireflies API key",
      "importance": "primary",
      "action": "Click 'Connect Fireflies' to begin"
    }
  ],
  "nextAction": "Connect your Fireflies account to proceed",
  "docSection": "Getting Started"
}
```

## Output Structure

```
docs/
├── admin-guide.md           # Main documentation
├── admin-guide.html         # Optional: with CSS animations
└── images/
    ├── 01-dashboard.png         # Full screenshot (renamed)
    ├── 01-dashboard-annotated.png # With highlight overlays
    ├── 01-zoom-connect-btn.png  # Cropped important areas
    └── ...
```

## Generated Markdown Format

```markdown
# Admin Guide

## 1. Dashboard Overview

![Dashboard](./images/01-dashboard.png)

The dashboard shows your service connection status.

### Connect Fireflies

![Connect Button Detail](./images/01-zoom-connect-btn.png)

1. Click "Connect Fireflies"
2. Enter your API key
3. Click "Connect"

---

## 2. Settings

![Settings Page](./images/02-settings.png)
...
```

## CLI Options

| Flag | Description |
|------|-------------|
| `--output`, `-o` | Output directory (default: `./docs`) |
| `--animate`, `-a` | Generate HTML with CSS animations for flow demos |
| `--dry-run`, `-n` | Analyze only, show what would be generated |
| `--skip-crops` | Don't generate cropped/zoomed images |
| `--template` | Custom markdown template file |

## Web Animations (--animate)

When `--animate` is enabled, generates HTML with CSS animations to show:
- Click target highlights (pulsing borders)
- Scroll indicators
- Form fill sequences
- State transitions between screenshots

Uses CSS-only animations - no JavaScript, no video production needed.

```html
<div class="step" data-step="1">
  <img src="./images/01-dashboard.png" />
  <div class="highlight pulse" style="left: 10%; top: 20%; width: 30%;">
    Click here
  </div>
</div>
```

## Example Session

```
User: /doc-generator "F→N Admin Guide" ~/Screenshots/fn-*.png

Claude: Found 8 screenshots. Analyzing...

Screenshot 1: Dashboard - Connect Services
  - Fireflies card (primary)
  - Notion card (primary)
  - Status message (secondary)

Screenshot 2: Fireflies API Key Input
  - API key field (primary)
  - Connect button (primary)
  - Help link (secondary)

...

Generating documentation...

Created:
  ./docs/f-n-admin-guide.md (163 lines)
  ./docs/images/ (24 images)
    - 8 full screenshots
    - 8 annotated versions
    - 8 cropped highlights

Done! Open ./docs/f-n-admin-guide.md to review.
```

## Files

- `packages/render-pipeline/src/docs/types.ts` - TypeScript types
- `packages/render-pipeline/src/docs/analyze.ts` - Analysis prompt/parsing
- `packages/render-pipeline/src/docs/crop.ts` - Sharp cropping
- `packages/render-pipeline/src/docs/highlight.ts` - Overlay drawing
- `packages/render-pipeline/src/docs/generate.ts` - Markdown/HTML output
- `packages/render-pipeline/src/docs/index.ts` - Pipeline orchestration
- `packages/render-pipeline/src/bin/generate-docs.ts` - CLI

## Requirements

- Screenshots accessible via filesystem
- Sharp (bundled with render-pipeline)
- Claude Code with vision capabilities

## Philosophy: Zuhandenheit

**The documentation tool should recede.**

- User provides screenshots
- Claude understands context
- Tool generates docs
- Only the documentation remains

No manual annotation, no template editing, no image cropping by hand.
**Weniger, aber besser.**
