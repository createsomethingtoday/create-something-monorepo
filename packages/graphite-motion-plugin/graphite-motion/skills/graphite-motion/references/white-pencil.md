# PRIVATE / White Pencil

A dark-background sibling of Graphite Motion for PRIVATE learning material. Use this mode for PRIVATE/PCN explainers and lessons when requested. Keep warm-paper graphite as the default for other work.

## Visual contract

- Canvas: PRIVATE ink, `--color-performance-ink`, #090909. Flat and still.
- Primary marks/captions: PRIVATE paper, `--color-performance-paper`, #f3f3f0.
- Secondary labels: #a6aca7, matching PRIVATE's deployed muted label color.
- Failure annotation in this study: #d68179. This is a proposed illustration accent, not a global token. Pair color with a cross, stopped path, or explicit label. Do not carry low-contrast paper-mode green/red straight onto black.
- Use true pencil artwork: irregular contour, dry crosshatching, visible negative space. Do not substitute a smooth filled circle and call it graphite.
- Texture belongs to the teaching objects. Keep captions, controls, and the background stable. No glow, gradients, 3D shading, chalk dust, or simulated classroom decoration.
- Preserve PRIVATE's typography hierarchy: sans-serif explanation, restrained editorial emphasis, small record labels. Draw's current renderer uses sans-serif captions; do not claim it reproduces the site's editorial font.

## Motion grammar

One object has one meaning. Show a useful action, its boundary, a test that reveals the failure, then a corrected outcome. Hold evidence long enough to read. The first study uses 4.5-second beats and an approximately 3-second closing hold.

Use three registered redraws at 8 fps for the actor. Keep position movement independent at 24 fps. For lines, start around 0.45 px boil at 8 fps; keep endpoints and labels anchored. This is a subtle material effect, not constant positional jitter. Use restrained easing, no bounce or elastic overshoot.

For a new subject, author recognisable tools, documents, gates or paths; the bundled circle is an actor, not a substitute for every object. Keep backgrounds and captions off the redraw track.

## Asset use

Use `assets/white-pencil-circle-3-frame.png`: three horizontal equal cells. Read actual dimensions from the PNG. Draw flipbook settings: columns 3, rows 1, frames 3, fps 8, seed 0, registration alpha. All three cells must have comparable silhouette, mass and alpha bounds. Inspect on #090909 at actual display size before accepting.

The original `graphite-circle-3-frame.png` remains unchanged for warm paper. Do not apply a blanket CSS invert filter to a finished scene: it also changes captions, semantics and background colors.

## Learning and accessibility

- Keep each study to one demonstrable takeaway. Avoid implying that a drawn boundary proves a production security guarantee.
- Provide a static storyboard with the complete lesson and a text transcript.
- Do not autoplay the review page. Honor prefers-reduced-motion by presenting the storyboard first and requiring explicit playback.
- Keep essential video captions short and legible. The landscape study is intended for full-screen viewing; the accompanying stacked storyboard carries the lesson at narrow widths.
- Verify all beats, full playback, reload and the exported video. A technically valid file does not prove good composition or learning effectiveness.

## First study

“Teach the boundary”: Find the document → a test can write too → expose only the read → read succeeds and write is unavailable. This is an illustrative teaching example, not a claim about PRIVATE's current authorization implementation.

Outputs: editable Draw JSON, 18-second 1280×720 H.264 MP4 at 24 fps, four stills, static storyboard, transcript and review page. Render using the existing Draw renderer captured with its source commit; retain generated-art provenance and source prompts.
