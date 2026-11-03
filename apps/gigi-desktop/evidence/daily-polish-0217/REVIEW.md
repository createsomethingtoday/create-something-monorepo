# GiGi 0.2.17 daily-use polish — CRE-2306

Historical 0.2.17 candidate review; corrected release is 0.2.18 (see ../daily-polish-0218/RELEASE.md). Independent Sol re-test and signed app/DMG qualification subsequently passed; see RELEASE.md and release-qualification.json.
No production installation, real profile, source grant or provider write is part of this implementation pass.

## Acceptance criteria

1. Today exposes New task beside New gig, using the existing protected editor. Keyboard entry focuses Title; navigation cannot discard an unfinished draft without confirmation.
2. At the supported 880 × 620 minimum window and 1280 × 840, Today uses two record columns where space permits, preserves readable wrapping and all content/actions, and respects comfortable/compact spacing. Studio/Paper/Midnight, typography, navigation and domain vocabulary remain established.
3. Error feedback remains available until explicitly dismissed or replaced by a newer notice. Dismissal returns focus to the editor, visible chat or main content. Successful messages still expire; expiry cannot remove a focused dismiss control or a newer same-worded notice.
4. An empty failed attention read never claims the workspace is caught up; retry remains available.
5. No changes to SQLite/domain operations, authentication, source imports, notification authority or approval/readback contracts. Synthetic profiles only.

## Evidence and design decisions

CTX status/search ran before edits. Search is ready with 1,318 skipped histories and stale blame data; histories are context rather than production proof. Checked current origin/main `9f8ec31ce8d997b2f08dc16c7a69295d1f1dd35f`. Parent dirty/stale checkout was preserved.

Canon design review house rules, Performance Lab language/sharpness and GiGi surface policy informed the pass. Existing local semantic theme roles remain authoritative. Removed the repeated attention eyebrow and populated-feed introduction; kept record details, action text and approval-boundary footer. Adjusted repeated spacing and card hierarchy rather than replacing palette, fonts or global navigation.

TASTE packet: `/tmp/gigi-polish-taste.json`. Actual Are.na block display images were downloaded to temporary files and viewed; no third-party reference media is checked in.

| Reference | Why | Adopt/adapt | Avoid | Source |
| --- | --- | --- | --- | --- |
| OP–XY guide, Clean | Inspected image uses aligned groups and clear separation | Adapt consistent gaps and quieter repeated chrome | Its tiny, low-contrast labels and hardware diagram layout | https://www.are.na/block/44776050 / https://teenage.engineering/guides/op-xy |
| kentaro, Clean | Inspected image uses a steady two-dimensional product grid with labels beneath | Adapt useful width for repeated records and stable alignment | Plugin appearance, assets, product composition | https://www.are.na/block/44775476 / https://kentaro.tools/ |
| Gemini visual design, Interface Motion | Metadata only; display/original GIF fetch failed | No motion claim or implementation derived from it | Gradients, identity or inferred motion | https://www.are.na/block/42957339 |

Only two images were inspected; third reference media is unverified. The required task decision was resolved by direct GiGi rendering, without adding unrelated references.

## Functional gate

- Meaningful regression checks failed before fixes: save error disappeared after timer; unavailable empty attention claimed caught-up. Tests are preserved in `web/reliability.test.mjs` and `web/attention.test.mjs`. Red/green summary: `regressions.txt`.
- `node scripts/daily-polish-browser.mjs` runs actual app modules/CSS in an offline Chromium fixture. Every native operation is denied; all network traffic is intercepted. Matrix: three themes × 880/1280 × comfortable/compact. Checks two-column fit, no horizontal overflow, New task Title focus, unsaved-change dialog/Escape, persistent error after six seconds, dismissal/focus recovery, focused success retention, More arrows/End/Escape, empty/error and Appearance at 880. Reduced-motion preference is set throughout. Screenshots are fixture evidence, not native or provider acceptance.
- Matched fixture attention panel: baseline about 475 px; candidate 368.5 px. Minimum-width populated Today full-page height drops from about 2010 px to 1570 px while preserving record content.
- Native and final full-suite results are recorded in `validation.txt` after candidate review.

## Perceptual/product gate

Direct image inspection covers baseline Studio at 880; candidate Studio, Paper and Midnight at 880/1280; compact density; error draft, empty attention and Appearance. The existing operator language and theme identity remain intact. Record titles wrap rather than truncate. New task is secondary to New gig. No decorative motion added.

Native exact-candidate review and its limits are recorded in `validation.txt`. No screen-reader speech-output acceptance is claimed; broad app-level live announcements were replaced by local status/alert semantics.

## Release readiness

0.2.17 version synchronized in desktop package, Cargo lock/package, Tauri config and bundled agent manifest. App/DMG build is a local ad-hoc candidate. Parent owns independent Sol 6.1 re-test and production qualification. The current public 0.2.16 immutable release is rollback; installed `/Applications/GiGi.app` was reported as 0.2.15 and is not used as candidate evidence.

Promotion: commit clean source, build release with provenance, sign both MacOS executables and Resources companions (Bun allow-jit; native notification dylib), verify companions, notarize/staple app and DMG with Create-Something profile, verify exact hashes. Publish immutable `releases/gigi/0.2.17` to `create-something-assets`, update `packages/agency/src/lib/data/gigiBeta.ts`, deploy and independently verify canonical download/version/hash. Never overwrite 0.2.16. Human/native notification-click and live Google acceptance retain their existing boundaries.

Worktree disposition: retained at `/Users/createsomething/.t3/worktrees/create-something-monorepo/t3-50058674`, branch `t3/gigi-daily-polish`, until parent independent review and release.
