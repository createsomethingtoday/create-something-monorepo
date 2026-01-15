---
name: doc-generator
description: Generate documentation from screenshots by embedding live UI components
category: content-generation
triggers:
  - "/doc-generator"
  - "screenshot documentation"
  - "admin guide"
related:
  - voice-validator
composable: false
priority: P2
---

# Doc Generator Skill

Generate documentation from screenshots by embedding live UI components. Screenshots capture intent; components deliver truth.

## Philosophy

**Images aren't the best way to view web components on the web. Web components are.**

When documenting a web UI:
- Screenshots show what exists (intent capture)
- Components ARE the documentation (always current, interactive)

The creator disappears; only the creation remains.

## Usage

**Basic:**
```
/doc-generator "F→N Admin Guide" ~/Screenshots/*.png
```

**With output directory:**
```
/doc-generator "Admin Guide" --output=./docs ~/Screenshots/*.png
```

**With component source:**
```
/doc-generator "Admin Guide" --component-source=packages/fn-app/src/lib/components/ ~/Screenshots/*.png
```

## How It Works

```
Screenshots → Claude (identify components) → Markdown with component embeds
```

1. **User provides** screenshots and a title
2. **Claude analyzes** each screenshot, identifies UI components
3. **Output** generates markdown with Svelte component embeds
4. **Fallback** to description if component can't be embedded

## Agent Analysis Prompt

When analyzing screenshots:

```
Analyze this screenshot to identify embeddable components.

Context: {title}

For each distinct UI element:
1. Identify the likely component name (e.g., FirefliesConnectCard)
2. Determine its current state (expanded, collapsed, error, success)
3. Note any props visible from the UI state

Return JSON:
{
  "pageTitle": "Dashboard - Connect Services",
  "userFlowStep": 1,
  "components": [
    {
      "name": "FirefliesConnectCard",
      "state": "expanded",
      "props": {"state": "expanded", "connected": false},
      "description": "API key input form for Fireflies connection"
    }
  ],
  "narrative": "The dashboard guides users through connecting their services."
}
```

## Output Format

### Component-Driven (Default)

```markdown
# Admin Guide

## 1. Dashboard Overview

<DashboardLayout docMode="static">
  <FirefliesConnectCard state="disconnected" docMode="static" />
  <NotionConnectCard state="disconnected" docMode="static" />
</DashboardLayout>

The dashboard shows your service connection status. Both services start disconnected.

## 2. Connect Fireflies

<FirefliesConnectCard state="expanded" docMode="static" />

1. Click "Connect Fireflies"
2. Enter your API key from fireflies.ai
3. Click "Connect"
```

### Fallback (No Component Available)

When a component can't be embedded (third-party UI, complex state):

```markdown
## Settings Page

The settings page shows account information, subscription status, and connected accounts.

**Sections:**
- Account: Email and sign out
- Subscription: Current plan and usage
- Connected Accounts: Status of integrations
- Danger Zone: Account deletion
```

## Component docMode Convention

Components should support a `docMode` prop:

```svelte
<script lang="ts">
  interface Props {
    docMode?: 'interactive' | 'static' | 'demo';
  }
  let { docMode = 'interactive' }: Props = $props();
</script>
```

| Mode | Behavior |
|------|----------|
| `interactive` | Full functionality (tutorials) |
| `static` | Displays but doesn't accept input (reference docs) |
| `demo` | Pre-filled with example data |

## CLI Options

| Flag | Description |
|------|-------------|
| `--output`, `-o` | Output directory (default: `./docs`) |
| `--component-source` | Path to component library |
| `--dry-run`, `-n` | Analyze only, show what would be generated |

## Component Source Discovery

The agent looks for components in:

1. **Explicit path**: `--component-source=path/`
2. **Conventional paths**: `src/lib/components/`, `src/components/`
3. **Package exports**: Check `package.json` exports

## Example Session

```
User: /doc-generator "F→N Admin Guide" ~/Screenshots/fn-*.png

Claude: Found 8 screenshots. Analyzing...

Screenshot 1: Dashboard
  Components: DashboardLayout, FirefliesConnectCard, NotionConnectCard

Screenshot 2: Fireflies API Input
  Components: FirefliesConnectCard (expanded)

Screenshot 3: History
  Components: SyncHistoryList (empty state)

...

Generating documentation...

Created: ./docs/fn-admin-guide.md

Done! Components embedded where available.
```

## When to Use

| Scenario | Approach |
|----------|----------|
| Documenting your own UI | Component embeds |
| Documenting third-party tools | Description-based fallback |
| Interactive tutorials | Components with `docMode="interactive"` |
| Reference documentation | Components with `docMode="static"` |

## Philosophy: Zuhandenheit

**The documentation tool should recede.**

- User provides screenshots (intent capture)
- Claude identifies components
- Output embeds live components
- Only the documentation remains

No image processing. No annotation. No manual cropping.
**Weniger, aber besser.**
