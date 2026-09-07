# Turn development history into a visual story

Use this playbook to research a project's history with CTX, write a storyboard, and create an editable freehand comic in [Draw](https://draw.createsomething.agency/). The result should teach one idea through pictures, with about 80% illustration and 20% text.

Use it for development retrospectives, onboarding, and explanations of how a system improved. A chronological comic works best when the evidence contains a visible problem, an attempted repair, and a consequence. For a current architecture map, inspect the current system first; history alone cannot establish its present state.

## Start with this request

Copy this prompt into a task where the project or topic is already named:

> Use CTX to review the development history of the project we are discussing. Follow `docs/guides/CTX_TO_DRAW_STORYTELLING_PLAYBOOK.md`. First save a storyboard with sources. Then tell the story in draw.createsomething.agency using the in-app browser and editable freehand strokes. Use On Writing Well. Make it fun to learn, with roughly 80% pictures and 20% text. Preserve existing artwork, verify the rendered result, and save a preview and a portable drawing. Keep it as a local draft unless I ask to publish.

Expected output: a source-backed storyboard, a comic visible in Draw, a preview image, and a portable `.draw.json` file. See the [worked storyboard](../examples/draw-storytelling/template-form-storyboard.md) and [editable example](../examples/draw-storytelling/template-form-story.draw.json).

## Before starting

- Have a topic, intended reader, and destination for the artifact files. Infer these from the conversation when they are clear.
- Load the available CTX history-search, On Writing Well, and requested browser-control skills. Resolve their paths from the current skill catalog; temporary plugin paths from older sessions may no longer exist.
- Confirm CTX is available and the requested browser can open Draw. Follow the browser skill's setup and tool-discovery instructions.
- For repository changes, inspect checkout ownership and existing edits. Use Linear when the work is shared, delegated, long-running, or needs tracked handoff evidence. Preserve unrelated work.

The **Database** tier stores evidence and drawings. **Automation** runs CTX and Draw tools. **Judgment** governs source selection, editorial decisions, and publication boundaries.

## 1. Find the events that changed the experience

Check retrieval readiness:

```bash
ctx status
ctx sources
```

Search several ways: the user's project name, a concrete module or form name, and distinctive failures or repairs. These commands reproduce searches from the worked example:

```bash
ctx search 'webflow template submission form' --refresh off --verbose
ctx search 'template submission' --term 'quill' --refresh off --verbose
ctx show event 25c1295c --window 0
```

Use `--refresh off` when you want to query the existing index without refreshing it. Scope promising results to their session. Open focused events before relying on search snippets; increase the event window when you need the surrounding request or outcome. Use `ctx locate event` when original-source identity matters.

Record each candidate milestone with its date, user-visible problem, change, outcome, and evidence state. Keep proposed, implemented, tested, merged, deployed, and observed live distinct. A later repair can expose a limitation in an earlier fix; preserve that turn in the story.

**Expected result:** enough inspected sources for six to eight meaningful scenes. Do not pad the chronology to reach a panel count.

**If retrieval is incomplete:** report partial refresh, disabled semantic search, bounded results, or unavailable original material. Describe the output as selected documented milestones. Do not invent an origin story or claim today's production state from historical evidence.

## 2. Save the storyboard before drawing

Write the controlling idea in one plain sentence. Name the reader and the thing they should understand afterward.

For the worked example, the idea was: **a reliable form protects the creator's effort at every handoff.** A smiling sheet of paper became the recurring character. The cache boundary became two islands; the signed validation receipt became a ticket that traveled between them.

Build each scene from four parts:

| Part | What to write |
| --- | --- |
| Event | The documented change and its date. |
| Picture | An actor doing something, an obstacle, and a visible consequence. |
| Canvas copy | The exact short heading and caption to draw. |
| Source | A source-ledger key, evidence state, and any limit the metaphor must preserve. |

Save these sections in `storyboard.md`: reader and controlling idea; visual direction; ordered scenes; exact canvas copy; source ledger; uncertainty; editorial review. The ledger should retain provider, CTX session ID, event ID, provider session ID when available, and source cursor or location. Keep raw transcripts, private account identifiers, and credentials out of the deliverable.

Choose a clear reading order. If a panel revisits a date to explain a related repair, make the dates explicit. A metaphor illustrates the documented mechanism; it is not a new anecdote or proof. In particular, a validation ticket must not imply Marketplace approval.

**Expected result:** a saved storyboard that another person could draw without reconstructing the research. Share its link before canvas mutation. Continue to drawing when the request already authorizes both; storyboard-first does not create an extra approval gate.

## 3. Make the pictures carry the explanation

Apply On Writing Well after the facts are established. Give each scene one job. Use concrete nouns and active verbs, remove repeated explanations, and retain qualifications that affect meaning.

Aim for roughly four-fifths of the panel's useful area and attention to be visual. This is a layout and comprehension target, not an object-count test. Hundreds of strokes surrounding a paragraph still produce a text-heavy diagram.

- Use one recurring character, a consistent palette, and recognizable objects.
- Let position and action explain the change: a bridge connects, a ticket travels, an anchor holds, beams support.
- Keep a short heading and one caption per panel. Put detailed causes, release IDs, and citations in the companion storyboard.
- Use color consistently, but also distinguish success and friction through shapes and actions.
- Cover the captions mentally. The pictures should still convey the broad story.

Humor can come from a waiting snail or a worried paper character. Do not invent customer experiences or exaggerate failures to make the story entertaining.

## 4. Inspect and preserve the Draw canvas

Use the browser selected by the user. Reuse its existing tab when available. Inspect the visible page and discover its current WebMCP tools through the browser's supported capability interface. Prefer a page-defined tool when it covers the action.

Read `draw_get_state` before changing anything. Save the returned complete document as `existing-canvas-backup.json`. Inspect geometry, existing object IDs, viewport, and title. `draw_inspect`, when advertised, provides a compact view of palette and visible-world geometry.

Place the new comic in a separate, empty region by default. Measure actual object bounds, including stroke points; do not reuse the worked example's coordinates without checking. Preserve the document title when it still describes the existing artwork, and give the comic its own visible title.

Do not reset or replace existing artwork merely to obtain a blank canvas. If the user requests replacement, follow the current authorization and tool-confirmation rules. A backup is preservation evidence, not permission to delete.

**Expected result:** a backup and a known placement region that does not overlap existing content.

## 5. Create editable ink, then frame the story

Generate native `stroke` objects for illustrations and freehand arrows; use `note` objects for legible captions. This keeps the comic editable with Draw's tools. Discover the current object schemas before constructing payloads. Do not substitute a flattened image when editable freehand work was requested.

Prepare unique IDs for this run and save the planned objects before mutation. Use the current timestamp and palette values. Build small drawing helpers for lines, loose outlines, circles, checkmarks, characters, and arrowheads. Reuse their visual language across scenes.

Apply `put_object` operations through `draw_apply_operations`. Use the current revision token when supported, and inspect mutation receipts before continuing. One small batch is atomic; several batches are not a single transaction. In the worked run, the tool accepted at most 100 operations, so 233 objects were added in batches of 90, 90, and 53. Re-read current limits on future runs.

If a call fails or its result is uncertain, inspect the canvas for the planned IDs before retrying. Reconcile what exists with the saved plan so a retry cannot silently duplicate the story.

Set the viewport to frame the comic after creation. Fit it to the actual browser surface, leaving room for the top bar and floating controls. Inspect a screenshot rather than assuming the viewport math is correct.

**Expected result:** the full story is visible, editable, and separate from the earlier artwork.

## 6. Verify the result and save the handoff

Check both document state and rendered appearance:

- All planned objects exist; their IDs are unique and their geometry is finite.
- Every pre-existing object remains unchanged by ID and value.
- Panel order is clear, captions fit, illustrations do not cross captions, and controls do not cover the footer.
- The story is understandable at the delivered zoom. Inspect closer when small details carry meaning.
- The source ledger supports each historical claim and preserves its evidence state.

Repair only the objects that need adjustment, then inspect the changed region again. The worked example's anchor initially touched its caption; a screenshot exposed the overlap and a focused geometry edit resolved it.

Save this handoff bundle:

| File | Purpose |
| --- | --- |
| `storyboard.md` | Research, exact copy, and source ledger. |
| `story.draw.json` | Complete portable document containing only the new story. |
| `comic-preview.png` | Screenshot of the checked final view. |
| `existing-canvas-backup.json` | Recovery copy of the original document; retain locally. |
| `complete-canvas.draw.json` | Optional full working document with both old and new artwork. |

Prefer the product's native export when it matches the desired scope. If constructing a story-only file from `draw_get_state`, preserve the current document envelope, include all referenced objects, and normalize coordinates and viewport together. Parsing the JSON proves file integrity; it does not prove a fresh import works. Report import testing separately, and never test it by replacing unrelated work.

Mark the Draw tab as a deliverable so it survives the turn. Report the artifact links and whether the result is a local draft or a published view. Creation, preview, and export do not require publishing. Use the product's publication flow only within the user's requested scope, and inspect the resulting view when publication is requested.

## Recover when something goes wrong

| Symptom | Next action |
| --- | --- |
| CTX returns broad or truncated results | Narrow by session, module, or distinctive phrase; open individual events. |
| A source describes a fix but gives no release evidence | Label the milestone implemented or proposed; do not upgrade it to deployed. |
| Browser setup fails | Follow the loaded browser skill's troubleshooting path; keep the user's selected browser. |
| A tab is stale or detached | Obtain a fresh tab handle from the existing browser binding and inspect restored state before editing. |
| A variable no longer exists after recovery | Reconstruct it from saved artifacts and freshly inspected state. |
| A mutation reports a revision conflict | Read current state, reconcile changes, and retry only the remaining intended operations. |
| Tool success produces a clipped or crowded drawing | Check a screenshot; adjust viewport or specific objects, then inspect again. |
| Text dominates the comic | Move explanations to the storyboard and replace them with visible actions. |

## Worked example and completion record

“The little form that learned” was created on September 6, 2026, from selected April–August Webflow template form history. Its eight scenes covered autofill, editor preservation, authoritative name checks, submission wait time, cache locality, signed validation receipts, completion scroll position, and local layout ownership.

The run produced 214 native ink strokes and 19 notes. State comparison confirmed all 58 pre-existing objects remained unchanged. The comic was visually checked after the anchor repair and left as a local Draw draft. The portable JSON was saved; a fresh import was not tested in that run. These counts record this example, not minimums for future work.

The [example storyboard](../examples/draw-storytelling/template-form-storyboard.md) contains the inspected CTX event citations. The [example drawing](../examples/draw-storytelling/template-form-story.draw.json) contains only the new comic; it excludes the unrelated existing canvas. The [preview](../examples/draw-storytelling/template-form-preview.png) shows the checked browser view.

For repository documentation, run the narrow prose check and resolve blocking findings:

```bash
pnpm prose:check -- docs/guides/CTX_TO_DRAW_STORYTELLING_PLAYBOOK.md --format json
```

Completion requires a storyboard saved before drawing and sources that support the story. Confirm the comic is readable and earlier artwork is preserved. Deliver the editable file and preview, and record any untested import or publication step.
