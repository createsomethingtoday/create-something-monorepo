# GiGi 0.3.2 reconciled interface — CRE-2377

The user requested reconciliation and deployment of both the public installer and Danny’s separate DEV build. Danny’s published UI remains the approved baseline; the Astryx foundation supplements it. `apps/gigi-desktop/RECONCILIATION.json` pins source and scope.

The public app keeps `agency.createsomething.gigi` and version0.3.2. The separate DEV installer retains `co.halfdozen.gigi.dev` and its own data. No provider/account mutation, service deployment or database migration is part of this import. Unpublished edits on another device are not claimed reconciled.

The active UI, weekly calendar, fixed due windows, Calm Tasks/Gigs, green theme, combined Search, guided/connected setup and local motion come from reviewed Grantbot source71594fb, merged asb083717. Native query and managed-login prerequisites are reconciled with the production source. Existing consent, stale-write, approval, source-scope and readback boundaries remain.

Functional preparation passed407 desktop checks (2 skipped),340 integration checks (1 skipped),integration typecheck and190 native checks. New managed-login process coverage failed before its companion handlers were included and passed afterward. Targeted fail/pass checks also caught stale optional-status overwrites and archived tasks reappearing on Today. The lockfile change adds only the pinned GSAP3.15.1 entry and preserves unrelated resolutions.

Independent review also found signed-in Codex with missing GiGi tools incorrectly offered installation guidance. The actual React regression failed before a narrow recovery branch repair and passed afterward; it now offers a read-only workspace-tools check without login or inference. The same correction and archived-task rule are carried into the separate DEV0.3.2 candidate.

Final exact-source rendered/native/artifact qualification, independent Sol6.1 clearance, immutable upload/full-download, public metadata and canonical deployment receipts follow in this packet before production promotion. Preparation counts are not live-provider acceptance. Both binaries require Developer ID/notarization, stapled tickets, Gatekeeper and mounted-image equality before distribution.

Rollback is the qualified0.3.1 installer and reviewed pointer/source revert; no stored-record migration is needed. Full release identity, verification, public-readback and DEV access receipts will be recorded here and in CRE-2377. No claimed CI, deployment, installer or human outcome is implied by source preparation.

Worktree disposition: retained until qualified deployment and handoff at the T3-bound `codex/cre-2377-gigi-reconciled-release` checkout. Unrelated original checkout work is preserved.
