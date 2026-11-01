# Production commands and scene contract

Resolve `SKILL_DIR` to the directory containing this skill. Use absolute paths. Helpers require Python3.11+, Pillow and imageio-ffmpeg; player/build need Node20+. Install dependencies into a task-local virtual environment, never the global interpreter. Use a user-facing output directory for the finished project, with a unique name.

```sh
python3 -m venv /absolute/work/demo-venv
/absolute/work/demo-venv/bin/pip install -r "$SKILL_DIR/assets/director-kit/requirements.txt"
/absolute/work/demo-venv/bin/python "$SKILL_DIR/scripts/prepare.py" \
  --source /absolute/recording.mp4 \
  --out /absolute/outputs/my-demo \
  --outcome "Teach reviewers to inspect the returned evidence before selecting a candidate"
```

Preparation copies the source, records its hash and media metadata, creates inspection frames/contact sheet, and creates an intentionally incomplete manifest. It does not guess scene content or claim visual review. `--out` must not already exist. Dependencies are the same as the renderer.

View `inspection/contact-sheet.jpg` and useful full-resolution `inspection/frame-*.jpg` files. For precise boundary evidence:

```sh
/absolute/work/demo-venv/bin/python "$SKILL_DIR/scripts/media_inspect.py" \
  --source /absolute/outputs/my-demo/reference.mp4 \
  --out /absolute/work/boundaries --at 3.4 3.5 12 18.5 29
```

Times in inspection frames refer to the source. Preparation's metadata duration may be rounded to hundredths by ffmpeg; verify final decoded output duration in the player. Never apply the old Webflow fixture's timestamps or pixel-based regression to a new recording.

## Manifest

Author the generated `manifest.json`; do not leave an empty scene list. Example structural shape (replace the sample copy with observed content):

```json
{
  "version": 1,
  "title": "Review the candidate pool",
  "description": "Understand the result before selecting candidates.",
  "source": {
    "file": "screen.mp4",
    "original": "reference.mp4",
    "sha256": "hash populated by prepare.py",
    "in": 3.5,
    "out": 29,
    "duration": 25.5,
    "crop": [1344, 900, 512, 90],
    "audio": "preserve",
    "credit": "Supplied product recording",
    "attribution": "Adapted from the supplied recording; cropped and trimmed."
  },
  "scenes": [
    {"id":"review", "start":0, "end":25.5, "label":"Review", "title":"Inspect the returned evidence.", "prompt":"Check the reported result before deciding what to change.", "evidence":"The recording shows the returned result; no live data check was performed."}
  ]
}
```

`crop` is `[width,height,x,y]` in source pixels; use even values within the source dimensions for H.264. Default to the full screen unless a deliberate crop improves focus without hiding material evidence. One trim interval is supported; output duration equals `out-in`. Scene ranges cover exactly `[0,duration]`, without gaps/overlaps. All scene times refer to the trimmed output. Rail layout supports1–5 scenes; copy that overflows is rejected. `credit` is a short on-video source label; `attribution` can explain the adaptation in more detail.

The default is preserving source audio. Set `audio: "mute"` only when the user's request or an agreed silent format authorizes it. For speech, assess intelligibility and caption needs; this starter does not generate a transcript or captions automatically.

## Optional mobile framing

Add `mobile` alongside `source` and `scenes` when phone viewing is required:

```json
"mobile": {
  "file": "screen-mobile.mp4",
  "poster": "poster-mobile.jpg",
  "width": 720,
  "height": 720,
  "presentation": "inset",
  "shots": [
    {"start":0,"end":25.5,"crop":[600,80,100,200],"label":"Inspect the visible result"}
  ]
}
```

This is a structural example, not a reusable framing decision. Each shot's crop is `[width,height,x,y]` in the **trimmed desktop screen's pixels**, after `source.crop`, not in the original recording or mobile canvas. Use even integers, bounded by the desktop screen, and positive intervals covering the full output timeline without gaps or overlaps. Choose boundaries on the 30fps output frame grid. Mobile and desktop preserve the same time; edits that change speed belong in a separate locked editorial cut.

`presentation: "inset"` keeps a dimmed full-screen background and enlarges the selected source excerpt with its original aspect ratio. The default crop presentation fits only the selected region into the mobile canvas; use it when removing the surrounding screen does not hide material context. Do not stretch source text or reconstruct it. Tight crops should show complete phrases with breathing room, excluding dangling adjacent letters and next-line fragments. Use a full-screen crop during animated scroll/zoom intervals, then return to a stable, readable detail. Keep source speed changes evident in shot labels when a close-up makes the original annotation hard to read.

The phone player selects focused footage at widths up to 680px; desktop defaults to full recording. A view selector lets viewers choose either while retaining time, playback state and playback rate. Chapter and guidance timing use the same manifest. Portrait export is 720×1280 with the focused screen above the scene guidance; desktop retains the left wayfinder and larger screen on the right.

Review the actual focused screen at 360–390 CSS pixels wide and the portrait export at phone scale. Read the important words yourself; a valid crop, successful decode or readable HTML prompt does not prove source legibility. Check every shot midpoint and its boundaries, particularly while the original UI moves. Full recording remains available for all details outside the excerpt. This is selective magnification, not a verbatim transcript or a claim that every background word is phone-readable.

## Render and package

Run in the new project, not inside the skill assets:

```sh
/absolute/work/demo-venv/bin/python render.py --validate-only
/absolute/work/demo-venv/bin/python render.py
node build.mjs
node serve.mjs --port 8767
```

Use an available local port. Do not stop another demo's server to reuse a port. Rendering emits `screen.mp4`, `walkthrough.mp4`, `poster.jpg`, and `render-receipt.json`. With `mobile` enabled it also emits `screen-mobile.mp4`, `walkthrough-mobile.mp4`, and `poster-mobile.jpg`; all are included in the receipt and verified by the build. The receipt binds exact manifest bytes and output hashes. Any manifest or media edit requires rendering again before packaging. Do not fabricate or refresh the receipt to bypass a stale-render error.

`dist/` is the static deployment artifact; seven allowlisted files, or ten with mobile enabled. It omits the source recording, authoring scripts, inspection assets and receipt. The local server binds127.0.0.1 and serves byte ranges. In production use HTTPS, appropriate audience/access controls, and video range support. Do not publish without an authorized destination.

The MP4 uses a fixed1920×1080 canvas; the recording fits inside the right region, preserving aspect. The web player remains responsive. A dense source screen may need a tighter honest crop or larger UI in a new capture; enlarging rail text cannot repair an unreadable recording.

## Descript handoff

Inspect current connected tool capabilities before use. For an authorized editorial handoff, import into a new project or duplicate composition, ask Agent Underlord for the specific edit, and wait for terminal job success. Preserve composition and project IDs. Export the finished media and rebuild scene timings; do not reuse old timestamps after trims or retiming. A published share URL may overwrite an existing composition's share content, so publication is a separate authorized action. Descript is optional; the bundled path works locally without it.

## Maintaining the bundled starter

The canonical source is `packages/walkthrough-system` in the CREATE SOMETHING monorepo. `assets/director-kit` is a portable snapshot of its renderer/player/build tools, without the Webflow example or media. After changes, sync only the allowlisted tools with `scripts/sync_kit.py --package /absolute/packages/walkthrough-system`, run package tests, and forward-test the skill with a different recording. Never copy manifests, receipts, client recordings or sample-specific tests into the starter.
