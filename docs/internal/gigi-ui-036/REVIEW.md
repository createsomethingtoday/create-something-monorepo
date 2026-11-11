# CRE-2406: GiGi 0.3.6 selective UI import

## Acceptance established before implementation

- Import the approved navigation, Settings, Today, Gigs calendar, directories, Services, Profile, History, chat and media refinements into the active React/Astryx renderer. Retain Danny’s green direction, saved theme IDs and the public `agency.createsomething.gigi` identity.
- The parent’s scope update explicitly approves the three additions: Money filtering through native `records.list`, Social search through native API/MCP, and saved-place Maps preview/open with Swift helper. This supersedes the earlier HOLD-SAFE exclusions for these three only.
- Filter the complete workspace before pagination; preserve stale-read/workspace fencing, explicit map lookup, no current-location access and unverified-match copy. Do not weaken consent, memory isolation/review, source import idempotency or receipt recovery.
- Include `gigi-map-preview` in first-party executable, signing and hardened-runtime verification. Include Swift build source in provenance/rebuild coverage; demonstrate a meaningful failing-before/passing-after verifier regression.
- Run native relevant tests, JavaScript suite, active renderer suites, web build and Astryx doctor. Directly inspect rendered key states, keyboard, minimum 880×620, saved themes, loading/error and workspace fencing where possible. Distinguish synthetic evidence from native signed MapKit qualification.
- Parent owns independent final re-test, signed native MapKit acceptance, packaging, PR/promotion and Grant setup. No subagents, package creation, publishing, operator-app/profile changes or messages to others.

## Provenance and policy artifacts

- Canonical repo: `createsomethingtoday/create-something-monorepo`; verified `origin/main` = `574adfee269cecf4a17415dcde53f60a6fe06a88`. This isolated checkout was clean and fast-forwarded to that exact baseline before edits.
- Approved source: `gigi-team/grantbot` commit `3982c5b63d50fe9d63a1311bee27d893f50a1238`, verified parent `ee365ca5c71322ca2a4bd11734abc4866c454f56` using GitHub CLI.
- Read source `sandbox/gigi-desktop/UPSTREAM.md`: selective runtime diff only, strip nested prefix; no direct cherry-pick. Reconcile against canonical current source rather than replacing divergent controllers/native code.
- Owning contracts: `AGENTS.md`, `apps/gigi-desktop/AGENTS.md`, `apps/gigi-desktop/DESIGN_FOUNDATION.md`, `.agents/skills/cs-build/SKILL.md`, `.agents/skills/cs-design/SKILL.md`. The existing approved Danny/Astryx foundation and exact approved source are the visual references; this is a bounded import, not new visual direction.
- Database: workspace-filtered records/drafts; Automation: read-only segmentation and explicit saved-place lookup; Judgment: preserve native consent, approval, recovery, identity and memory contracts.

## Accepted / deferred

All app runtime paths in the selected source commit were imported as a reviewed
patch, with the nested prefix removed. `SOURCE.json` records every source path,
its disposition and the source diff SHA-256.

Accepted UI: `ui/{App,appearance,chat,collection-details,conversations,creators,dev-navigation,dev-work,records,settings}.jsx`, `ui/{app.css,controller.mjs,preview-fixture.mjs}`. Accepted harnesses: `scripts/{astryx-refinement-browser,astryx-review-regressions,astryx-rewrite-browser,dev-astryx-quest-browser}.mjs` and isolated `src-tauri/examples/seed_workspace_refinement.rs`.

Approved native/API additions: `src-tauri/src/{finance_list,place_maps}.rs`, narrow dispatch additions in `domain.rs`/`lib.rs`, query-only changes in `social.rs`/`social_mcp.rs`, and `src-tauri/native/MapPreview.swift`. Version declarations are 0.3.6 in the app/plugin/Cargo manifests and Tauri config. Public identifier and CSP are unchanged. No database migrations or other native contracts changed.

Excluded: nested standalone root `package.json` and `README.md`; the latter’s product notes were adapted into the canonical app README. No launcher/DEV identity/configuration import. Existing canonical scripts, dependency pins, notification build, memory, approval, receipt and source contracts are retained. There are no remaining HOLD-SAFE exclusions for the three explicitly approved additions. Signed native qualification, packaging, publishing and Grant setup are deferred to parent.

Local adaptations:

- Reconciled app manifest and quest harness manually rather than replacing their canonical extra scripts/dependency resolution. The new harness resolves existing agency Playwright, not absent nested root dependencies.
- Retained current controller and native source; imported only the focused source delta. Map thumbnails use Astryx layout components rather than imported raw divs.
- Extracted Swift compilation to `scripts/prepare-map-preview.mjs` with an actual macOS 13 arm64 compile/invalid-input smoke test. `build.rs` now watches `native`; compiler output confirms `cargo:rerun-if-changed=native`. The companion preparation path always compiles that exact source. Source SHA/dirty provenance uses the existing tracked app-surface coverage.
- Added `gigi-map-preview` to the existing first-party verifier inventory, which gates signature team, hardened runtime, executable bit, and mounted-DMG equality. Regression covers missing/nonexecutable, ad-hoc, wrong-team, missing-runtime, explicit signature inspection and mounted nonexecutable helper.
- Fixed failed Social search retention: previous results are explicitly labeled, and pagination is blocked until the requested query succeeds. A 55-draft fixture reproduces the missing label before the fix and passes afterward.
- Cleared Money’s retained snapshot across workspace changes (red/green: `money-snapshot-before.txt`, `refinement.txt`); exercised a failed new-workspace read and a late Maps response after workspace transition. Kept saved themes and native consent/import/memory contracts intact.

## Validation and three gates

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Functional correctness | **Passed locally** | Native crate suite, real local stdio tests, actual Swift compile/invalid-input test, JS suite, active React suites, web build, Astryx doctor. Synthetic fixture/provider boundaries remain explicit. |
| Perceptual/product quality | **Passed for viewed Chromium states** | Directly viewed Studio Gigs/Places/chat, Paper Settings and Midnight Profile at CSS 880×620, including map loading/error. Danny’s green frame, Astryx typography, readable task hierarchy and explicit lookup feedback remain. Calendar keeps the existing internal horizontal scroll at minimum width. No signed WebKit, media playback, real Maps output or human acceptance claim. |
| Release readiness | **Untested** | Source scope and permissions checked; no packaged or signed artifact created. Parent owns integration, independent Sol 6.1 final re-test, native signed MapKit qualification, packaging, promotion and Grant setup. |

Local commands and results (pinned bootstrap completed first):

- `bash scripts/bootstrap-worktree.sh`: passed. Root shim was bypassed through the pinned launcher. `agent:claim-worktree --issue CRE-2406 --register-existing --worktree <actual checkout> --base origin/main`: passed.
- `cargo test --manifest-path apps/gigi-desktop/src-tauri/Cargo.toml`: **201 native tests passed**; see `rust.txt`. Includes complete-workspace Money pagination/isolation/local-date semantics, local Social API/MCP query and preserved memory/approval/import/media tests. Local cargo is invoked from `~/.cargo/bin` because it is absent from shell PATH. The initial test build needed an empty ignored `src-tauri/resources` directory; no companion package was created.
- `pnpm --filter @create-something/gigi-desktop test`: **427 passed, 2 skipped** (429 total); installed-artifact skips remain. See `js.txt`.
- `test:rewrite`: 20 routes, 24 appearance combinations; keyboard ArrowDown, Home/End, Escape/focus restore, exclusive menu opening, outside dismissal, saved preferences. See `rewrite.txt`.
- `test:refinement`: 14 checks including failed detail reads, segment read retention, unsent chat starters, History reopening, map invalidation, Social initial loading, failed search pagination and workspace fencing. See `refinement.txt`.
- `test:creators`, `test:review-regressions`, `test:reconciled-work`, `test:reconciled-quest`: passed. Evidence in the corresponding text files. These exercise actual React with synthetic bridge/provider fixtures; the preserved work suite also exercises isolated native domain contracts.
- `build:web`: passed; existing dependency `use client` bundler warnings only. The production fixture exclusion remains covered by rewrite suite. See `build.txt`.
- `astryx doctor --built dist`: **20 passed, 0 failed, 2 warnings**. Font/build-output source-inspection limitations remain. A second `--built .` source audit also passed with 3 warnings, including 338 advisory component/styling/icon findings across the existing renderer; this is not a claim of zero Astryx advisory debt. See `doctor.txt` and `doctor-source.txt`.
- `prepare-map-preview.test.mjs`: actual macOS 13 arm64 build, ABI target inspection and malformed-input exit checks passed without a Maps lookup. See `map-build.txt`.
- Verifier red/green: the new helper cases failed against the original inventory and passed after the inventory fix. See `verifier-before.txt`, `verifier-after.txt`. Social retention red/green: `social-before.txt`, then `refinement.txt`.

Direct captures: `lastSnapshot.png` (Paper Settings), `profileSnapshot.png`
(Midnight Profile), `placesSnapshot.png` (Studio Places), `mapLoadingSnapshot.png`,
`mapErrorSnapshot.png`, `chatSnapshot.png`. All synthetic. Browser was closed and
the local preview server stopped after inspection.

Protected-source readback: `CONSTRAINTS.json` records SHA-256 equality to canonical main for every unchanged native source, legacy web model, integration and ChatGPT connection file. Tauri configuration is byte-equivalent as parsed JSON apart from version. Only the four reviewed dispatch/query native files differ among preexisting Rust runtime sources.

## Parent handoff and rollback

No implementation blocker remains. The parent must independently re-test the
actual integrated source against acceptance, then qualify the exact signed native
helper and Maps behavior before packaging/release. In particular: first-party
signature/runtime checks, fixed saved-place query/no current location, preview
success/error and open-in-Maps in the shipped WebKit host. Do not infer native
acceptance from the 1px synthetic preview image or compiler success.

Rollback is a source revert of this selective import before packaging; no schema
migration or operator profile change was made. Production rollback remains the
parent’s previous immutable installer/artifact workflow.


Worktree disposition: retained at the T3-created `t3/gigi-ui-036` checkout for parent integration.
