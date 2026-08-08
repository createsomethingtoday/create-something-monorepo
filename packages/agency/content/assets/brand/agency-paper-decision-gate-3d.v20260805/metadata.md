# Agency Paper Decision Gate — Omma v2 3D candidate

> Asset ID: `brand.agency-paper-decision-gate-3d.v20260805`
> Owner: CREATE SOMETHING
> Reviewed: 2026-08-06
> Tracking: `CRE-1625`
> Status: locally accepted v2 candidate on draft PR #1271; not approved for production promotion

## Direction

This replaces only the `/services` campaign hero's clamped-decision still. The
artifact makes one workflow boundary physical: a registered source stack becomes
a scored working packet, then one held sheet meets a black decision rail at a
single review-gold authority tab. Page copy, actions, proof, and state labels
remain authored DOM content.

| Study | Workflow meaning | Target surface | Accent |
| --- | --- | --- | --- |
| Paper Decision Gate v2 | Source → working material → held decision | `/services` | Review gold |

## Source and generation record

- The selected source is the user-supplied Omma export
  `v2-interactive-3d-hero-scene-agen.zip`, SHA-256
  `30fa5264526a6e8c1037d5c9268af4c664844279ea89956674494998a5ccad86`.
- The complete export is preserved byte-for-byte under
  `content/assets/brand/sources/omma-paper-hero-v2/`. A focused contract
  hash-locks its Svelte wrapper and all eight visual modules.
- The archive contains procedural Three.js source only. It contains no image,
  texture file, GLB, font, or bundled license. Its `package.json` declares Vite
  but omits its required `three` dependency, so the untouched export does not
  install and build by itself. The reference harness used Three 0.162.0.
- The production-constrained Omma brief is preserved at
  `source/omma-fresh-composition-prompt.md`. It fixes desktop/mobile copy and
  proof masks before camera selection and prohibits generated text, branded
  trade dress, macro optics, chromatic aberration, vignette, colored bloom,
  device orientation, auto-rotation, and animated meaning.
- Vizcom's authenticated `Agency Services — Decision Gate` file remains a
  composition reference only. Its imported user-provided GLBs have no
  discoverable rights record and do not appear in these pixels.

## Review and bounded runtime corrections

The untouched v2 export was rendered locally before integration. It exposed two
deterministic correctness defects rather than a prompt-only quality failure:

1. `rigs.js` built a camera basis with reversed right/up cross products. The
   complete cluster landed under the protected copy lane instead of inside the
   declared object field.
2. `geometry.js` emitted the folded sheet's top and bottom face triangles with
   winding opposite their supplied normals. The working packet and held sheet
   rendered black under normal material culling.

The runtime mirror under `src/lib/visual/omma-paper-hero-v2/` adds only:

- non-executable TypeScript check headers;
- corrected camera-basis cross-product order;
- corrected folded-face triangle winding; and
- a material-preserving BoxGeometry index/group collapse for repeated sheets,
  reducing six draws per sheet to two without changing vertices, UVs, normals,
  geometry, or the visible face/edge material boundary.

Agency owns the lifecycle/capability adapter at
`src/lib/visual/servicesDecisionGateRenderer.ts` and its host component. It
does not replace the v2 geometry, textures, materials, lighting, states, or
named camera rigs. Reduced-motion preference produces one settled static WebGL
frame; `?decision-gate=fallback` remains the deterministic non-WebGL path.

## Local verification

- Corrected integrated desktop frame: live copy and proof remain unobstructed;
  registered stack, folded packet, held sheet, black rail, and gold stop are all
  readable in the right artifact field.
- Corrected portrait scene and fallback: the upper copy lane and lower proof
  lane remain quiet while preserving the same object identity.
- Browser renderer metrics at 1280 × 720: profile
  `omma-paper-hero-v2-desktop`, 80 draw calls, 10 geometries, 7 textures, DPR
  1.5; all are inside the route budget.
- Full Agency check and Cloudflare-adapter production build pass locally. The
  only build notices are the existing Browserslist freshness and external
  canvas-kernel React import notices.
- Final production acceptance is still gated on operator visual approval and
  fresh full-route 1440 × 1000 and 390 × 844 verification, including keyboard,
  reduced motion, overflow, console, and request review.

## Public fallback exports

The fallbacks were captured from the corrected deterministic v2 scene in the
authenticated in-app Browser and converted with `cwebp -q 88 -m 6`.

| File | Dimensions | SHA-256 |
| --- | ---: | --- |
| `static/images/performance-lab/paper-services-decision-gate.webp` | 1280 × 720 | `b383c6b8478527e88c60f54dffa4b0aae212bdb8894926af165608f60f38a608` |
| `static/images/performance-lab/paper-services-decision-gate-mobile.webp` | 390 × 844 | `d94a9188a43f5c4e2d92badd26ac23e4c871985cccdcf5484d225296050ddcca` |

The older authored CSS study and its JPEG masters remain in this asset folder
as rejection history. They are not the current public fallback.

## Inspection and rejection record

- [x] No text, logo, watermark, interface, people, hands, water, glass,
  stationery, collage, random scraps, or crumpled paper appears in generated
  pixels.
- [x] Paper thickness, laminated edges, one controlled fold, a held sheet, one
  black decision rail, one gold authority tab, and contact shadows remain
  readable without generated labels.
- [x] The initial simplified Agency renderer was rejected because it replaced
  the exported material and geometry fidelity with low-detail slabs and a hard
  split gradient.
- [x] The controlled v1 exact-source benchmark proved technical fidelity but
  failed semantic legibility: its macro camera read as a sheet and rail rather
  than a source-to-stop workflow.
- [x] The untouched v2 export failed its own declared masks and material read
  because of the camera-basis and face-winding defects above.
- [x] The minimally corrected v2 runtime and generated fallback pair pass local
  desktop/portrait composition review. This is local acceptance, not production
  proof.
- [x] The separate `interactive-3d-ai-workflow-pro.zip` remains a `/products`
  System Spine candidate and is not imported by `/services`.

## Rights and use

The source archive was exported from the user's authenticated Omma project.
Omma's Terms of Service, reviewed on 2026-08-05, state that users retain rights
to content they create with the service, including generated code. The missing
archive license is recorded rather than inferred. This implementation uses no
Omma-hosted runtime, public community project, third-party GLB, or downloaded
generated-media asset. The visual is illustrative and must not be represented
as evidence of a real workflow execution.

## Refresh condition

Replace this candidate if its final page-context verifier fails, the `/services`
workflow meaning changes, or a later owned Paper artifact makes the same
source-to-stop boundary materially clearer. Do not refresh it for novelty.
