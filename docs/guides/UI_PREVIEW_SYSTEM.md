# UI Preview System

**"Pencil for CLI"** — Visual feedback for AI agents editing UI components.

## The Problem

CLI-based AI agents like Claude Code work "blind" when editing UI components. They can edit HTML/CSS/Svelte perfectly, but they can't see the rendered result. There's no feedback loop.

## AI-Native Usage

### MCP Tools (Recommended)

The `ui-preview` MCP server provides native tool integration:

| Tool | Description |
|------|-------------|
| `ui_preview_start` | Start watching directory for changes |
| `ui_preview_stop` | Stop the preview server |
| `ui_preview_status` | Check running state (JSON) |
| `ui_preview_open` | Open viewer in browser |

Example agent workflow:
```
1. ui_preview_start({ watchDir: "./src/lib/components" })
2. Edit component files...
3. User sees live animated changes
4. ui_preview_stop() when done
```

### CLI Commands

For bash-based invocation:

```bash
pnpm ui:start ./src/lib/components  # Start watching
pnpm ui:status                       # Check status (JSON)
pnpm ui:stop                         # Stop preview
```

### Bidirectional Feedback

The viewer supports **Copy for Agent**:
1. Click an element in the preview
2. Click "📋 Copy for Agent" in inspector
3. Paste Markdown context into agent chat

This enables precise element targeting for UI modifications.

### Component Library

Save UI components as reusable design artifacts (like Pencil's design library):

**In the Viewer:**
- Click "📚 Library" button on the left
- Click "💾 Save" to save current component
- Add name, description, and tags
- Browse, search, and copy saved components

**CLI Commands:**
```bash
pnpm ui library list           # List saved components (JSON)
pnpm ui library get <id>       # Get component by ID
pnpm ui library export         # Export library as JSON
pnpm ui library import <file>  # Import from JSON file
pnpm ui library delete <id>    # Delete component
```

**Use Cases:**
- Build a pattern library as you work
- Share components between sessions
- Reference saved designs for consistency
- Export/import libraries between machines

## The Solution

A three-part system that provides real-time visual feedback:

```
┌─────────────────────────────────────────────────────────────────┐
│  CLI Agent                                                      │
│  - Edits .svelte files                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ File changes
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  ui-diff (Rust/WASM)                                            │
│  - Parses components into AST                                   │
│  - Diffs old vs new                                             │
│  - Emits operations (Insert, Update, Delete, Move)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  ui-bridge (Bun)                                                │
│  - Watches files for changes                                    │
│  - Calls ui-diff to compute operations                          │
│  - Streams operations via WebSocket                             │
└────────────────────────┬────────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  ui-viewer (SvelteKit)                                          │
│  - Receives operations                                          │
│  - Animates changes (elements pulse into place)                 │
│  - Provides visual feedback to the user                         │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Build the WASM module (first time only)

```bash
# Requires: rustup, wasm-pack
pnpm ui:diff:build
```

### 2. Start the viewer

```bash
# Terminal 1: Start the SvelteKit viewer (port 4200)
pnpm ui:viewer
```

### 3. Start the bridge

```bash
# Terminal 2: Start the Bun file watcher (port 4201)
pnpm ui:bridge
```

### 4. Edit components

Open the viewer at `http://localhost:4200` and edit any `.svelte` file. Watch elements pulse into place as the agent works.

## Why Each Part

### ui-diff (Rust)

**Why Rust?** AST parsing and tree diffing are CPU-bound. Rust provides:
- 10-100x faster than JavaScript for large files
- Compiles to WASM (runs in browser, edge, CLI)
- Deterministic, no GC pauses

### ui-bridge (Bun)

**Why Bun?** It's a dev tool where startup time matters:
- ~25ms startup (vs ~200ms for Node)
- Built-in WebSocket server (no `ws` dependency)
- Built-in file watcher (no `chokidar` dependency)
- Native TypeScript

### ui-viewer (SvelteKit)

**Why Svelte?** Animation primitives are first-class:
- `transition:scale`, `transition:fade` — built-in
- `animate:flip` — layout animations built-in
- Stores → reactive DOM updates
- You already know it

## Animation Philosophy

The "pulse into place" effect isn't just polish—it's communication. When you see an element pulse in, you understand what the agent did without reading code diffs.

| Operation | Animation | Purpose |
|-----------|-----------|---------|
| Insert | Scale + fade + glow | "New element added here" |
| Update | Outline highlight | "This changed" |
| Delete | Fade + shrink | "This was removed" |
| Move | FLIP slide | "This moved from there to here" |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UI_BRIDGE_PORT` | `4201` | Bridge WebSocket port |
| `UI_BRIDGE_WATCH_DIR` | `./src` | Directory to watch |

### Watched Extensions

By default: `.svelte`, `.html`, `.tsx`, `.jsx`, `.vue`

## Future: Cloudflare Integration

The system can integrate with Cloudflare for advanced features:

1. **Browser Rendering API** — Take screenshots of rendered components
2. **Cloudflare Tunnel** — Expose localhost for remote agents
3. **R2** — Store screenshot history
4. **Workers** — Deploy the bridge as a service

See the original design discussion for Cloudflare architecture details.

## Development

```bash
# Run Rust tests
cd packages/ui-diff && cargo test

# Run viewer in dev mode
pnpm ui:viewer

# Run bridge in dev mode (Bun)
pnpm ui:bridge
```

## Packages

| Package | Language | Purpose |
|---------|----------|---------|
| `packages/ui-diff` | Rust | AST diffing, WASM compilation |
| `packages/ui-bridge` | TypeScript (Bun) | File watching, WebSocket server |
| `packages/ui-viewer` | Svelte | Visual preview with animations |
