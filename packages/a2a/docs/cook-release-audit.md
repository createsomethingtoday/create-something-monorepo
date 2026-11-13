# Cook UI release audit

2026-11-13. Independent source and artifact audit of the uncommitted A2A UI changes on `codex/CRE-2430-agent-worktree`, including `web/inbox-view.ts`, `web/motion.ts`, fixtures, package metadata and lockfile. The parent owns integration, PR, deployment and live verification. No release blocker found; the scoped artifact is cleared for that authorized promotion path.

Acceptance: preserve owner/work-request boundaries and authentication; keep search/counts honest about loaded history; retain closed drafts within the tab; make motion optional without delaying actions or focus; exclude synthetic fixtures from production; preserve existing resources and data on deployment/rollback.

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Functional correctness | Passed for local evidence | Independently ran pinned-bootstrap package check, 111/111 tests and production build; all exited 0. Read current action handlers and projection/motion implementations. These checks do not prove live sessions or provider delivery. |
| Perceptual/product quality | Untested by this source auditor | Reviewed `cook/MOTION.md`, `cook/MOTION_REVIEW.md` and `cook/motion-independent-review.md`. Existing independent actual-browser review passes the bounded six-width, focus/draft, optional-loading and preference-change criteria. This audit did not open a browser and does not replace that evidence or claim Cook's full stretch target. |
| Release readiness | Passed for scoped PR/deployment preparation | Backend, auth, migrations, container and Wrangler config are unchanged. Built assets contain no review-host/fixture markers. Production readiness and acceptance remain conditional on the parent's exact merged artifact and live readback. |

## Findings

- Search/counting are projections over loaded messages, explicitly disclosed in UI; the count includes outgoing-only threads and does not imply unread state. Rendering continues to use text nodes for message content.
- Owner submission retains the existing endpoint, message kind, thread and idempotency fingerprint. Conversation and request feedback remains distinct. No changes to work approval, claim policy, session enforcement, retention or grants.
- Draft snapshots are keyed by inbox/thread and keep text, recipient, kind and retry identity. Close retains the snapshot; successful posting removes it. This is memory-only retention, accurately disclosed. Reload, sign-out and inbox-context reset are not durable draft storage guarantees.
- Motion installs feedback/scroll listeners without preventing native events or intercepting actions. GSAP is lazy and failure leaves content readable. The production build includes a separate 27.56 kB gzip GSAP chunk; actual device/network performance remains unmeasured.
- Correction after CI: the initial source audit missed a duplicate A2A importer in the lockfile. Existing installed dependencies let check/test/build pass while clean CI installs failed YAML parsing. The duplicate was removed; GSAP now adds only three lines to the original importer. Independent Sol6.1 re-testing reproduced the failing parse, verified the corrected strict parse and all12 manifest entries, and completed a fresh filtered frozen install with pnpm9.15.0 (458 packages, GSAP3.15.0, unchanged lock hash). Package check/test/build also pass. Clean remote CI remains required; the initial claim of importer consistency was insufficient.
- Review server/fixture scripts are local tooling outside Vite's `web` inputs. A search of rebuilt `dist/client` found no `ui-review`, `__fixture`, `fixture-canon`, `fixtureXSS` or review-host address. Their synthetic data is not a production send path.

## Promotion and rollback constraints

Follow `release-runbook.md`'s current-resource upgrade path: capture the immediate prior Worker version and sanitized settings, deploy the exact merged source with project-local Wrangler, `--keep-vars`, `--containers-rollout none`, and `BUILD_REVISION:<merged SHA>`. This UI pass requires no provisioning, schema migration, Identity change or container rebuild. Verify that integrating the unrelated latest main commit preserves the reviewed A2A source; rerun affected checks if that integration changes it.

After deployment, independently read the revision/discovery and actual landing/owner-console assets and behavior. Do not manufacture production correspondence or shared documents for verification. Keep real sends, host wake, provider receipts and owner acceptance separate from local fixture results. Roll back application code to the captured immediate predecessor if required; retain D1 data, existing schema, credentials and container configuration. Record the final version, live limits and worktree disposition in Linear.
