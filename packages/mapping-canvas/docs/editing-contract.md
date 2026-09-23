# Shared editing contract

Canvas controls and `draw_edit` use `compileEdits` from `src/lib/editing.ts`. The compiler has no browser, storage, clock or random dependencies: callers supply IDs and a timestamp. It returns a validated document, low-level operations, affected IDs and resulting selection. Browser WebMCP applies those operations as one history entry and returns a revision and reversible change receipt. Existing tools remain available.

Inspect with `draw_inspect`, then submit `draw_edit` with the returned `expectedRevision` and `commands`. An invalid command rejects the entire batch. Stale revisions and active human gestures reject writes; inspect again after the gesture ends. Up to 100 commands, 200 explicit IDs per command and 5000 expanded descendants are allowed.

| Command     | Fields beyond `type` and `ids`                                         |
| ----------- | ---------------------------------------------------------------------- |
| `transform` | Absolute `x`, `y`, `width`, `height`, `rotation` in degrees            |
| `style`     | `color`, `fill` (`#RRGGBB` or `none`), `strokeWidth`                   |
| `layer`     | `name`, `hidden`, `locked`                                             |
| `duplicate` | Optional `dx`, `dy`; default 24 canvas units                           |
| `paste`     | Portable `objects` array and optional `dx`, `dy`                       |
| `arrange`   | `position`: front, back, forward, backward                             |
| `align`     | `axis`: left, center, right, top, middle, bottom, horizontal, vertical |

Groups expand descendants exactly once. Duplication and paste remap internal group and connector references and omit conversion restoration snapshots. Paste references must resolve within the supplied object array. Alignment rejects overlapping group/child selections. Distribution spaces the gaps equally. Transform dimensions describe the unrotated selected roots; group rotation moves descendants around the group's pivot. Rotation changes by the delta from the first selected root's angle. Shift-drag snaps resize dimensions to eight units and rotation to fifteen degrees.

Layer locks inherit through groups and are editing guards, not authorization or encryption. Explicit unlock, visibility and name edits remain allowed. Legacy object mutation tools honor the same locks; undo can restore an earlier state. Hidden layers stay in portable files and Motion tracks while being omitted from painting. Group frames paint behind artwork; arrangement determines order within frames or artwork.

The additive `mapping-canvas.v1` fields preserve existing documents: name, hidden, locked, rotation, fill and strokeWidth. Canvas/Motion use one project ID; representable Canvas marks retain object IDs in Motion. Source rotation deltas preserve existing animation offsets. Groups and connectors remain Canvas objects, as before. SVG, PNG and shared views preserve visibility, rotation and shape styles. JSON retains all objects for editing.

Keyboard: Command/Ctrl+D duplicates, Command/Ctrl+A selects unlocked visible objects, Command/Ctrl+C/V copies/pastes portable artwork, arrows nudge one unit (Shift: ten), Space temporarily pans, Escape clears selection, Command/Ctrl+Z and Shift+Z undo/redo. Text controls retain normal text shortcuts.

Verification: `pnpm --filter @create-something/mapping-canvas test`, `check`, `build`, then `CANVAS_URL=<running build URL> pnpm --filter @create-something/mapping-canvas verify:editing`. The browser verifier drives real UI plus registered WebMCP on desktop/mobile and retains screenshots, exported files and state receipts under `output/`.
