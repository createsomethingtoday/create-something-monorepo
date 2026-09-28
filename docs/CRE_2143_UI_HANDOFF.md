# CRE-2143 implementation handoff

Canonical scope: [Linear CRE-2143](https://linear.app/create-something/issue/CRE-2143).
Execution: [create-something Paperclip CRE-90](https://paperclip.createsomething.agency/CRE/issues/CRE-90).

Implementation is ready for independent review. This revision supersedes candidate `593e4ecc9ec07e15911308730efd7589ab57be9d`, retains its eight coordinator fixes, and addresses the additional Publish hover and mobile keyboard-evidence findings from the [CRE-93 independent review](https://paperclip.createsomething.agency/CRE/issues/CRE-93#document-independent-review). The exact revised SHA is recorded in the Paperclip final handoff and branch work product; resolve this document's commit with `git log -1 --format=%H -- docs/CRE_2143_UI_HANDOFF.md`. No merge, push, workflow dispatch, deployment, external sharing, or production acceptance was performed by the engineer.

## Change

Shared opt-in Canon operator chrome aligns Workspace and Draw through neutral surfaces, persistent project identity, compact typography, semantic status, and keyboard focus. Workspace retains conversation, approvals, activity, diff and embedded preview. Draw retains the canvas as its working surface, with grouped project/mode controls and a readable inspector.

Review changes:

- Final contrast correction: a scoped primary hover/focus rule wins over generic button hover, preserving the inverse foreground/background pair. Actual app normal, hover, keyboard focus, combined hover/focus, disabled hover and mobile focus were inspected without publishing. Enabled text remains `rgb(13,13,13)` on white (19.44:1); keyboard outline is `2px solid rgb(167,184,255)`. Disabled appearance retains opacity0.35. This last source delta is CSS only.

- Workspace project selection precedes readiness in DOM and mobile reading order. Open workspace is fully visible at y=535 on 390×844 and y=559 on 320×640. The checked-in demo is labeled Demo frontend, with no signed-delivery claim. Project identity remains visible in an opened mobile session.
- Signed import is a secondary native disclosure. The labeled file input keeps keyboard behavior, uses a styled file-selector button, explains verification, and announces the chosen filename. Import handlers are unchanged.
- Draw's inspector closes when crossing into the ≤820px layout, including resize/rotation. Users can explicitly reopen it. Escape from the inspector or its toggle closes it and returns focus; unrelated canvas keyboard handling is preserved. The optional empty-state guide is omitted when the canvas is shorter than 360px so it cannot obscure controls.
- `.github/workflows/draw-pages-deploy.yml` adds the explicitly requested manual production release path. Only `workflow_dispatch` is enabled. It rejects non-main dispatches, checks existing Cloudflare secrets without printing them, checks out `github.sha`, uses the pinned actions/toolchain from Agency, installs frozen dependencies, packages Canon, checks/tests/builds Draw, then deploys the exact SHA to `create-something-mapping-canvas` on `main`. Deployment outcome, SHA and output are persisted in the job summary. Coordinator dispatches only after independent review and merge.

Workspace's executable route script remains unchanged from base. Draw's route script adds only responsive inspector lifecycle/focus handling. Backend, credential, security, runtime, document/edit/undo/export implementations, and the CRE-2140 native connector were not edited. Shared tokens remain opt-in under `.cs-workspace`. See [design contract](CLIENT_WORKSPACE_DRAW_DESIGN_CONTRACT.md).

Changed files relative to base:

- `packages/canon/package.json`, `packages/canon/src/lib/styles/workspace.css`
- `packages/client-workspace/src/app.css`, `packages/client-workspace/src/routes/+page.svelte`
- `packages/mapping-canvas/src/app.css`, `packages/mapping-canvas/src/routes/+page.svelte`, `packages/mapping-canvas/src/routes/page.css`
- `packages/mapping-canvas/src/lib/AgentActivity.svelte`, `packages/mapping-canvas/src/lib/WorkbenchPanel.svelte`
- `.github/workflows/draw-pages-deploy.yml`
- `docs/CLIENT_WORKSPACE_DRAW_DESIGN_CONTRACT.md`, this handoff

## Verification

| Command / check | Result |
| --- | --- |
| `pnpm bootstrap:worktree` | Passed before checks in both runs; Node 22.21.1 / pnpm 9.15.0. No lockfile changes retained. |
| `pnpm --filter @create-something/canon package` | Original shared CSS export passed packaging and publint; unchanged in revision. |
| `pnpm --filter @create-something/client-workspace test` | 115/115 passed again. |
| `pnpm --filter @create-something/client-workspace check` | 0 errors, 0 warnings. |
| `pnpm --filter @create-something/client-workspace build` | Passed, adapter-node. |
| `pnpm --filter @create-something/mapping-canvas test` | 331/331 passed across 29 files again. |
| `pnpm --filter @create-something/mapping-canvas check` | 0 errors, 0 warnings, including final responsive handling. |
| `pnpm --filter @create-something/mapping-canvas build` | Passed, adapter-cloudflare, including short-height refinement. |
| `pnpm install --frozen-lockfile --ignore-scripts --offline` | Passed dependency/lockfile preflight; expected unrelated unbuilt workspace-bin warnings. No lockfile change retained. Lifecycle scripts were not rerun by this preflight. |
| Workflow validation | YAML parsed; all action refs are full SHAs; exact checkout SHA asserted; all bash blocks pass `bash -n`; main/manual success and non-main/non-manual rejection exercised; missing token/account combinations fail. No deploy command invoked. |
| Final CSS correction | Bootstrap, Draw check (0 errors/warnings), build and rendered state/contrast assertions passed. Existing 446 test results above are from candidate593e4ecc9; unchanged logic did not warrant rerunning them for two CSS lines. |
| `git diff --check` | Passed. |

Browser: Ego Chromium. Final contrast/keyboard screenshots use `-final.png`; the previous revision's screenshots use `-revised.png` under `output/cre-2143/`. Earlier screenshots are retained as historical evidence and are not the revised visual baseline. Key revised screenshots and the evidence archive are attached to the Paperclip issue. Local evidence includes the scratch-only preview-port harness and verification notes. No browser response fixture was used for revised session captures.

Revised browser checks:

- Corrected `client-keyboard-mobile-final.png` and `draw-keyboard-mobile-final.png` are verified 390×844 PNGs, not desktop images. Workspace capture uses a real session and Tab navigation to the reference-image file input. The old mislabeled image is renamed `client-keyboard-desktop-historical.png` in the new archive. `draw-empty-mobile-final.png` is a clean fresh-server 390px empty state with File closed. Numeric control-state readback is retained in `publish-control-states.json`; disabled state was set temporarily in the browser DOM only, with no publish action.

- 1440×900 desktop, 390×844 mobile, 320×640 small viewport, and 844×390 landscape. No horizontal document overflow observed. Project action is above the mobile fold.
- File control keyboard focus is visible; label/described-by and selected filename feedback are retained; selecting a local fixture enables import. No delivery was imported.
- Real local Codex session opened in ready state; iframe rendered the checked-in Northstar demo and returned HTTP 200. Captures: `client-session-desktop-real-revised.png`, `client-session-mobile-real-revised.png`, `client-preview-mobile-real-revised.png`. Iframe sandbox remains `allow-scripts allow-same-origin`. Mobile Preview navigation focuses the heading. The session was closed through the UI; no paid edit turn was submitted.
- Draw: focused desktop inspector →390px closes and moves focus to Layers; explicit reopen and Escape return pass. Landscape/portrait transitions preserve closure. Fresh short-height captures verify that the optional guide no longer overlaps controls. At 390px the guide remains available and scrolls within its own area.
- Existing first-run actual Draw checks remain applicable: rectangle creation, property rename, undo/redo, JSON export/import, project switching, fit, Layers search, agent disclosure, keyboard and reduced-motion behavior. Existing registered activity tools exercised explicitly labeled UI-review states without an external agent connection.
- Earlier Workspace running/chat/approval/decline/diff/error states remain **browser-only fixture evidence**, accurately named `*-fixture.png`; they do not certify live Codex edit execution. The old attempted-session error capture is `client-start-error-desktop.png`, never represented as an opened session.

## Runtime and baseline distinction

Coordinator supplied live Draw and Paperclip reference screenshots; both were inspected. Coordinator's initial production Open workspace attempt returned “That workspace is not available.” Their 23:40 UTC retry succeeded with session POST201, ready state, and embedded preview200, then was closed. That initial production failure was transient; its cause was not established and no backend fix is inferred.

Our first-run local start failed under the default managed-root configuration. During this revision, the local server used the existing `CLIENT_WORKSPACE_MANAGED_ROOT` setting pointing to this checkout's checked-in demo and a run-owned state directory. Since port4310 was occupied, a scratch Vite review harness changed only the demo preview port to4319 in memory. No runtime source/configuration was committed or production process changed. A sandboxed local attempt still returned a sanitized failure; narrow approval for the review server's normal Codex session-store access allowed the subsequent real session to open. This does not establish the cause of the earlier production failure. No auth, approval, filesystem-boundary or credential policy was relaxed.

## Remaining risks and review path

- Independent source review and post-promotion browser acceptance remain separate gates. The new release workflow has not run on GitHub; actual repository secret permissions and deployment behavior must be verified by the coordinator during release.
- Full live edit/approval execution remains release QA; opening a real session and preview does not certify paid edit turns. Earlier UI fixtures provide only state-rendering evidence.
- Native Mac/iPhone pairing and physical phone hardware were not exercised. The native connector remains separately owned. No external publish/share mutation was performed.
- Broader monorepo checks were not run; the shared change is a scoped CSS export verified through Canon packaging and both consuming products.
- Local logs/state and development registry paths use run scratch. The runtime shell's existing GitHub environment setup is preserved. Browser/runtime/git access uses narrow approvals. Source worktree is retained; generated screenshots and harness stay outside the candidate commit.

Source review: [create-something CRE-93](https://paperclip.createsomething.agency/CRE/issues/CRE-93), assigned independent reviewer. Production verification: [create-something CRE-94](https://paperclip.createsomething.agency/CRE/issues/CRE-94). Coordinator owns promotion. Engineer did not claim or change those assignments.

Worktree disposition: retained for review/release at `/private/tmp/cre-2143-paperclip-ui`, branch `codex/cre-2143-paperclip-ui`, base `94ee9cad9d62a81b679dabec2824ee6ccad06373`. Candidate is local, not merged, pushed or deployed.
