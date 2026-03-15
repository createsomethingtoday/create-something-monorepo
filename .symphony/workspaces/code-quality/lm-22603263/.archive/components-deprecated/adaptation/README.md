# Adaptation Guides

How to implement CREATE SOMETHING design principles in any framework.

## Philosophy

The value isn't in the Svelte components—it's in the **tokens** and **patterns**. These guides show how to apply the same principles in other frameworks.

## What Transfers (Universal)

```
tokens/
├── colors.ts      → CSS custom properties (works anywhere)
├── typography.ts  → CSS custom properties + clamp() values
├── spacing.ts     → Golden ratio values
├── shadows.ts     → Box-shadow values
├── animation.ts   → Timing and easing values
└── breakpoints.ts → Media query values
```

Import the tokens, generate CSS, use in any framework.

## What Adapts (Framework-Specific)

The patterns (navigation, forms, content, layout, interaction) describe **what to build and why**. The implementation changes per framework, but the principles don't.

## Guides

- [React Adaptation](./react.md) - React + TypeScript implementation
- [Vue Adaptation](./vue.md) - Vue 3 + Composition API implementation
- [Vanilla Adaptation](./vanilla.md) - Plain HTML/CSS/JS implementation

## Quick Start: Using Tokens

### Option 1: CSS Custom Properties

Generate the complete CSS:

```typescript
import { generateAllTokensCSS } from '@create-something/components';

const css = await generateAllTokensCSS();
// Inject into <style> or write to file
```

### Option 2: JavaScript Values

Import tokens directly:

```typescript
import { colors, typography, spacing } from '@create-something/components';

// Use in CSS-in-JS or inline styles
const style = {
  color: colors.foreground.primary,
  fontSize: typography.scale.h1,
  padding: spacing.md
};
```

### Option 3: JSON Export

For build tools that need JSON:

```typescript
import { tokens } from '@create-something/components';

// Complete token object
console.log(JSON.stringify(tokens, null, 2));
```

## The Subtractive Triad (Applied to Adaptation)

When adapting to a new framework, ask:

1. **DRY**: Can I use the tokens directly, or am I duplicating?
2. **Rams**: Does this component earn its existence in this project?
3. **Heidegger**: Does this serve the whole system?

Don't port everything. Port what's needed.
