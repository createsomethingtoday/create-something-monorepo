# notion-tools

High-performance Notion data processing tools, written in Rust.

## Overview

This package provides two integration modes:

1. **WebAssembly** - Hot-path functions for use in Cloudflare Workers
2. **MCP Server** - AI-accessible tools via Model Context Protocol

## WASM Functions

Functions exposed for WebAssembly:

- `format_schema(properties_json)` - Format database schema for LLM context
- `simplify_pages(pages_json)` - Extract titles and metadata from pages
- `find_duplicates(pages_json, keep_strategy)` - Find duplicate pages by title
- `estimate_tokens(text)` - Fast token count estimation

### Usage in TypeScript

```typescript
import init, { format_schema, find_duplicates } from '@create-something/notion-tools';

// Initialize WASM module
await init();

// Format a schema
const schema = format_schema(JSON.stringify(notionProperties));

// Find duplicates
const result = find_duplicates(JSON.stringify(pages), 'oldest');
```

## MCP Server

The `notion-mcp` binary exposes tools via JSON-RPC over stdio:

- `notion_analyze_schema` - Analyze database schema
- `notion_find_duplicates` - Find duplicate pages
- `notion_simplify_pages` - Simplify page objects
- `notion_suggest_cleanup` - Suggest cleanup actions

### Running the MCP Server

```bash
# Build
cargo build --release --bin notion-mcp

# Run (stdio)
./target/release/notion-mcp
```

### MCP Configuration

Add to `.cursor/mcp.json`:

```json
{
  "notion-tools": {
    "command": "notion-mcp",
    "args": []
  }
}
```

## Building

### WASM

```bash
# Requires wasm-pack: cargo install wasm-pack
pnpm build
# or
wasm-pack build --target bundler --out-dir pkg
```

### MCP Binary

```bash
cargo build --release --bin notion-mcp
```

### Tests

```bash
cargo test
```

## Performance

| Operation | TypeScript | Rust WASM | Improvement |
|-----------|------------|-----------|-------------|
| find_duplicates (1000 pages) | ~500ms | ~50ms | 10x |
| simplify_pages (100 pages) | ~20ms | ~2ms | 10x |
| format_schema (50 properties) | ~5ms | ~0.5ms | 10x |

## License

MIT
