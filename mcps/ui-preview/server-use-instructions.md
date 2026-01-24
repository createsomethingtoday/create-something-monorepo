# UI Preview MCP Server

Visual feedback for UI component development. AI-native design canvas with real Svelte rendering.

## When to Use

Use UI Preview when:
- Building or editing UI components
- You want to see visual feedback as you code
- The user mentions "preview", "visual", or "see the changes"
- Iterating on UI design with minimal token usage

## V2 AI-Native Workflow (Recommended)

The V2 API uses **structured schemas** for efficient AI editing:

### 1. Create a V2 artifact:
```
ui_artifact_create_v2({
  name: "Feature Card",
  content: {
    icon: { name: "rocket", library: "lucide" },
    title: "Automation Infrastructure",
    body: "The layer between human intention and system execution."
  },
  style: {
    theme: "glass-dark",
    accent: "#6366f1",
    animation: "float"
  }
})
```

### 2. Patch with minimal tokens:
```
ui_artifact_patch({
  id: "art-xxx-yyyy",
  set: {
    "content.icon": { "name": "zap", "library": "lucide" },
    "style.accent": "#ec4899"
  }
})
```

### 3. View in canvas:
Open `http://localhost:4200/canvas?artifact=art-xxx-yyyy`

**Benefits:**
- ~50 tokens per edit vs ~2500 for full HTML
- Real Svelte rendering (actual Lucide icons)
- Version history with restore
- Keyboard shortcuts: R=refresh, C=copy link

## V1 Canvas Workflow (Legacy)

The **Canvas** renders components with full CSS styling and animations.

1. **Open canvas** in browser: `http://localhost:4200/canvas`

2. **Edit a component** using Write/StrReplace tools

3. **Render to canvas**:
   ```
   ui_canvas_render({ path: "Card.svelte" })
   ```

4. Canvas updates with animations showing what changed

**This is the Pencil-style workflow** — edit file, render, see styled result with animations.

## Structure Workflow (AST View)

The **Structure** view shows the component AST tree, useful for debugging.

1. **Start preview** before making UI changes:
   ```
   ui_preview_start({ watchDir: "./src/lib/components" })
   ```

2. **Edit components** normally - changes stream live to the viewer

3. **Stop preview** when done:
   ```
   ui_preview_stop()
   ```

## Component Library

Save and reference UI components like Pencil's design library:

```
ui_library_list()         # List saved components
ui_library_get({ id })    # Get component by ID
```

Users can save components from the viewer UI. Agents can:
- List saved patterns for inspiration
- Get specific components as reference
- Build consistent UIs based on saved designs

## CLI Alternative

If MCP isn't available, use bash:
```bash
pnpm ui:start ./src/lib/components  # Start preview
pnpm ui:status                       # Check status
pnpm ui:stop                         # Stop preview

# Library commands
pnpm ui library list                 # List components
pnpm ui library get <id>             # Get component
pnpm ui library export               # Export library
pnpm ui library import <file>        # Import library
```

## Features

- **Live diffing**: Only changed elements animate
- **FLIP animations**: Layout changes flow smoothly
- **Pulse effects**: New elements glow on insertion
- **Inspector panel**: Click elements to see properties
- **Copy for Agent**: Select element, copy context for chat
- **Component Library**: Save and reuse UI patterns

## Architecture

```
ui-diff (Rust WASM) → ui-bridge (Bun) → ui-viewer (SvelteKit)
     AST parsing         File watch        Visual display
                         WebSocket         Canon design + Library
```
