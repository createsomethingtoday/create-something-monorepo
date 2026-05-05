# MCP Apps Integration Guide

This guide documents MCP Apps integration patterns for CREATE SOMETHING tools, enabling interactive UI components directly in AI conversations.

## Overview

MCP Apps is an official MCP extension (released January 2026) that allows tools to return interactive UI components. Instead of plain text responses, tools can render dashboards, forms, visualizations, and multi-step workflows directly in the conversation.

**References:**
- [MCP Apps Announcement](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [MCP Apps Documentation](https://modelcontextprotocol.io/docs/concepts/apps)
- [ext-apps SDK](https://github.com/modelcontextprotocol/ext-apps)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Host (Claude, VS Code, etc.)       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Sandboxed iframe                    │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │           UI Resource (HTML/JS)                  │  │  │
│  │  │    ┌─────────────────────────────────────────┐   │  │  │
│  │  │    │         @ext-apps SDK                    │   │  │  │
│  │  │    │   - callServerTool()                     │   │  │  │
│  │  │    │   - updateModelContext()                 │   │  │  │
│  │  │    └─────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │ postMessage                     │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              MCP Server (Ground/Hub/etc.)              │  │
│  │   - tools/list (with _meta.ui)                         │  │
│  │   - tools/call                                         │  │
│  │   - resources/list                                     │  │
│  │   - resources/read                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Ground: Duplicate Explorer

### Tools with UI Support

The following Ground tools include `_meta.ui` metadata pointing to `ui://ground/duplicate-explorer`:

- `ground_find_duplicate_functions` - Primary entry point for duplicate analysis
- `ground_compare` - Compare two files for similarity
- `ground_suggest_fix` - Get refactoring suggestions

### UI Resource

**URI:** `ui://ground/duplicate-explorer`

**Features:**
- Interactive duplicate cards with expandable details
- Similarity score visualization (color-coded: green >90%, orange 70-90%, gray <70%)
- Side-by-side file comparison
- Adjustable similarity threshold slider (50-100%)
- One-click actions: Compare, Suggest Fix
- Real-time statistics: total duplicates, files affected, average similarity

### Implementation Files

- UI: `packages/ground/ui/duplicate-explorer/index.html`
- Registry: `packages/ground/src/ui_resources.rs`
- Server: `packages/ground/src/bin/ground-mcp.rs`

## Protocol Details

### Tool Definition with UI Metadata

```json
{
  "name": "loom_list",
  "description": "List tasks with optional filtering",
  "inputSchema": { ... },
  "_meta": {
    "ui": {
      "resourceUri": "ui://loom/task-board"
    }
  }
}
```

### Resources Capability

Both servers declare resources capability in the initialize response:

```json
{
  "protocolVersion": "2024-11-05",
  "capabilities": {
    "tools": {},
    "resources": {
      "subscribe": false,
      "listChanged": false
    }
  }
}
```

### Resource Protocol

**List Resources:**
```json
// Request
{ "method": "resources/list" }

// Response
{
  "resources": [
    {
      "uri": "ui://ground/duplicate-explorer",
      "name": "Duplicate Explorer",
      "description": "...",
      "mimeType": "text/html"
    }
  ]
}
```

**Read Resource:**
```json
// Request
{ "method": "resources/read", "params": { "uri": "ui://loom/task-board" } }

// Response
{
  "contents": [{
    "uri": "ui://loom/task-board",
    "mimeType": "text/html",
    "text": "<!DOCTYPE html>..."
  }]
}
```

## UI-to-Server Communication

The UI resources use a lightweight MCP Apps client class that communicates via postMessage:

```javascript
class McpApp {
  async callServerTool(request) {
    parent.postMessage({
      jsonrpc: '2.0',
      id: ++this.messageId,
      method: 'tools/call',
      params: {
        name: request.name,
        arguments: request.arguments
      }
    }, '*');
  }

  async updateModelContext(context) {
    parent.postMessage({
      type: 'update-context',
      context
    }, '*');
  }
}
```

## Security Model

- All UI content runs in sandboxed iframes
- Communication is via JSON-RPC over postMessage (auditable)
- UI resources are bundled HTML (no external fetches)
- Server validates all tool calls

## Client Support

MCP Apps is supported in:
- **Claude.ai** - Web and desktop
- **VS Code** - Insiders channel
- **ChatGPT** - Starting Jan 2026
- **Goose** - Full support

## Adding New UIs

To add a new UI resource:

1. **Create the HTML file** in `packages/{package}/ui/{name}/index.html`

2. **Register in ui_resources.rs:**
```rust
self.resources.insert(
    "ui://{package}/{name}".to_string(),
    UiResource {
        uri: "ui://{package}/{name}".to_string(),
        name: "Name".to_string(),
        description: "Description".to_string(),
        content: include_str!("../ui/{name}/index.html").to_string(),
        mime_type: "text/html".to_string(),
    },
);
```

3. **Add _meta.ui to relevant tools** in the tools/list response

4. **Test** in a supported MCP client
