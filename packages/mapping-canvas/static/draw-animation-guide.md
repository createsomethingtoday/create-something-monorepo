# Draw animation: Codex artwork, editable motion

Open /animate. Choose Open sample tutorial for an original 20-second example. Animation projects use a separate local store; your mapping canvas stays intact.

## Human workflow

Add a circle, pencil stroke, caption, or image. Select a drawing, move the playhead, and drag it or change its pose controls. The change creates a key pose. Edit points moves the same stroke points in that pose. Ease and Linear interpolate toward the next pose; Hold keeps the pose until the next key. Onion skins show neighboring frames. Play evaluates the saved poses locally; no AI requests occur during playback.

Use Save project to download the complete editable project, including image bytes. Open project creates a separate copy. Projects survive reload in this browser, but clearing site data removes local storage: keep downloaded backups. Copy saved drawing imports marks without replacing your original map. Mapping-only groups/connectors are omitted; inspect the copy before animation.

## Codex account generation

Ask Codex's built-in image generation tool to create or edit the artwork. Do not use an OpenAI API key or a separately billed generator. The built-in tool may not expose a model selector; do not label an asset gpt-image-2 unless the generation receipt verifies that model.

Import the generated PNG/JPEG/WebP with Image / asset. For provenance, Codex can use the repository's packages/mapping-canvas/scripts/pack-codex-asset.mjs with --image, --out and --prompt-file, then import that .draw-asset.json using the same control. The packer performs no generation or network calls. Image assets remain raster drawings, with their original pixels embedded once; duplicate drawings reference the same asset. Pose transforms never regenerate artwork.

## Agent workflow

Use the page's WebMCP tools: draw_animation_inspect for settings, revision and compact artwork/asset inventory; draw_animation_drawing for one exact drawing; draw_animation_apply for atomic edits; draw_animation_seek to share the playhead/selection; draw_animation_history for undo/redo. Always use the inspected expectedRevision. A stale edit fails without overwriting another edit. For a new pose, copy the evaluated pose and modify only the required fields. Keep point count/order stable. Coordinates are local to each drawing; rotation is in degrees around its origin. The easing on the left key controls the transition.

## Export and Remotion

Export clean frame downloads the current artwork without selections or ghost overlays. Export video records a separate canvas at the project dimensions/frame rate, producing WebM or MP4 according to browser support. Keep the tab visible; backgrounding or cancellation fails explicitly. Browser recording is a real-time preview export and may drop frames on overloaded machines. Save the editable project for reproducible rendering. Add the video to a Remotion composition for narration, captions, sequence assembly and final delivery. Do not represent a browser recording as frame-exact rendering.

Limits: 120 seconds, 1920 pixels per dimension, 250 drawings, 120 poses per drawing, 1000 points per stroke, 32 embedded assets, 6 MB per imported image / 40 MB per project. Animation projects and video are portable files; existing view-only links apply to mapping canvases, not animation projects.

For frame-exact MP4 rendering in the CREATE SOMETHING repository (after pnpm bootstrap:worktree), run:

    node packages/mapping-canvas/scripts/render-animation.mjs /absolute/path/to/animation.draw.json /absolute/path/to/output.mp4

This uses Motion Studio's pinned Remotion runtime and the exact same Draw evaluator and canvas renderer. No image-generation API is called. The local MP4 can be assembled with narration in an existing Remotion project.

## Hand-drawn motion

Select a vector and enable Hand-drawn redraw. Line variation controls its roughness, Redraws / second controls the drawing cadence, and the seed makes that variation repeatable. Original points and connector endpoints stay anchored. Use Reveal key poses from 0 to 1 to grow a line along its length; time the next element to appear when the line arrives.

For raster redraws, ask Codex for a transparent, evenly spaced image sheet with a few variations of the same illustration. Import it once, enable Play image variations, and set the sheet columns, rows and frame count. Cells play left to right, then down. Eight redraws per second is a useful starting point. Align transparent silhouettes normalizes each cell's visible bounds; Keep sheet cell positions preserves intentional differences in size and placement. Use consistently shaped variants for a steady silhouette. These are reusable raster cells, not editable vector points or new image-generation calls on every frame.

Open Camera to set its world center X/Y and zoom at the current time. Camera poses use the same ease, linear and hold timing as artwork. Fixed to screen keeps captions or overlays outside the camera movement; new captions start fixed. Pointer movement and point editing account for the camera. Save project includes the camera and drawing effects, and both browser export and Remotion use them.

Agents can replace the camera track with set_camera, set drawing.space to screen for overlays, and edit drawing.boil or drawing.flipbook through put_drawing. Inspect the current revision first. Redraw cadence is independent of output frame rate: camera motion can remain smooth while the pencil marks change in held steps. The sample uses one Codex-generated three-cell sheet, growing connectors, a hinged gate, and a camera that follows the request.
