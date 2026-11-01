# CRE-2146 Client Workspace implementation handoff

Canonical scope: [Linear CRE-2146](https://linear.app/createsomething/issue/CRE-2146). Execution: [create-something Paperclip CRE-102](https://paperclip.createsomething.agency/CRE/issues/CRE-102). Independent review: [CRE-106](https://paperclip.createsomething.agency/CRE/issues/CRE-106). Production QA: [CRE-103](https://paperclip.createsomething.agency/CRE/issues/CRE-103).

Candidate is local and ready for independent review. The engineer run was interrupted by host ENOSPC before commit; the coordinator verified the process was gone, removed its queued retry through Paperclip, took ownership of the final handoff, and reran Svelte check/build successfully after capacity recovery. The115-test and browser matrix evidence comes from the engineer run; final check/build logs are in the evidence archive. The exact commit SHA is recorded in the native Paperclip handoff; `git log -1 --format=%H -- docs/CRE_2146_UI_HANDOFF.md` resolves this document's candidate. Coordinator owns reviewer activation, merge, deployment, rollback preparation, and authenticated live verification. No push, merge, deployment, production mutation, or live-runtime edit was performed.

## Reference and concrete gaps

Inspected the real local Paperclip dashboard at `http://127.0.0.1:3101` on 2026-09-28 UTC and the unchanged Client Workspace source rendered through the isolated UI demo. Reference and before/after screenshots are in the attached evidence archive. The exact production hostname `https://client-agent.createsomething.agency/` reached Cloudflare Access in the engineer browser; no authenticated production baseline is claimed. The coordinator supplies that baseline.

| Existing rendered gap | Implemented improvement |
| --- | --- |
| Start screen splits an oversized introduction/readiness column from project selection. | One restrained introduction, a compact full-width project list, readiness below, secondary signed-import disclosure. Search appears only when multiple real choices exist, with explicit no-match recovery. |
| Three equal session rails leave a mostly empty activity column while preview is narrow. | Conversation and preview form the primary two-column work area. Review decisions, activity, history, diff, and delivery controls follow in one evidence section. |
| Section navigation is a loose horizontal row; location and project context lack a persistent home. | Compact desktop navigation rail, current project, active section treatment, explicit close-and-switch action; sticky narrow-screen section links with pending-decision count. |
| Reset and Close compete with status in the top bar. | Native Session disclosure separates lifecycle operations; Escape closes it and returns focus. Existing handlers are retained. |
| Repeated Intent/Evidence/Result and numeric rail headings consume space. | Single compact headings, consistent borders and spacing, disclosed activity history, no-decision feedback. |
| Tall composer and mobile header delay Send. | Three-row composer and compact responsive header; at 320×640 the initial Send control ends at approximately y=553. |

Canon Performance fonts, palette, semantic states, and blue focus ring remain authoritative. No Paperclip layout source or assets were copied. Mobbin was not used: the existing journey, explicit live Paperclip reference, Canon house rules, Performance Lab language, and task-surface sharpness contract provided the decision context. ctx history was unavailable because its verified search index could not be read; prior shipped decisions were read from the checked-in design contract and handoff.

## Scope and preserved behavior

Product source changes are confined to `packages/client-workspace/src/routes/+page.svelte`. UI script additions handle project filtering, section focus, and disclosure Escape. Existing API requests, SSE normalization, conversation reconstruction, approval decisions, image upload, diff refresh, preview sandbox expression, receipt restoration, close/reset, checkpoint/update/rollback, and receipt export remain intact. No backend, security, credentials, trust roots, native connector, shared Canon, Draw, global palette, or font files changed. Draw nonregression is bounded by zero changes to Draw or its shared dependencies; its checks were not rerun.

Desktop review moves below the main work area. The persistent Review link and pending count compensate for the vertical move; all sections remain mounted. Narrow screens keep conversation → review → preview in DOM order. This is browser-emulated mobile evidence, not physical-phone acceptance.

## Validation

- `pnpm bootstrap:worktree` passed before checks using Node 22.21.1 / pnpm 9.15.0. The runner's Bash startup PATH initially obscured the pinned tools; bootstrap used a command-local empty BASH_ENV and explicit pinned PATH. No repository bootstrap or global tooling edits were made. Expected unrelated workspace-bin warnings occurred; no lockfile delta remains.
- `pnpm --filter @create-something/client-workspace test`: 115/115 pass.
- `pnpm --filter @create-something/client-workspace check`: zero errors, zero warnings after final responsive correction.
- `pnpm --filter @create-something/client-workspace build`: adapter-node build passes.
- `git diff --check`: passes.
- Ego Chromium primary matrix: 1440×900, 390×844, 320×640; project/open, focused session entry, reference-input keyboard ring, persistent approval count, Review/Preview Enter focus, Approve → diff/preview refresh, reload prompt/diff restoration, Session Escape return. Primary actions visible and no horizontal document overflow.
- State matrix at all three sizes: empty projects, unavailable runtime/disabled Open, safe failed-open error and retry, opening, Decline with no diff, failed-preview recovery, read-only receipt/disabled Send, and no overflow. Additional search/filter/no-match/clear, history empty result, reduced-motion navigation, and safe lifecycle error checks pass.

All Client Workspace browser evidence uses **LOCAL UI DEMO · fixture data**, with a loopback-only test server documented in `packages/client-workspace/test/UI_REVIEW.md`. It renders the actual route while replacing only its development loader/API responses. This proves UI wiring and state rendering, not real Codex execution or authenticated runtime qualification. The prior live runtime is untouched, including the unrelated process occupying port 4310.

Evidence under `output/cre-2146/` includes the Paperclip reference, unchanged baseline, candidate screenshots, browser scripts/assertion JSON, and check/test/build logs. Generated files remain outside the source commit and are uploaded to the native issue for review. The interrupted engineer server is no longer running at handoff; the reviewer can restart it using UI_REVIEW.md.

## Promotion and worktree disposition

Coordinator must compare its authenticated production baseline, obtain exact-source/rendered approval from CRE-106, and verify the exact deployed release at the canonical hostname through CRE-103. Real agent edit/approval execution and delivery/checkpoint qualification are not certified by the fixture. Preserve existing production source/deployment identity and rollback before promotion. This candidate can be rolled back by reverting its UI/docs/test-harness commit; no backend or data migration is involved.

Worktree disposition: retained for review at `/var/folders/5v/bcpy60z558b1y2jctfx6108m0000gq/T/cre-2146-agent-worktree`, branch `codex/CRE-2146-agent-worktree`, base `97eda72`. Old CRE-2143 worktrees are preserved.
