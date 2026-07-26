# Gate release v1 verification

Result: pass as a deterministic Metal editorial benchmark.

- Contract: 1280x720, 16:9, 24 fps, 192 frames, 8.000 seconds.
- Codec: H.264 High, yuv420p, progressive, silent AAC stereo.
- SHA-256: `811778c1f6451df9ae93078aa536a2a4222b80aa9fa872e9e6c05718c48296bc`.
- Causal test: the first non-zero downstream water sample is frame 73; frame 72 proves the gate is fully open and downstream water is still zero.
- Terminal hold: the final 36 frames keep gate, release, and proof progress at 1.0.
- Determinism test: repeated rendering of the same Metal checkpoint produces identical RGBA bytes.
- Decode test: FFmpeg decoded the packaged MP4 from start to finish without an error.
- Visual test: the decoded 250 ms contact sheet shows one continuous shot with a closed hold, complete gate lift, downstream release, receipt trace, and final proof hold. No captions or cuts are present.

The water in v1 is an analytic Metal field. It is a controlled reference for timing and scene language, not evidence that the SPH simulator has been integrated.
