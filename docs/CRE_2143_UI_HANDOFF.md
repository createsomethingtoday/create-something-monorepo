# CRE-2143 implementation handoff

Canonical scope: [Linear CRE-2143](https://linear.app/create-something/issue/CRE-2143).
Execution: [create-something Paperclip CRE-90](https://paperclip.createsomething.agency/CRE/issues/CRE-90).

Implementation is ready for independent review. No merge, deployment, live sharing, agent pairing, or production acceptance was performed. The frozen candidate SHA is recorded in the Paperclip final handoff and branch work product; resolve this document's commit with `git log -1 --format=%H -- docs/CRE_2143_UI_HANDOFF.md`.

## Change

A shared opt-in Canon operator stylesheet aligns Workspace and Draw through dark neutral chrome, project orientation, restrained primary controls, readable metadata, semantic status, and keyboard focus. Workspace replaces the campaign-style picker, puts approvals before history, keeps all three rails accessible on mobile, and removes the invented preview hostname. Draw groups project/mode controls, improves status and inspector readability, and keeps contextual canvas controls usable at 390px.

The two routes' executable `<script>` sections are byte-for-byte unchanged from base. Backend, credentials, security, runtime, document operations, undo, export implementation, and the CRE-2140 native connector were not edited. The shared CSS has no root/global token override; only `.cs-workspace` consumers opt in. See [design contract](CLIENT_WORKSPACE_DRAW_DESIGN_CONTRACT.md).

Changed source:

- `packages/canon/package.json`, `src/lib/styles/workspace.css`: explicit opt-in CSS export and shared chrome/state vocabulary.
- `packages/client-workspace/src/app.css`, `src/routes/+page.svelte`: import, structure, copy and layout.
- `packages/mapping-canvas/src/app.css`, `src/routes/+page.svelte`, `src/routes/page.css`: import, surrounding canvas chrome and responsive layout.
- `packages/mapping-canvas/src/lib/AgentActivity.svelte`, `WorkbenchPanel.svelte`: semantic visual states and inspector readability/empty feedback.
- This handoff and the shared design contract.

## Verification

| Command / check | Result |
| --- | --- |
| `pnpm bootstrap:worktree` | Passed before checks, Node 22.21.1 / pnpm 9.15.0. Bootstrap-generated unrelated lockfile addition removed. |
| `pnpm --filter @create-something/canon package` | Passed; publint all good. |
| `pnpm --filter @create-something/client-workspace test` | 115/115 passed. Initial responsive source-contract failure fixed by restoring explicit width constraints. |
| `pnpm --filter @create-something/client-workspace check` | 0 errors, 0 warnings. |
| `pnpm --filter @create-something/client-workspace build` | Passed, adapter-node. |
| `pnpm --filter @create-something/mapping-canvas test` | 331/331 passed across 29 files. |
| `pnpm --filter @create-something/mapping-canvas check` | 0 errors, 0 warnings. |
| `pnpm --filter @create-something/mapping-canvas build` | Passed, adapter-cloudflare. |
| `git diff --check` | Passed. |

Browser: Ego Chromium, local development servers, 1440×900 and 390×844. Screenshots and fixtures are retained under `output/cre-2143/`. Key desktop/390px screenshots are attached to the Paperclip issue as artifact work products. The complete archive remains local: its upload helper failed twice while creating temporary files, before a usable request was made, and was not retried. These captures are review evidence, not production proof.

Observed checks:

- Both surfaces: viewport and document scroll width equal at 390px; readable empty, active and state-specific controls.
- Workspace real picker: readiness, project list, disabled import, runtime recheck, mobile orientation. Real session-start attempt returned the sanitized error; captured separately.
- Workspace browser-only fixture: request submission, running text, approval paths/reason/scope, accept and decline requests with expected JSON, completion, diff display, failed request, close/reopen, preview frame, mobile section focus, and visible reference-image keyboard focus. The preview identifies itself as a UI fixture. No paid agent turn was run.
- Draw actual local document: rectangle creation, selection, property rename, undo/redo, JSON export and reimport, second-project import and selector switching, fit, Layers search empty state, agent-connection disclosure and Escape focus return, shortcut dialog Escape return, reduced-motion preference.
- Draw agent status: existing registered WebMCP activity tool used locally with explicitly labeled “UI review” activity to exercise waiting/review display. No external agent connection or credentials were created.

## Remaining risks and review path

- Full authenticated Codex session/chat/approval/preview and deployed browser behavior remain release QA gates. Local UI fixtures cannot certify runtime or production acceptance; the real local session-start failure was not investigated by changing runtime boundaries.
- Native Mac/iPhone pairing and phone hardware were not exercised. The native connector remains separately owned.
- No external publish/share mutation was performed. Those handlers and their unit tests are preserved.
- Broad Canon or monorepo checks were not run: the shared change is a new scoped CSS export, verified through Canon packaging and both consuming products.
- At narrow heights, Draw's empty state and inspector scroll inside the available canvas area. The last 12px empty-state offset correction passed build, but the dev browser retained cached CSS in its last capture. Independent review must recapture that state from a fresh build and confirm density on supported phone sizes; the screenshots are not a pixel-exact frozen-build baseline.
- Local dev registry/logs were redirected with `XDG_CONFIG_HOME` and `WRANGLER_LOG_PATH` into the run scratch directory; no application runtime configuration was changed. The runtime shell's existing GitHub environment setup was preserved while appending the pinned tooling path. Browser access used a narrowly scoped approval.

Source review: [create-something CRE-93](https://paperclip.createsomething.agency/CRE/issues/CRE-93), assigned independent reviewer. Production verification: [create-something CRE-94](https://paperclip.createsomething.agency/CRE/issues/CRE-94). Coordinator owns promotion after source acceptance. These tasks were read for handoff; the engineer did not change their status or claim them.

Worktree disposition: retained for review/release at `/private/tmp/cre-2143-paperclip-ui`, branch `codex/cre-2143-paperclip-ui`, base `94ee9cad9d62a81b679dabec2824ee6ccad06373`. Candidate is committed locally; not merged, pushed or deployed. Rendered artifacts remain outside the commit; key screenshots are attached to the issue and the complete archive is retained locally.
