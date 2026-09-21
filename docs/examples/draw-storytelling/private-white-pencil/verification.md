# Verification — PRIVATE / White Pencil

Date: 2026-09-21. Linear: CRE-2037.

## Primary checks: passed

- Live PRIVATE homepage rendered in Codex browser; black/off-white hierarchy inspected before authoring.
- Draw project imported as a new project; UI confirmed “New project saved · other projects preserved.” Actual URL: https://draw.createsomething.agency/animate?project=1c7e602f-3c45-45f2-ba3f-77f450b20097
- Draw full playback: 0→18 seconds, Play restored at end; p95 draw 9.3 ms. Reload retained title, 41 drawings, 1 asset, 18-second duration, 24 fps and #090909 background.
- Actual rendered Draw scenes inspected at 3.9, 7.8, 12.3 and 16.5 seconds. Text is unclipped; actor registration stable; read/write branching, failed test, narrow boundary and successful read remain distinct. The number-input fill did not commit the seek; supported WebMCP seek verified all scenes instead.
- Existing Draw renderer validated project and rendered 432 frames. Full ffmpeg decode returned zero errors. ffprobe: H.264, 1280×720, 24 fps, video duration 18.0 s, container duration 18.048 s (encoder/container padding). See [media-check.json](media-check.json).
- Exported MP4 played to ended=true, readyState=4, time=18.048 in actual browser. Replay reset to 0.1 s and resumed. A second full run via keyboard activation in reduced-motion mode also reached ended=true.
- Python SimpleHTTPServer initially produced seekable [0,0]. Repaired by serve.mjs supporting HTTP byte ranges. Browser now reports seekable [0,18.048]; chapter controls seek to 3.9, 12.3 and 16.5 seconds and visibly render the expected scenes.
- Review page at desktop and 390 px: no horizontal overflow; all four storyboard images loaded and have useful alt text.
- Emulated prefers-reduced-motion: reduce, then reload: video display none, paused true, visible explanation and complete static storyboard. Explicit keyboard Enter on Play reveals and plays video. Emulation and viewport override reset afterward.
- Review browser warning/error log empty.

## Asset and reuse checks: passed

- Dedicated white-pencil sprite has three cells, 2172×724 total. Alpha-bound widths 495–501 px and heights 490–492 px; alpha registration gives consistent on-screen bounds. Real dark composition shows pencil texture despite misleading solid-looking tool preview. See [asset-check.json](asset-check.json).
- Source and installed Graphite Motion skill now route PRIVATE/PCN black-background requests to references/white-pencil.md and the new sprite. Skill validator passed. Original paper sprite checksum passed unchanged.
- Existing dirty application work preserved; no production code edited. Renderer was read from origin/main into an isolated artifact snapshot and reused installed dependencies.

## Scope boundary

Creative study and reusable style complete. This is an illustrative lesson, not deployed authorization proof or evidence of learning effectiveness. No production PRIVATE deployment, public publication, or message delivery performed.


## Repository promotion

The local verified study is packaged here with a portable render wrapper and the same source/media assets. No PRIVATE runtime or deployment configuration changes are included.

- Repository promotion validation: `pnpm bootstrap:worktree` passed. The checkout-relative `render.sh` completed a fresh 432-frame render and full decode. The initial packaged Draw JSON and MP4 matched the previously browser-verified artifacts byte-for-byte; the review fix centralizes scene definitions and preserves the identical MP4. Plugin and skill validation passed.

- Review remediation: regeneration now refreshes VTT captions and scene timing from the animation definitions, then all four stills, storyboard and media metadata from the current video. A temporary changed-caption/changed-timing scenario verified that both captions and Draw source update, the newly selected video frame is extracted, and stale accessibility artifacts are replaced. Full rerender/decode passed; MP4 remains byte-identical to browser-verified media.
