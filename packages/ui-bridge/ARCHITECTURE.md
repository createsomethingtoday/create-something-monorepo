# UI Preview System Architecture

**Status**: Active development  
**Last Updated**: 2026-01-23

## Design Principle

> Schema API for editing, Real Svelte for rendering.

The system separates two concerns:
1. **AI-native editing** — Structured schema with patch-based updates (efficient for agents)
2. **Real rendering** — Actual Svelte components with real dependencies (accurate preview)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Agent                                                      │
│  - Creates/patches artifacts via V2 API                     │
│  - Minimal token usage (~50 chars per edit)                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP PATCH
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ui-bridge (Bun server, port 4201)                          │
│  - V2 API: /api/v2/artifacts/*                              │
│  - Stores schema as JSON                                    │
│  - Broadcasts changes via WebSocket                         │
│  - Maintains version history                                │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket + File write
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ui-viewer (SvelteKit, port 4200)                           │
│  - /canvas — Main preview canvas                            │
│  - /preview/:id — Real Svelte rendering of artifact         │
│  - Uses actual components, icons, tokens                    │
└─────────────────────────────────────────────────────────────┘
```

## V2 Schema Format

```typescript
interface ArtifactV2 {
  id: string;
  name: string;
  version: number;
  type: 'card' | 'hero' | 'button' | 'section';
  content: {
    icon?: string | { name: string; library: 'lucide' };
    title?: string;
    subtitle?: string;
    body?: string;
    badge?: string;
    cta?: { label: string; href?: string };
    items?: string[];
  };
  style: {
    theme: 'glass-dark' | 'glass-light' | 'solid-dark' | 'solid-light';
    accent: string;        // Hex color
    radius: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    padding: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    animation: 'none' | 'float' | 'pulse' | 'glow';
  };
  createdAt: string;
  updatedAt: string;
}
```

## API Reference

### Create Artifact
```bash
POST /api/v2/artifacts
{"name": "Card", "content": {...}, "style": {...}}
```

### Patch Artifact (AI-native)
```bash
PATCH /api/v2/artifacts/:id
{"set": {"content.icon": "rocket", "style.accent": "#ec4899"}}
```

### Version History
```bash
GET /api/v2/artifacts/:id/history
```

### Restore Version
```bash
POST /api/v2/artifacts/:id/restore
{"version": 3}
```

## Canvas URL State

Artifacts are referenceable via URL:
```
http://localhost:4200/canvas?artifact=art-xxx-yyyy
```

Refreshing the page reloads the artifact.

## Key Files

| File | Purpose |
|------|---------|
| `ui-bridge/src/index.ts` | Main server, WebSocket, routes |
| `ui-bridge/src/v2-api.ts` | V2 artifact CRUD + versioning |
| `ui-bridge/src/schema.ts` | Type definitions (renderer deprecated) |
| `ui-viewer/src/routes/canvas/+page.svelte` | Preview canvas |
| `ui-viewer/src/routes/preview/[id]/+page.svelte` | Real Svelte renderer |

## Evolution

1. **V1** (legacy): Raw HTML/CSS artifacts, full-source updates
2. **V2** (current): Structured schema, patch updates, versioning
3. **Rendering**: Moved from fake HTML generation → real Svelte iframe

## Related

- `docs/internal/CANVAS_APP_POSTMORTEM.md` — Why static parsing failed
- `docs/guides/UI_PREVIEW_SYSTEM.md` — User-facing documentation
