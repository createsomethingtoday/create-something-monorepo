# CRE-2483 approved products hero integration

Database tier: retain exact approved master plus derived WebP provenance. Scope is `/products` opening only. All service copy, recorded work, Cato and product controls remain unchanged.

- Approved PNG SHA256: `c7fead8f2f4336cfd3fdae70a16b3e5d1248917a933eb9afa1913351d7d05037`.
- WebP: `cwebp -q 90 -m 6`, 1670x941, 55,256 bytes. See asset manifest.
- Agency check and build passed. Svelte check: zero errors/warnings. `git diff --check` passed.
- Local Ego views captured at confirmed innerWidth 320,390,768,1024,1025,1440. No horizontal overflow. Desktop copy occupies quiet left lane; <=1024 art follows copy, phone crop preserves all modules and Canon. CSS is route compiled CSS, so no static stylesheet URL changed. HTML cache revision bumped.
- Keyboard CTA focus/Enter reached #capabilities; native capacity disclosure opened. Recorded-work and Cato sections present. Reduced-motion mode exercised and no-JS screenshot captured; SSR copy/scene remain present.
- Ground advisory run completed: image unsupported extensions and duplicate_analysis_incomplete on changed TS/Svelte; advisory calibration only. Existing unrelated review PNGs were excluded from scope.
- A concurrent local package rebuild briefly invalidated dev imports; final captures were taken after successful build completion. Runtime remains available at http://127.0.0.1:4183/products for independent review.

Functional gate: passed locally. Perceptual gate: builder viewed rendered hero at all six widths, passed framing/clarity; final independent acceptance belongs to parent reviewer. Release gate: untested, no commit/push/merge/deploy by builder.

Rollback: revert route-local scene/CSS and HTML cache revision together; remove the new WebP and provenance folder. Parent owns promotion and canonical production verification.
