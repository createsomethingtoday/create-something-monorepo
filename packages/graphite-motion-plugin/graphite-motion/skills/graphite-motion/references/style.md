# Style and reusable artwork

## Visual system

| Role | Color |
| --- | --- |
| Paper | `#eee5d4` |
| Graphite | `#292522` |
| Muted lines | `#958a78` |
| Failed path | `#a34f49` |
| Search or attention | `#ad742d` |
| Progress | `#47765e` |

Flat shapes, irregular contours, dense pencil hatching with small gaps, and consistent overall darkness. Texture should suggest an animator redrawing the object. Avoid photorealistic charcoal, shaded spheres, heavy paper noise, or bouncing every object at once.

Use clear silhouettes at phone size. Give paths and source cards enough space to be recognized before the actor moves. Keep typography clean and motionless while the objects move.

## Bundled sprite

`../assets/graphite-circle-3-frame.png` is the original 2172 × 724 PNG: three equal 724-pixel cells, left to right. Keep it as the master; import with three columns, one row, three frames, 8 fps, and alpha registration where supported. Check transparency against the intended paper background after import.

Recovered from the user's earlier Codex image-generation session using CTX:

- CTX session: `9b5838b3-54c1-8ea9-8a75-d91c01d33f2d`
- Event prefix: `5c04cc23`
- Provider session: `01a0890f-8438-7922-ab62-b74426538e42`
- Generated September 9, 2026; reused in the CTX explainer September 15, 2026.

These identifiers are provenance, not required runtime dependencies. No transcript or account data is bundled.

## Original generation prompt

Create ONE transparent PNG sprite strip for a hand-drawn editorial animation. Wide horizontal composition, exactly THREE equal square cells arranged left to right, no gutters, no borders, no labels. In EACH cell place the same small flat charcoal/graphite circular ink ball, perfectly centered at exactly the same relative position, with the SAME diameter approximately 60% of cell width. Three successive redraws of the same object: slightly different irregular contour and clearly different loose dense pencil hatching inside. Flat 2D scribble circle, not a shaded 3D sphere; mostly near-black graphite with visible off-white/transparent tiny pencil gaps. Keep overall darkness, silhouette size and center extremely consistent across all three cells. Organic approachable handmade marks. Background fully transparent across all cells. No shadows, no other objects, no text. This single reusable three-frame animation sheet should look like an animator redrew a charcoal dot three times.

For other artifacts, replace the subject while preserving cell geometry, registration, texture, and silhouette consistency. Use the bundled image as a visual reference. Inspect all cells for accidental scale changes, clipping, unwanted text, or background fill.
