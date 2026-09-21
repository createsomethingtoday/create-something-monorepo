# Draw Motion implementation

These notes describe the verified September 15, 2026 workflow. Discover current WebMCP schemas and browser capabilities before using them; names and contracts can change.

## Read and preserve

Read `draw_animation_inspect`, then retrieve complete affected drawings with `draw_animation_drawing`. Save enough original state to restore the edit. Apply changes with the inspected `expectedRevision`; re-read on a conflict. Never overwrite another editor's changes.

Canvas-owned drawings may reject removal. Preserve the source map and use a separate animation project when independent objects are required.

## Import and register

Import the bundled PNG through the supported image-upload interface. Upload completion can precede asset availability: inspect again after the asset appears. Use the returned asset ID, never the ID from another project.

The verified image drawing used:

```json
{"flipbook":{"columns":3,"rows":1,"frames":3,"fps":8,"seed":0,"registration":"alpha"}}
```

Position motion and texture motion are independent. When replacing a center-positioned actor with a top-left-positioned image, subtract half the chosen image width and height from each pose position. Verify visible alignment; the alpha bounds and frame dimensions may differ. Preserve pose timing and motion rather than rebuilding the entire scene.

## Paths and keyframes

For a light hand-drawn line, the previous animation used `boil: {amplitude: 1.3, fps: 8, seed: 37}`. This is a starting point, not a requirement. Densify long straight segments roughly every 12 world pixels so interior points can vary. Preserve endpoints and corners. If poses contain point arrays, maintain matching point counts and correspondence across poses.

Keep pose times unique and ascending. In the verified implementation, a pose's easing controlled the transition to the following pose; `hold` switched at that next pose. Use holds to let viewers recognize evidence before motion resumes.

## Verification and delivery

1. Seek to each key scene and inspect the composition at the intended aspect ratio.
2. Play through: check texture registration, clean captions, clear causal order, and sufficient pauses.
3. Export the full silent video. The example used 1280 × 720, 24 fps, 19.5 seconds.
4. Inspect the exported media itself for duration, dimensions, cropping, and visible content. A tool export receipt alone does not prove playback quality.
5. Provide an editable project link and the actual exported file when available. Report publication separately; do not imply an existing social post has changed.

Example story: a circle repeats a failed route, retrieves a record of that failure, and takes another route. End caption: “Find what you already learned.” Adapt the story to the user's subject rather than reusing CTX claims automatically.
