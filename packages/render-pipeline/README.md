# @create-something/render-pipeline

Local, deterministic rendering for CREATE SOMETHING visual assets. The package
keeps exact copy and receipts in semantic HTML/SVG, while Three.js owns only the
3D field.

## Browser render contract

The package exports a small, provenance-aware boundary:

- `normalizeRenderRecipe()` validates local asset references, rights metadata,
  shot/style settings, outputs, budgets, and motion.
- `hashRenderRecipe()` produces a stable SHA-256 over the normalized recipe.
- `inspectGlb()` reports source hash, bytes, topology, textures, images, and
  optimization recommendations without extracting embedded licensed images.
- `createRenderReceipt()` binds recipe, asset hash, backend, output, runtime
  metrics, budgets, and fallback state into a portable receipt.

`shot.position` and `shot.target` are expressed in the court basis assembled at
runtime: `[towardCourt, side, up]`. This keeps a shot stable when the source model
uses a different world position while leaving the authored composition explicit.

## Local Render Lab

Build the package, then point the bounded demo at an operator-controlled recipe
and GLB. Neither path is committed or uploaded.

```bash
pnpm --filter @create-something/render-pipeline build

RENDER_LAB_ASSET=/absolute/path/to/runtime.glb \
RENDER_LAB_RECIPE=/absolute/path/to/recipe.json \
RENDER_LAB_PORT=4179 \
pnpm --filter @create-something/render-pipeline render-lab
```

The server fails closed when the recipe hash does not describe the served GLB.
It binds to `127.0.0.1`, disables caching, and exposes:

- `/` — responsive semantic marketing surface and WebGL2 render;
- `/recipe.json` — normalized recipe, recipe hash, and GLB inspection;
- `/health` — local readiness and recipe hash.

The page publishes a machine-readable receipt in
`#render-receipt-json`. Deterministic QA routes are:

- `?capture=1` — disables continuous motion for capture;
- `?motion=reduce` — exercises the same animation gate as
  `prefers-reduced-motion: reduce`;
- `?noWebgl=1` — proves the authored static fallback;
- `?testContextLoss=1` — invokes `WEBGL_lose_context` after the first successful
  frame and proves last-frame fallback behavior.

## Rights and production boundary

The recipe requires an HTTPS provenance URL and forces
`externalUploadAllowed: false`. Operator-supplied or NoAI assets must remain
local: do not send them to image/video generation providers, commit them to Git,
or publish derivatives without a separate rights and promotion review.

This slice intentionally uses stable WebGL2, meshopt geometry, and WebP textures.
WebP reduces transmission size but not GPU allocation; KTX2/Basis texture
compression and device-tier performance evidence remain required before a public
deployment. WebGPU can be added later behind the same recipe and receipt boundary.

## Checks

```bash
pnpm --filter @create-something/render-pipeline test:web-render
pnpm --filter @create-something/render-pipeline build
```
