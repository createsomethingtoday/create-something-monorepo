# Deliberate, load-safe scroll reveals — CRE-2319

Follow-up to PR #2153's late Codex P2 finding, with the operator's request to smooth and delay reveals.

Acceptance: sections briefly viewed while GSAP loads stay at rest on return; unseen sections still receive one entrance. Once the runtime is ready, wait until a section is 12% into the viewport (64–120px), pause for Canon's 100ms instant token, then use the standard easing curve over the 700ms slow token. The entrance rises 16px and starts at 40% opacity. Native scroll, visible SSR/no-JS/loading content, focus/hash and reduced-motion cancellation remain immediate.

The loading observer covers the full viewport. At runtime readiness it drains queued intersection records before switching to the inset reveal observer. This preserves reading history even when a target was viewed and left before import resolution or its visibility delivery was queued. Current visible groups stay settled during the switch.

Evidence:

- Before the fix, the new unit regression failed (one failure, eleven passing); a browser test holding the actual GSAP module request also failed on return to an already-viewed group.
- Before tuning, the new viewport-entry check failed: a group with only 48px visible was already animating. After tuning it stays fully readable until the deeper trigger.
- Final Canon suite: 13 passed, including queued visibility delivery, focus/hash, reduced motion, import/destroy races, missing APIs and failure fallback.
- Built-browser delayed-request regression: 390/1440 passed. The test holds the real manifest-listed GSAP entry, views a group, returns above it, releases the chunk, and confirms the group never animates on revisit; an unseen control group still animates.
- Existing scroll and control suites: all six widths (320/390/768/1024/1025/1440) passed. Full Agency check and production build passed.
- Fresh independent Sol 6.1 review reran the 13 unit tests and delayed-browser case and directly inspected motion samples. Functional and perceptual gates passed; production release readiness remains a separate promotion/live check.

Parent frame sampling showed a 100ms settled pause followed by gradual motion (around 184ms: opacity .42/y15.5; 351ms: opacity .69/y8.2; 601ms: opacity .96/y1; 851ms: authored rest). These are local browser frame samples, not human acceptance of continuous playback.

The internal public HTML-cache revision advances so existing visitors receive the corrected JS graph. CSS content is unchanged and retains its existing versioned URL. No library dependency, route, content, pricing or hosting change.

Repro/validation commands, from the pinned repo runtime:

- `pnpm --filter @create-something/canon exec vitest run src/lib/motion/scroll-entrance.test.ts`
- `pnpm --filter @create-something/agency check`
- `pnpm --filter @create-something/agency build`
- `AGENCY_BASE_URL=http://127.0.0.1:4201 pnpm --filter @create-something/agency exec node scripts/verify-scroll-loading.mjs`
- Run `verify-scroll-entrances.mjs` and `verify-home-interactions.mjs` against the same preview.

Rollback: revert this follow-up through normal review and the qualified Agency Pages workflow. Worktree disposition: retained at /tmp/agency-gsap-load-recovery on codex/cre-2319-scroll-load-recovery until live acceptance.
