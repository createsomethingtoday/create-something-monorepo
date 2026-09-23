# Manifest v1

A JSON object with `version: 1`, `width`, `height`, `fps`, `shots`, and `narration`.

Each shot has:
- `source`: local video path relative to the manifest (absolute also supported).
- `start`: seconds into the source; default 0.
- `duration`: 0.1–120 seconds, rounded to the nearest output frame.
- `from` and `to`: `{ "zoom": 1.2, "x": 0.5, "y": 0.5 }`. Zoom is 1–3; x/y are normalized focal centers. Smoothstep interpolation eases both ends. The crop is clamped to the image edges.
- Optional `caption`: editorial text rendered near the bottom, with no expression expansion.

Shots concatenate in order with hard cuts. The first/last picture fades in/out. Source video must have the intended output aspect ratio; pre-crop deliberately when it does not. No source speed change or implicit freeze is supported. Source audio is discarded.

`narration` has `source` (local audio file) and `segments`. Each segment has `sourceStart`, `duration`, and `at` (seconds on final timeline). Segments must be sorted by `at`, must not overlap, and must fit both the source and the final picture. This supports silence between complete phrases while keeping original speech speed. It does not infer paragraph timings: obtain those from the narration provider and verify them against actual media.

Output: H.264 yuv420p, AAC 48 kHz, fast-start MP4. Speech targets -16 LUFS / -1.5 dBTP; this is a finishing target, not proof of a good performance. The adjacent `.receipt.json` records hashes, FFprobe output and full-decode success. Owner audition remains pending.

Capture folders retain `capture.json` and JPEG frames. `encode-capture` produces a 30 fps recording from observed frame-arrival times; browser rendering can produce sparse frames when the scene is static. Inspect transitions before accepting footage.
