---
name: ui-preview
description: Start, check, and stop the UI Preview System for live animated feedback while editing UI components (ui_preview_* MCP tools or pnpm ui:* commands).
---

# UI Preview System

Visual feedback for UI component development. See live animated changes as you edit.

**MCP Tools** (if ui-preview server enabled):
```
ui_preview_start({ watchDir: "./src/lib/components" })  # Start watching
ui_preview_status()                                      # Check status
ui_preview_stop()                                        # Stop
```

**CLI Commands** (always available):
```bash
pnpm ui:start ./src/lib/components  # Start preview
pnpm ui:status                       # Check status (JSON)
pnpm ui:stop                         # Stop preview
```

**Workflow**:
1. Start preview before UI changes
2. Edit components—changes animate in viewer
3. Stop when done

**Copy for Agent**: Users can click elements in the viewer and copy context for precise targeting.

See `docs/guides/UI_PREVIEW_SYSTEM.md` for architecture details.
