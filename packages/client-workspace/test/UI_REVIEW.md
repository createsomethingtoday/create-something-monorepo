# Isolated UI review demo

Run from the claimed worktree after `pnpm bootstrap:worktree`:

```sh
pnpm --filter @create-something/client-workspace exec node test/ui-review-server.mjs
```

Open `http://127.0.0.1:4326`. Stop with Ctrl-C. The server binds loopback with a strict port and owns no child agent or project-preview process. It does not import the real page loader: its development-only Vite plugin replaces that loader and handles every `/api/` request with in-memory fixtures. No credentials, Codex process, delivery, managed root, or production service is used. The product build never imports this script. Every rendered page carries **LOCAL UI DEMO · fixture data**.

This is UI evidence only. It cannot establish authenticated production access, real agent edits, signature verification, checkpoint recovery, or deployment acceptance.

- `/`: one project, ready runtime. Open, enter an edit request, Send, then Approve or Decline. Accept updates the fixture diff and embedded preview; decline leaves source unchanged. Reload exercises the product's receipt and local-prompt restoration.
- `/?empty`: no projects; signed-import guidance remains available.
- `/?multiple`: two project choices, search/filter, and no-match recovery. The second project is a selection-layout fixture; only the first project has the session fixture.
- `/?unavailable`: runtime readiness blocks Open. Recheck returns the ready fixture.
- POST `/__review/state` with JSON `{ "status": "closed", "preview": "stopped" }`, then reload an opened session, to inspect a read-only receipt. Use `status: "running", preview: "crashed", approval: true` for a pending decision and failed preview. `delayMs: 5000` holds the next Open response for a loading-state capture. `failNext: true` makes the next API request return a sanitized error. These controls exist only in this test server.
- History returns an empty result. Delivery/checkpoint mutations are deliberately unsupported and return the safe error response; this demo does not certify those operations.

Review at 1440×900, 390×844, and 320×640. Check that Open and Send are visible, the document does not overflow horizontally, Tab reaches the reference input with a visible ring, Enter on navigation focuses the target heading, and Escape closes Session and returns focus. Check approvals before and after resolution, focused diff, preview refresh, reload, empty/error/read-only states, and reduced-motion navigation.
