# Keep published download identity during qualification — CRE-2308

Review4433807778 is valid: Agency constants pointed at an unuploaded R4 private artifact superseded by the preference repair. Restored all three Agency files (identity, page copy/acceptance notes and contract tests) to current published0.2.18 from main. This avoids advertising chat improvements or qualification results for the older installer.

Restored0.2.18 contract tests failed against the stale0.2.20 candidate pin, then all25 release/landing tests passed after correction. Published0.2.18 installer HEAD returned200 with84,806,372bytes. No new deployment was necessary to preserve the existing live release.

Functional: passed for the restored page contract. Perceptual/product:not-applicable to this exact restoration of existing published copy; no new layout. Release readiness: not yet qualified for replacement desktop source; prior R4 remains superseded. Build/sign/notarize the replacement, run exact packaged acceptance, upload a new immutable version path and independently download/hash it BEFORE changing Agency constants. Merge/deploy only through final CI/review gates and verify canonical pages. Rollback remains0.2.18.

Worktree disposition:preserved at /Users/createsomething/.t3/worktrees/create-something-monorepo/t3-5b278f6e (t3/gigi-chat-polish).
