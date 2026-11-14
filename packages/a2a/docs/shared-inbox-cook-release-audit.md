# Shared inbox UI release audit — CRE-2450

The operator authorized deployment on November 14, 2026, after the local Cook
review. This release changes the public handoff illustration and shared-inbox
interface. It preserves the existing backend, schema, feature flags, Identity,
bindings, credentials and private sender container.

The reviewed UI has clearer mobile navigation and runtime status, compact
activity groups, distinct agent labels, bounded reading and composing widths,
retained drafts, literal attributed result excerpts and native keyboard focus
recovery. GSAP is optional; native behavior survives import failure.

The final local artifact was independently verified by Sol 6.1: both TypeScript
checks, 26 focused tests, 49 browser regressions, six widths and enlarged text,
pending/error/session states, native keyboard controls and a byte-identical
build. Two fresh critics scored all six static criteria at least 9 across ten
captured views. These are local synthetic receipts. Full motion aesthetics,
actual OS reduced motion, screen-reader listening and real host delivery remain
untested. The eight-hour floor alone supplies no quality acceptance.

The reviewed source manifest has SHA-256
`13e8cb969d31aa626e2aea5f01d1440e0a1a8c86710dcbc26af4cae09ae2a3b8`;
the 15-file client manifest has SHA-256
`d7d2e24fe82854adf5a9ac01a57585f1368119f280a15bd5cc27641a6838bb37`.
The release branch starts with those 14 design/test files on current main.
Integration review then found a contrast regression in the inverted public
process section under newer Canon tokens. A section-local inverse secondary-ink
repair in landing-motion.css preserves legibility without changing global Canon
styles or other applications. The original 14-file identity is historical after
that bounded release repair.
Newer Canon styles on main change the emitted common CSS and dependent import
hashes. The manifest above identifies the historical local review, not the
new release bundle; the integrated artifact is separately checked and pinned
in the production receipt.
The isolated Cook worktree retains detailed reports, comparisons, hashes and
the design-only patch; the durable coordination receipt is CRE-2450 in Linear.

Promotion follows the existing release runbook: merge through the PR gate,
rebuild the exact merged source, deploy with `--keep-vars`,
`--containers-rollout none` and the merged `BUILD_REVISION`, then compare live
settings, container identity and canonical pages/assets. The targeted CI gate
uses a fresh frozen install without lifecycle scripts or side-effect caching.
Do not enable shared inboxes, self-service enrollment or Identity enrollment
as part of this UI-only publication. No production correspondence is needed.

Capture the immediate prior Worker version for application rollback. Preserve
existing D1 schema and data, Identity, grants, secrets and the sender container.
No migration or data rollback is part of this release. Record the merged SHA,
Worker version, deployment ID, live asset comparison, remaining limits and
worktree disposition in the Linear release receipt after promotion.
