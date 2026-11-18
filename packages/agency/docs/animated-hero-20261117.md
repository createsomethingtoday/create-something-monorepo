# Approved Agency homepage hero — CRE-2495

The approved eight-second animation enhances the existing homepage background.
The original still, headline and calls to action remain available in every mode.
Production authorization was received on November 17, 2026. Promotion and live
verification receipts are recorded in CRE-2495.

## Source and ownership

- Implementation base: `4065d0a22deade01413151dc38afa9a153a575c7`.
- Branch: `t3/animated-agency-hero`.
- Registered existing checkout against CRE-2495 using the repository-pinned bootstrap wrapper.
- Copied unchanged to `static/films/agency-hero-20261117/one-small-adjustment.mp4`.
- SHA-256: `23170390098c0af1075606c95a8d07817ac42649c6c1a618c3d27377bedc3b80`.
- 1,024,895 bytes; H.264, 1920×1080, 24 fps, 8 seconds; no audio stream.
- No media generation, edits or new Runway calls. Approval governs the supplied artifact.
- Existing CSS poster `/images/agency-approved-20261116/04-hero.webp` remains the fallback.

## Behavior and acceptance

The single homepage enhancer attaches the source only when visible motion is
allowed. It follows the existing film motion, navigation and overlay stores,
plus data saving and document visibility. Playback is muted, inline and once
only, observing the artwork rather than the tall mobile copy region. The last frame stays visible; one native button provides pause, resume
and replay. Manual pause survives automatic interruptions. Motion/data-saving
changes detach the source and restore the poster. Error stays still. SSR/no-JS
contains no video source. Destroy releases subscriptions, observers, listeners
and the source.

The video matches the poster's geometry, including the mobile right-side crop
of its empty black field. Copy remains HTML with the same headline and CTA.
Mobile transport has a reserved row below the artwork and caption; toggling
motion does not change the hero's height. Desktop transport sits in the black
left field below copy. Static stylesheet and public HTML cache revisions are
`animated-hero-20261117`.

## Local validation

- `bash scripts/ona-bootstrap-local.sh pnpm bootstrap:worktree`: passed.
- Existing-worktree registration for CRE-2495: passed.
- Test-first initial hero check failed before the enhancer existed.
- A later regression demonstrated that replay became inaccessible after toggling
  still mode; fixed and preserved in `test/hero-playback.test.ts`.
- Focused hero and film preference tests: 7 passed. Hero tests are included in
  the package check command.
- Agency package `check` and `build`: passed. The final artwork-visibility
  refinement passed the focused suite, final Svelte check (0 errors/warnings)
  and final production build (Cloudflare adapter completed).
- T3 browser: inspected desktop still/settled video and phone scene directly.
  Runtime reached 8 seconds, ended without a loop, retained last frame and
  exposed replay. Replay/pause plus scroll away/back preserved manual pause.
  Muted and playsInline were true; loop was false.
- Geometry reads at 320,390,768,1024,1025,1440: no horizontal overflow. Direct
  final narrow-phone and 1024 screenshots show the complete bench/antenna,
  readable copy and unobstructed transport. Desktop also viewed at 1440.
- At 390×600 with motion on and the artwork below the viewport: no source
  and zero MP4 resource requests. Scrolling the artwork into view attached the
  source and played; a direct screenshot confirmed unchanged scene geometry.
- Reactive page motion-off readback: source absent, video/control hidden and
  hero height unchanged. System/data-saving/error/destroy paths use offline
  event fixtures, not live network/device evidence.
- Browser screenshot delivery was intermittently unavailable; successful
  screenshots were obtained after retry. No live production evidence.

## Parent handoff and rollback

Independent acceptance covers actual responsive playback, keyboard controls,
fresh no-JS/system-reduced-motion network assertions and production cache/media
delivery. See CRE-2495 for the exact reviewed artifact, results and limits.

Rollout: include the immutable MP4 and all source/style/cache changes in the
same Agency release. Verify delivered asset hash and homepage playback plus
still-mode source absence on the canonical production URL. Do not modify the
approved video to resolve a layout issue.

Rollback: revert this scoped implementation and revision changes through the
normal review path, restoring the existing poster-only homepage; preserve any
subsequent unrelated work. The old poster is retained. The new immutable media
may remain harmlessly stored if rollback avoids asset deletion.

Worktree ownership and disposition are recorded in CRE-2495.
