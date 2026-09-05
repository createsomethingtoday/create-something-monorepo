# CREATE SOMETHING Draw

Draw is a free, local-first canvas for mapping meetings, spatial notes, and live visual explanation. The public app runs at [draw.createsomething.agency](https://draw.createsomething.agency/).

The [Mac preview landing](https://draw.createsomething.agency/download) keeps the production web canvas primary and routes the unsigned native candidate through disclosed, individual delivery. A general-public DMG link remains held until Developer ID signing, Apple notarization, Gatekeeper verification, and clean install acceptance pass.

The source is MIT licensed as part of the public [CREATE SOMETHING monorepo](https://github.com/createsomethingtoday/create-something-monorepo). Contributions are welcome. Read the repository [contribution guide](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/CONTRIBUTING.md), [code of conduct](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/CODE_OF_CONDUCT.md), and [security policy](https://github.com/createsomethingtoday/create-something-monorepo/blob/main/SECURITY.md) before opening a pull request or report.

## Run locally

```bash
pnpm bootstrap:worktree
pnpm --filter @create-something/mapping-canvas dev
```

Quality gates:

```bash
pnpm --filter @create-something/mapping-canvas test
pnpm --filter @create-something/mapping-canvas check
pnpm --filter @create-something/mapping-canvas build
pnpm --filter @create-something/mapping-canvas verify:download
```

## WebMCP site tools

Draw registers nineteen tools through `document.modelContext.registerTool`, with a compatibility fallback for older `navigator.modelContext` or `provideContext` implementations:

- `draw_get_state` reads the full local document and shared focus state.
- `draw_inspect` returns a compact, filterable projection with revision, palette, surface, and visible-world geometry.
- `draw_get_rendered_geometry` reads settled SVG/DOM bounds, connector routes and labels, clipping, missing elements, and containment-aware overlaps from the browser canvas.
- `draw_compose` creates semantic notes, shapes, labeled relationships, and groups with local references, automatic identity, layout, and placement.
- `draw_path` creates bounded line, polyline, polygon, or smoothed paths compiled to portable v1 strokes.
- `draw_create_freehand_arrow` creates deterministic curved arrows from start/end, curvature, looseness, named color, weight, and arrowhead intent while retaining the v1 stroke model.
- `draw_patch_objects` partially changes text, labels, position, size, named color, and layer arrangement.
- `draw_layout` arranges objects in a deterministic row, column, or grid.
- `draw_auto_layout` arranges graph roots as a topology-aware flow, hierarchy, loop, orbit, or swimlane with deterministic cycle and disconnected-component handling.
- `draw_focus` fits the camera to all objects, selection, IDs, or bounds.
- `draw_revert_change` conflict-safely reverses a receipt-identified agent change.
- `draw_delete` and `draw_replace_canvas` isolate destructive operations behind exact confirmations.
- `draw_apply_operations` atomically applies the same typed operations used by desktop/iPhone mirroring.
- `draw_select` and `draw_set_tool` share visual focus with the operator.
- `draw_undo`, `draw_redo`, and `draw_reset` expose history controls.

`draw_apply_operations` supports `put_object`, `remove_objects`, `replace_objects`, `set_title`, `set_viewport`, `convert`, and `restore_conversion` for backwards compatibility. Whole-canvas replacement requires `confirmation: "REPLACE CANVAS"`; dedicated deletion requires `confirmation: "DELETE OBJECTS"`; reset requires `confirmation: "RESET CANVAS"`. Agent mutations are serialized through the document/history path and produce compact revision-bearing receipts plus a visible, reduced-motion-safe transition.

Canvas data remains in the current browser or native app unless the operator explicitly exports it. WebMCP tools do not send documents to a CREATE SOMETHING server. Site-tool mutation is intentionally limited to the browser-local canvas; paired Mac/iPhone shells fail closed and continue using their native synchronization controls.
