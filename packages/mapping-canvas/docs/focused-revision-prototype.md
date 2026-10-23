# Focused revision — local prototype

This branch is a separate review artifact, not a production feature. It is based on source `d4b5f215749cde8a82d7050c7afe8a78bd60b501`. It does not include the completed-activity obstruction fix, does not establish a current native release, and does not change the frozen comparison.

Open the development server with `/?revisionPrototype=1`. Use Select/Layers to select individual plain notes, then choose **Revise selection** in the inspector. The request is explicitly two literal fields: **Find exact text** and **Replace with**. No AI or network service interprets this request. Preview lists affected IDs/names and complete before/after text; selected marks, rich notes, hidden and locked elements are excluded/preserved. Group selections are refused rather than expanded. No document/history/storage mutation occurs before **Accept revision**.

Accept uses the existing atomic `draw_patch_objects` path with the captured `expectedRevision`. The app rechecks it inside the existing serialized mutation queue and rejects active human gestures/buffered note edits. A changed request, selection, document or viewport makes the preview stale: review a new preview, never silently rebase it. An explicit invalid/no-match request is inert. The prototype retains current view, IDs, order, connectors, geometry, styles and independent annotations.

**Undo revision** uses the existing receipt-bound `draw_revert_change`, not a whole-canvas snapshot restore. It preserves later unrelated annotation edits and refuses after an affected note/dependency changes. The in-memory receipt can expire or disappear on reload/project change. The UI reports conflicts/expiry and never replays automatically. Standard Canvas Undo remains separate. This local prototype supports at most 20 matching notes and a 1 MiB full document, keeping the normal bounded targeted-Undo receipt within the existing journal budget; note output is capped at 4,000 characters.

Keyboard: opening focuses Find; Escape/Cancel discard only the preview and restore the trigger; Accept moves focus to targeted Undo, successful Undo returns it to Preview; Enter/Space activate native buttons. The local non-modal panel contains its keyboard/clipboard events so existing global Canvas shortcuts cannot mutate artwork while using the request controls. It uses the existing scrolling inspector, including the narrow-screen Layers sheet, rather than a new canvas overlay. Before/after text may require scrolling on phones.

## Safety boundary

Both `import.meta.env.DEV` and an explicit URL opt-in are required, with native bridge/non-web roles excluded. The component is dynamically imported only inside the DEV branch; production builds omit its implementation markers and cannot enable it with the query. No model/provider, new endpoint, credential, grant, native approval bypass, persistent proposal schema or new history system is added. Native selected-layer proposals remain on their existing trusted owner-review path; this prototype does not claim native behavior.

## Reproduction and evidence

Run repository `pnpm bootstrap:worktree` first; it completed here with pinned Node 22.23.4 / pnpm 9.15.0. In the package:

```sh
pnpm test
pnpm check
pnpm build
CANVAS_URL=http://127.0.0.1:5202 pnpm verify:focused-revision
# After serving the production build separately:
CANVAS_URL=http://127.0.0.1:5203 EXPECT_PROTOTYPE_ABSENT=1 pnpm verify:focused-revision
```

The browser verifier uses installed Chrome (`CHROME_CHANNEL=chrome`, default), a fresh temporary isolated context, synthetic notes/ink/connector/rich-note fixtures and the actual registered Draw tool functions. It never publishes or touches existing user canvases. It writes ignored evidence under `output/focused-revision/`.

A public-interface red check failed on unchanged Draw because **Revise selection** did not exist, before implementation. Final unit/API tests exercise literal substitution, non-mutating preview, protected elements, stale/tampered plans, actual atomic patch and receipt revert, later unrelated annotation retention and conflicting Undo. Real browser checks cover explicit preview, Cancel/Escape/focus, stale request/selection/document, Accept exact scope/viewport, later annotation edit, conflict refusal, no-match errors, mobile 390×844 scrolling/keyboard, reload and default opt-out. Production bundle and production-page gates independently verify exclusion. No test weakens existing checks.

Functional correctness is passed for the bounded synthetic browser fixture; perceptual/product review covers desktop/mobile screenshots and actual interactions, not human usability research. Independent Sol 6.1 retest and parent PR review remain separate gates. Release readiness is **not applicable**: this is not approved for production/native distribution. Linear key and CTX retention-lease blockers are recorded by the parent; no credential lookup or alternate tracker was used. Worktree disposition: retained on `codex/draw-focused-revisions-prototype-20261023` for separate review.

Final recorded results: 425 package tests across 38 files passed; Svelte check 0 errors/0 warnings; production build passed; 20 real-browser assertions passed with no page errors; local production page refused the opt-in and built artifacts contained no prototype markers. Desktop conflict and mobile preview screenshots were directly inspected. Final tests/check/build used pinned Node 22.23.4; initial exploratory browser development also used installed Node 26.11.0.
