# ui-viewer

Visual preview for UI components with animated transitions. The "Pencil for CLI" experience.

## Overview

When an AI agent edits a component file, the viewer shows elements pulsing into place in real-time. This provides the visual feedback loop that's missing from CLI-based development.

## Features

- **Animated transitions** — Elements pulse in on insert, fade on delete
- **FLIP animations** — Layout shifts animate smoothly
- **Tree visualization** — See component structure at a glance
- **Inspector panel** — Click elements to see their properties
- **Operation history** — Track all changes over time
- **Auto-reconnect** — Handles bridge disconnections gracefully

## Quick Start

```bash
# Start the viewer (port 4200)
pnpm dev

# In another terminal, start the bridge (port 4201)
cd ../ui-bridge && bun run dev
```

The viewer auto-connects to `ws://localhost:4201` on startup.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ui-viewer (this)                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Canvas.svelte                                           │   │
│  │  - Renders component tree                                │   │
│  │  - Animates with Svelte transitions                      │   │
│  │  - Pan & zoom controls                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Inspector.svelte                                        │   │
│  │  - Shows selected node details                           │   │
│  │  - Attributes, children                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  StatusBar.svelte                                        │   │
│  │  - Connection status                                     │   │
│  │  - Operation history                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Animations

The viewer uses Svelte's built-in animation primitives:

| Event | Animation | Duration |
|-------|-----------|----------|
| Insert | Scale + fade + glow | 400ms |
| Update | Outline highlight | 600ms |
| Delete | Fade + shrink | 200ms |
| Move | FLIP | 300ms |

Custom transitions are in `src/lib/transitions/pulse.ts`.

## Stores

### `connection`

Manages WebSocket connection to ui-bridge:

```typescript
import { connection, isConnected } from '$lib/stores/connection';

connection.connect('ws://localhost:4201');
connection.disconnect();
```

### `operations`

Processes incoming operations and maintains the component tree:

```typescript
import { componentTree, selectedNode, recentChanges } from '$lib/stores/operations';

// $componentTree — current NodeData tree
// $selectedNode — currently selected node (or null)
// $recentChanges — Set of recently changed node IDs
```

## Controls

| Action | Control |
|--------|---------|
| Pan | Scroll or Alt+drag |
| Zoom | Ctrl/Cmd + scroll |
| Reset view | Ctrl/Cmd + 0 |
| Select node | Click |
| Close inspector | Click × or Escape |

## Development

```bash
# Start dev server
pnpm dev

# Type check
pnpm check

# Build
pnpm build
```

## Part of UI Preview System

- **ui-diff** — Rust/WASM crate that computes operations
- **ui-bridge** — Bun server that watches files and streams operations
- **ui-viewer** (this) — SvelteKit app that renders with animations

Together, they provide visual feedback for CLI-based AI agents.
