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

Groups expand descendants exactly once. Duplication and paste remap internal group and connector references and omit conversion restoration snapshots. Copy includes referenced connector endpoints so a connector-only selection remains portable. Paste references must resolve within the supplied object array. Alignment rejects overlapping group/child selections. Distribution spaces the gaps equally. Transform dimensions describe the unrotated selected roots; group rotation moves descendants around the group's pivot. Rotation changes by the delta from the first selected root's angle. Shift-drag snaps resize dimensions to eight units and rotation to fifteen degrees.

Layer locks inherit through groups and are editing guards, not authorization or encryption. They preserve relative stacking positions among surviving layers; unlock before reordering across a locked layer. Unrelated insertions and deletions remain allowed. `draw_inspect` reports effective `hidden`/`locked` state and raw `ownHidden`/`ownLocked` flags, including when filtering by child ID. Explicit unlock, visibility and name edits remain allowed. Legacy object mutation tools honor the same locks; undo can restore an earlier state. Hidden layers do not influence the visible Motion scene fit; their editable tracks are fitted separately until shown again. Hidden layers stay in portable files and, within Motion capacity, editable tracks while being omitted from painting. Visible Canvas artwork takes priority over hidden Canvas tracks at Motion drawing/byte limits; Motion-only artwork retains its reserved capacity. Group frames paint behind artwork; arrangement determines order within frames or artwork.

The additive `mapping-canvas.v1` fields preserve existing documents: name, hidden, locked, rotation, fill and strokeWidth. Canvas/Motion use one project ID; representable Canvas marks retain object IDs in Motion. Source rotation deltas preserve existing animation offsets. Groups and connectors remain Canvas objects, as before. SVG, PNG and shared views preserve visibility, rotation and shape styles. JSON retains all objects for editing. Arrowheads use a fixed 20 by 14 canvas-unit marker independent of shaft weight across Canvas, SVG, PNG and shared views. Motion represents imported arrows as two-point strokes with bounded `arrowheadScale`, drawing the same filled head at the imported scene scale.

Keyboard: Command/Ctrl+D duplicates, Command/Ctrl+A selects unlocked visible objects, Command/Ctrl+C/V copies/pastes portable artwork, arrows nudge one unit (Shift: ten), Space temporarily pans, Escape clears selection, Command/Ctrl+Z and Shift+Z undo/redo. Text controls retain normal text shortcuts.

Verification: `pnpm --filter @create-something/mapping-canvas test`, `check`, `build`, then `CANVAS_URL=<running build URL> pnpm --filter @create-something/mapping-canvas verify:editing`. The browser verifier drives real UI plus registered WebMCP on desktop/mobile and retains screenshots, exported files and state receipts under `output/`.

## Agent attention and task activity

Canvas tool execution reports ephemeral action labels, bounded target IDs, and running/completed/failed outcomes. Reads show attention too. These events do not enter the document, revision, exports, or undo history. They clear on reload/project change. Attention excludes hidden layers and shows up to 20 outlines for four seconds; event payloads retain up to 100 IDs. A late completion cannot replace a newer action.

`draw_agent_activity({state, label, ids, taskId?})` reports longer tasks. `begin` returns `task.id`; subsequent `working`, `waiting`, `completed`, or `failed` updates require that ID. One active task per canvas tool session; finish it before beginning another. Labels are 1–160 characters, IDs must exist (maximum 100). These states are agent-reported, not evidence that the model is thinking. Working tasks with no recent events show the age of their last update. Automatic operation outcomes remain visible separately.

Following is off by default. Users can opt into following targets, and manual canvas navigation disengages it immediately. The explicit `draw_focus` command remains an intentional camera operation. Reduce motion disables agent transitions; the OS reduced-motion setting is always honored. User selection remains distinct from agent attention. This is local Canvas presence, not remote multiplayer identity or a native companion task transport.
