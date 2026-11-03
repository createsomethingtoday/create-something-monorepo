# Preference rollback compatibility — CRE-2308

Acceptance: saving extended chat preferences must leave the v1 payload readable by0.2.18; old-version edits must survive re-upgrade without discarding chat settings; invalid extension data and failed saves must preserve core choices; workspace isolation, reset and strict import remain intact.

Review4433788195 reproduced against a frozen copy of the0.2.18 preference module from main bfcc57b57 (scripts/fixtures/preferences-0218.mjs). The old reader returned defaults after a new save. Red log retained. Core preference fields now remain in gigi:preferences:v1:<workspace>; the allowlisted version1 chat extension uses gigi:chat-preferences:v1:<workspace>. Reads also support the earlier combined candidate format; explicit saves separate it. Reads do not mutate storage. Failed writes attempt to restore both prior entries and report failure.

Functional: passed locally. Ten preference checks pass, including actual old-reader upgrade/rollback/edit/re-upgrade, malformed/unknown extension recovery, old combined-format migration, reset, workspace isolation and failed extension-write restoration. Full desktop331passed,2packaged-companion checks skipped pending rebuild. Actual app controller tests exercise imported configuration and restart with all three chat choices. Backend and approval code unchanged.

Perceptual/product: passed within offline actual app/DOM/CSS scope. Twelve theme/window/width combinations and existing keyboard/scroll/selection/composer/reduced-motion checks pass. Parent directly viewed Paper880wide. Screenshot /private/tmp/cre-2308-rollback-visual/paper-880-wide.png. Native acceptance is unchanged from prior scope and is not repeated for this storage-only patch.

Release readiness: untested for this revision. Prior private R4 artifact and its qualification are superseded. Rebuild/sign/notarize and run exact packaged checks before re-pinning the download identity and promotion. No0.2.20 installer upload/page deploy has occurred;0.2.18 remains live and rollback.

Worktree disposition: preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-5b278f6e, t3/gigi-chat-polish.
