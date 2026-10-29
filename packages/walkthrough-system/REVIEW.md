# Walkthrough production qualification

Acceptance criteria for the 2026-10-29 release:

- Chapter selection survives loading another view; same-source retry retains timeline and playback rate.
- Failed render/build promotion preserves the previous complete generation. Manifest edits during render reject promotion.
- Desktop/mobile playback, keyboard navigation, recovery, and actual rendered output are reviewed directly.
- Public deployment includes only an explicitly labeled synthetic fixture and allowlisted assets, with security headers and media byte ranges.
- Direct Astra implementation and independent Sol 6.1 final review; Sleev stays stopped and separate.

Local regression baseline: two player tests, two render tests, and two build tests failed before their fixes. After implementation, 21 Node and 20 Python tests passed, including real ffmpeg encoding/decoding and audio preservation fixtures. Final browser and release evidence is recorded in the PR and deployment report.

Limits: the public demo is synthetic and silent. It does not establish underlying app behavior, physical-device playback, narration quality, or Sleev savings. Hard process termination may leave locks/checkpoints requiring inspection; multi-file output promotion is not crash-atomic. Linear credentials were unavailable; no issue was invented. Original footage and unrelated checkout changes remain untouched.
