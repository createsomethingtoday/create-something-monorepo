# Warm handoff illustration

CRE-2363 updates the Agency homepage's “Work gets lost between tools” image to match the approved warm workshop family. The existing two trays, physical gap, paper handoff and two-character composition remain the story. Soft daylight, graphite midtones and cream paper/porcelain replace the cold grey atmosphere.

Generated with built-in `image_gen` on November 6, 2026. `prompt.json` retains the exact prompt and first-party reference roles; model and quality identifiers were not exposed. `one-manual-gap-warm-v2.png` is the master. The optimized 1536×1024 WebP is `static/images/agency-stories/one-manual-gap-warm-v2.webp` (about 114 KiB); hash and crop intent are in `manifest.json`. This is an original conceptual illustration, not software or client-delivery proof.

Acceptance: full scene visible at 320,390,768,1024,1025,1440px; both characters, trays, channel and bench gap remain legible; existing graphite frame/caption, copy, CTA destinations and homepage hero remain intact. Review normal/reduced motion and no-JS rendering in the actual page. Independent Sol final re-test and release receipts are recorded in Linear CRE-2363.

This is a bounded asset replacement using the existing approved composition contract, not a new interaction or layout. The approved warm homepage master is the visual reference. No third-party reference media is copied.

Rollback: revert the scoped CRE-2363 PR and redeploy the previous verified release. `one-manual-gap.webp` remains available. Unrelated root-checkout work is excluded; the isolated worktree is retained through live verification.

Full Agency check passed with zero Svelte errors/warnings; production build passed. Independent Sol review passed all 15 rendered cases (six widths in both motion preferences; no-JS at320/390/1440), with direct image inspection confirming mobile readability. This records local acceptance; live promotion evidence belongs to CRE-2363.
