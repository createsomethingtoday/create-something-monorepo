# Canon Design System - Figma Integration

Sync design tokens between code and Figma using [Tokens Studio](https://tokens.studio/).

## Overview

```
tokens.css (Source of Truth)
     │
     ▼
pnpm tokens:export
     │
     ▼
tokens.figma.json
     │
     ▼
Tokens Studio Plugin → Figma Variables
```

## Quick Start

### 1. Install Tokens Studio

1. Open Figma
2. Go to **Plugins** → **Browse plugins in Community**
3. Search for "Tokens Studio"
4. Click **Install**

### 2. Import Canon Tokens

1. Open Tokens Studio plugin in Figma
2. Click **Settings** (gear icon)
3. Under "Token Storage", select **Local document**
4. Click **Import** → **From file**
5. Select `packages/components/src/lib/styles/tokens.figma.json`

### 3. Apply Tokens to Figma

1. In Tokens Studio, select the "core" token set
2. Click **Sync styles** to create Figma styles
3. Click **Sync variables** to create Figma variables (for Native Variables support)

## Token Sets

| Set | Description | Use Case |
|-----|-------------|----------|
| `core` | Default dark theme tokens | Base design work |
| `themes/light` | Light theme overrides | Light mode designs |
| `themes/high-contrast` | High contrast overrides | Accessibility designs |

### Applying Themes

In Tokens Studio:
1. Enable the `core` set
2. For light theme: also enable `themes/light`
3. For high contrast: also enable `themes/high-contrast`

Theme sets override core values for the same token paths.

## Sync Workflow

### Code → Figma (Most Common)

When CSS tokens change:

```bash
# 1. Regenerate Figma tokens
pnpm --filter=components tokens:export

# 2. Commit updated token files
git add packages/components/src/lib/styles/tokens.figma.json
git commit -m "chore(tokens): sync design tokens"

# 3. In Figma, re-import tokens.figma.json
```

### Figma → Code (Design Exploration)

When exploring new tokens in Figma:

1. Export tokens from Tokens Studio as JSON
2. Review changes with designer
3. Manually update `tokens.css` (source of truth)
4. Run `pnpm tokens:export` to regenerate all formats

**Note**: `tokens.css` is always the source of truth. Figma exports are for reference only.

## Token Types

Tokens Studio uses specific type mappings:

| CSS Token Prefix | Tokens Studio Type |
|------------------|-------------------|
| `color-*` | `color` |
| `text-*` | `fontSizes` |
| `font-sans/mono/serif` | `fontFamilies` |
| `font-light/regular/...` | `fontWeights` |
| `leading-*` | `lineHeights` |
| `tracking-*` | `letterSpacing` |
| `space-*` | `spacing` |
| `radius-*` | `borderRadius` |
| `shadow-*` | `boxShadow` |
| `duration-*` | `duration` |
| `opacity-*` | `opacity` |

## Figma Variables vs Styles

**Variables** (recommended for colors, spacing):
- Support mode switching (dark/light)
- Can be used in Auto Layout
- Native Figma feature

**Styles** (for shadows, typography):
- Support complex values
- Required for shadows with multiple layers
- Better for typography presets

Tokens Studio can create both. Use **Sync variables** for primitive values (colors, spacing) and **Sync styles** for composite values (shadows, typography).

## File Structure

```
packages/components/
├── figma/
│   ├── README.md                    # This file
│   └── tokens-studio.config.json    # Tokens Studio configuration
├── scripts/
│   └── generate-exports.mjs         # Token export generator
└── src/lib/styles/
    ├── tokens.css                   # Source of truth
    ├── tokens.figma.json            # Tokens Studio format
    ├── tokens.dtcg.json             # W3C DTCG format
    ├── tokens.scss                  # SCSS variables
    └── canon.json                   # Categorized format
```

## Remote Sync (Optional)

For team collaboration, configure remote storage:

### GitHub Sync

1. In Tokens Studio settings, select **GitHub** storage
2. Enter repository: `createsomethingtoday/create-something-monorepo`
3. File path: `packages/components/src/lib/styles/tokens.figma.json`
4. Branch: `main`
5. Generate a GitHub personal access token with `repo` scope

### JSONbin Sync

1. Create account at [jsonbin.io](https://jsonbin.io)
2. Create a new bin with your tokens
3. In `tokens-studio.config.json`, update:
   ```json
   "storageType": {
     "provider": "jsonbin",
     "id": "YOUR_BIN_ID",
     "secret": "YOUR_API_KEY"
   }
   ```

## Troubleshooting

### Tokens not appearing in Figma

1. Ensure correct token set is enabled
2. Click **Refresh** in Tokens Studio
3. Try re-importing the JSON file

### Colors look wrong

1. Check if rgba values are supported (some older formats need hex)
2. Verify the correct theme set is applied
3. Check for token reference errors in Tokens Studio

### Typography not applying

1. Ensure the font is installed in Figma
2. Check font family name matches exactly
3. Use **Sync styles** for typography (not just variables)

## Philosophy

**Single Source of Truth**: `tokens.css` defines all values. All other formats (Figma, SCSS, DTCG) are generated outputs. Never edit generated files directly.

**Weniger, aber besser**: Only tokens that earn their existence. No decorative variations, no unused semantic tokens.

**Tool Transparency**: The sync process should recede into use. Designers see tokens; engineers see CSS variables. The bridge is invisible.
