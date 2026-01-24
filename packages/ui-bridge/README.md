# ui-bridge

Bridge server for the UI preview system. Watches files, computes diffs using Rust WASM, and streams operations to connected viewers.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  CLI Agent                                                      │
│  - Edits .svelte files                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ File changes
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  ui-bridge (this)                                               │
│  - Watches files (Bun.watch)                                    │
│  - Computes diffs (ui-diff WASM)                                │
│  - Streams operations (WebSocket)                               │
└────────────────────────┬────────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  ui-viewer                                                      │
│  - Receives operations                                          │
│  - Animates changes                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Build the WASM module first
pnpm build:wasm

# Start the bridge server
bun run dev
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `UI_BRIDGE_PORT` | `4201` | WebSocket server port |
| `UI_BRIDGE_WATCH_DIR` | `./src` | Directory to watch for changes |

## WebSocket Protocol

### Server → Client

**Connected**
```json
{
  "type": "connected",
  "watching": "./src",
  "extensions": [".svelte", ".html", ".tsx", ".jsx", ".vue"]
}
```

**Change**
```json
{
  "type": "change",
  "path": "src/routes/+page.svelte",
  "operations": [
    { "type": "insert", "parent": "root", "node": {...}, "index": 0, "animate": "scale-fade" },
    { "type": "update", "target": "node-1", "changes": [...] }
  ],
  "timestamp": 1706040000000
}
```

### Client → Server

**Subscribe**
```json
{
  "type": "subscribe",
  "patterns": ["components/", "routes/"]
}
```

**Ping**
```json
{ "type": "ping" }
```

## HTTP Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Server info |
| `GET /health` | Health check with client count |

## Development

```bash
# Watch mode (restarts on changes)
bun run dev

# Type check
bun run typecheck
```

## Architecture

```
ui-bridge/
  src/
    index.ts        # Main server
  wasm/             # Built WASM module (gitignored)
    ui_diff.js
    ui_diff_bg.wasm
  package.json
  tsconfig.json
```

## Why Bun?

- **Instant startup** (~25ms vs ~200ms for Node)
- **Built-in WebSocket** — No `ws` dependency
- **Built-in file watcher** — No `chokidar` dependency
- **Native TypeScript** — No transpilation step

This is a dev tool where latency matters. Bun's built-ins are a perfect fit.
