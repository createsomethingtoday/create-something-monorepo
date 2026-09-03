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

Draw registers seven tools through `document.modelContext.registerTool`, with a compatibility fallback for older `navigator.modelContext` or `provideContext` implementations:

- `draw_get_state` reads the full local document and shared focus state.
- `draw_apply_operations` atomically applies the same typed operations used by desktop/iPhone mirroring.
- `draw_select` and `draw_set_tool` share visual focus with the operator.
- `draw_undo`, `draw_redo`, and `draw_reset` expose history controls.

`draw_apply_operations` supports `put_object`, `remove_objects`, `replace_objects`, `set_title`, `set_viewport`, `convert`, and `restore_conversion`. Whole-canvas replacement requires `confirmation: "REPLACE CANVAS"`; reset requires `confirmation: "RESET CANVAS"`. Agent mutations are serialized through the document/history path and produce a visible, reduced-motion-safe transition receipt.

Canvas data remains in the current browser or native app unless the operator explicitly exports it. WebMCP tools do not send documents to a CREATE SOMETHING server. Site-tool mutation is intentionally limited to the browser-local canvas; paired Mac/iPhone shells fail closed and continue using their native synchronization controls.
