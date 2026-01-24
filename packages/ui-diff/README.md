# ui-diff

AST diffing for UI components. Produces operations for animated previews.

## Overview

`ui-diff` parses UI components (HTML, Svelte, React) and computes the minimal set of operations needed to transform one tree into another. These operations map directly to animations in a viewer:

| Operation | Animation |
|-----------|-----------|
| `Insert` | Element pulses/scales into existence |
| `Update` | Properties animate to new values |
| `Delete` | Element fades out |
| `Move` | Element slides to new position (FLIP) |

## Usage

### As WASM (Browser/Node)

```typescript
import init, { diff } from 'ui-diff';

await init();

const before = '<div>Hello</div>';
const after = '<div><span>Hello</span><span>World</span></div>';

const operations = JSON.parse(diff(before, after, 'html'));
// [
//   { type: 'insert', parent: '...', node: {...}, index: 1, animate: 'scale-fade' }
// ]
```

### As Rust Library

```rust
use ui_diff::{parse, diff_trees, Syntax};

let before = parse("<div>Hello</div>", Syntax::Html);
let after = parse("<div>World</div>", Syntax::Html);

let ops = diff_trees(&before, &after);
```

## Building

### WASM (requires wasm-pack)

```bash
wasm-pack build --target web
```

### Native

```bash
cargo build --release
```

## Supported Syntaxes

- **HTML** - Standard HTML parsing
- **Svelte** - Extracts template portion, ignores `<script>` and `<style>` blocks
- **React/JSX** - Basic JSX support (extracts return statement JSX)

## Operation Types

### Insert

```json
{
  "type": "insert",
  "parent": "node-0",
  "node": { "id": "node-1", "type": "element", "tag": "span", ... },
  "index": 0,
  "animate": "scale-fade"
}
```

### Update

```json
{
  "type": "update",
  "target": "node-1",
  "changes": [
    { "prop": "class", "from": "old", "to": "new" },
    { "prop": "text", "from": "Hello", "to": "World" }
  ]
}
```

### Delete

```json
{
  "type": "delete",
  "target": "node-1"
}
```

### Move

```json
{
  "type": "move",
  "target": "node-1",
  "new_parent": "node-0",
  "index": 2
}
```

## Architecture

```
ui-diff/
  src/
    lib.rs          # WASM bindings, public API
    parser.rs       # HTML/Svelte/React → NodeData
    differ.rs       # Tree diff algorithm
    operations.rs   # Operation types
```

## Part of the UI Preview System

This crate is part of a larger system:

- **ui-diff** (this) - Computes what changed
- **ui-bridge** - Watches files, sends operations via WebSocket
- **ui-viewer** - SvelteKit app that animates changes

Together, they provide a "Pencil for CLI" experience where AI agents can see their UI work animate into place.
