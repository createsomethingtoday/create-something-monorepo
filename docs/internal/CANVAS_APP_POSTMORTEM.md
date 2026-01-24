# Canvas App Postmortem

**Date**: 2026-01-23  
**Status**: Deleted - over-engineered, unreliable

## What We Built

A Tauri desktop app attempting to:
1. Auto-detect projects on filesystem
2. Discover components within projects
3. Parse Svelte/JSX and render as HTML
4. Apply scoped CSS with animations

## What Worked

- **Tauri setup**: Clean Rust backend with Svelte frontend
- **Project discovery**: Scanning filesystem for projects by framework markers
- **Component categorization**: Detecting Navigation, Cards, Heroes, etc. from names
- **CSS detection**: Finding Tailwind/Canon/custom tokens

## What Failed

### Core Problem: Static Parsing ≠ Real Rendering

We tried to render Svelte components by:
1. Stripping `<script>` and `<style>` blocks
2. Cleaning Svelte syntax (`{#if}`, `{#each}`, `{variable}`)
3. Parsing HTML and rendering with scoped CSS

This fundamentally cannot work because:
- **Svelte expressions need evaluation**: `{name}` requires runtime
- **Conditionals need state**: `{#if connected}` needs actual value
- **Loops need data**: `{#each items}` needs the array
- **Components need compilation**: `<Button>` needs Svelte compiler

### Over-Engineering

We added too many features too fast:
- Project discovery before basic rendering worked
- Component categorization before CSS applied
- Animations before static render was correct

## Recommended Fresh Start

### Option A: Iframe + Vite HMR (Recommended for real components)

```
┌─────────────────────────────────────┐
│ Canvas App (Tauri)                  │
│  ┌───────────────────────────────┐  │
│  │ iframe src="localhost:5173"  │  │
│  │ (Actual Vite dev server)     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- Embed an iframe pointing to the project's actual Vite dev server
- Real HMR, real CSS, real Svelte
- Agent edits files → Vite hot reloads → iframe shows result

### Option B: Pure HTML/CSS Artifacts (Original intent)

Focus on what works: pure HTML/CSS that doesn't need compilation.

```typescript
// Artifact is pure HTML/CSS, not Svelte
const artifact = {
  html: '<div class="card">...</div>',
  css: '.card { background: #111; }'
};
```

- AI generates/edits pure HTML/CSS
- Canvas renders directly (no parsing needed)
- "Promote" converts artifact to actual Svelte component

### Option C: Svelte REPL-style (Compile on the fly)

Use Svelte's browser compiler:

```typescript
import { compile } from 'svelte/compiler';

const result = compile(source, { generate: 'dom' });
// Execute compiled code in sandboxed iframe
```

More complex but gives real Svelte rendering.

## Files That Were Useful

If restarting, these patterns from the deleted code were solid:

### CSS Detection (Rust)
```rust
// Check tailwind.config.js, tokens.css, package.json deps
// Check monorepo siblings for shared tokens
```

### Project Discovery (Rust)
```rust
// Scan ~/Documents, ~/Projects, ~/Code
// Detect framework by config files
// Count components, sort by last modified
```

### Component Categorization (Rust)
```rust
// Name patterns: Nav*, *Card*, *Hero*, *Form*
// Content patterns: <form>, role="dialog"
```

## Key Lesson

**Start simple, verify each layer works before adding the next.**

The correct order would have been:
1. Render pure HTML/CSS ✓
2. Apply CSS correctly ✓ 
3. Handle Tailwind ✓
4. THEN add project discovery
5. THEN add component browsing

We jumped to steps 4-5 before 2-3 were solid.

## Related Files

- `packages/ui-diff/` - Rust AST diffing (still exists, useful)
- `packages/ui-bridge/` - Bun WebSocket server (still exists)
- `packages/ui-viewer/` - SvelteKit canvas route (still exists)

The existing ui-bridge + ui-viewer setup with pure HTML/CSS artifacts actually works. The Tauri app was an attempt to make it standalone but added too much complexity.
