# Agency Paper Decision Gate — original 3D render

> Asset ID: `brand.agency-paper-decision-gate-3d.v20260805`
> Owner: CREATE SOMETHING
> Rendered and inspected: 2026-08-05
> Tracking: `CRE-1625`
> Status: bounded Omma-derived interactive candidate under local `/services` page-context verification; deterministic CSS 3D pair retained as the required fallback

## Direction

This replaces only the existing `/services` campaign hero's clamped-decision
still. The artifact is a working-paper decision gate: a source sheet becomes a
seven-layer decision stack, rises into one held paper face, and is physically
stopped by a single carbon rail with one review-gold authority tab. All page
copy, proof, and controls remain authored DOM content.

| Study | Workflow meaning | Target surface | Accent |
| --- | --- | --- | --- |
| Paper Decision Gate | A named decision holds continuation at a visible stop boundary | `/services` | Review gold |

## Generation and source record

- Final pixels are deterministic CSS 3D rendered from
  `source/render_decision_gate.html`, with no generated-image model, external
  image, external texture, or third-party GLB. They remain the static fallback,
  not the default renderer when WebGL is available.
- Interactive source began with the user-supplied
  `interactive-3d-hero-scene-agen.zip` Omma export (SHA-256
  `ccd2ddab4e5253a0c4bedbfbb953935e2c1b383e8ad2a77a56cbda417bef7beb`).
  The supplied archive contains procedural source code and its README only;
  it contains no image, GLB, texture, or license file. Its paper, stack, rail,
  and authority-tab semantics were adapted into the owned Agency renderer at
  `src/lib/visual/servicesDecisionGateRenderer.ts` and client-only capability
  wrapper at `src/lib/components/ServicesDecisionGateCanvas.svelte`.
- Native captures used the authenticated in-app browser at 1536 x 1024
  (desktop) and 852 x 1410 (mobile). The mobile query changes only framing.
- Public WebP exports use `cwebp -q 88 -m 6` without resizing.
- The composition brief, renderer, model/prompt non-applicability, source
  inputs, and hard exclusions are documented in `source/composition.md`.
- Vizcom's authenticated `Agency Services — Decision Gate` file provided
  composition review. Its imported user-provided GLBs had no discoverable
  rights record, so none were used in final pixels.
- A local Blender 5.2.0 primitive-only render crashed before output. No Blender
  output is represented as an accepted master.
- Omma's macro camera, blue/red lighting, post-process, device orientation,
  and animation loop were rejected. The Agency renderer keeps a static
  reduced-motion state, capped DPR, no device-orientation listener, no required
  animation loop, and uses only the repository's local `three` dependency plus
  procedural `CanvasTexture` maps.

## Omma use and provenance

- The source archive was exported from the user's authenticated Omma project.
  [Omma Terms of Service](https://omma.build/landing/terms), last updated
  June 20, 2026 and reviewed on 2026-08-05, state that users retain ownership
  rights to content they create using the service, including generated code.
- The archive's absence of a bundled license is therefore recorded rather than
  inferred. The implementation uses no external Omma-hosted runtime, trademark,
  public project content, third-party GLB, or downloaded generated-media asset.
- The Terms require review and validation of AI-generated content before public
  use. This record is not a claim that the visual represents a real workflow.

## Static fallback masters

| File | Dimensions | SHA-256 |
| --- | ---: | --- |
| `exports/decision-gate-desktop.jpg` | 1536 x 1024 | `799cfea1a9ed112cad67a3bbf381f06f7d6dc3ed8593fa0c3b9c4a3066cd5e2d` |
| `exports/decision-gate-mobile.jpg` | 852 x 1410 | `2805550830dc917e6fb82a3f41c5d05d216e4244b641a14ff25b7ce6f5216c52` |

## Public fallback exports

| File | Dimensions | SHA-256 |
| --- | ---: | --- |
| `static/images/performance-lab/paper-services-decision-gate.webp` | 1536 x 1024 | `50c756b4e82fcf881ffcf1e2c7327f172d6438c1a1dd222eba714120e3965294` |
| `static/images/performance-lab/paper-services-decision-gate-mobile.webp` | 852 x 1410 | `f18a4299c71a9edcd1e35a7df6d5cdf23898a904e4c22604cf14ee508f197a30` |

## Inspection and rejection record

- [x] Original masters inspected at native size and the public WebP files
  inspected after conversion.
- [x] Landscape preserves a quiet left copy lane; portrait preserves a quiet
  upper copy lane before the lower 3D paper sequence.
- [x] Paper thickness, layered edges, a held face, carbon stop rail, one brass
  authority tab, and contact shadows remain readable without generated text.
- [x] No text, logo, watermark, interface, people, hands, water, glass,
  collage, stationery, random scraps, crumpled paper, or fake evidence appears.
- [x] The prior `/services` hero was rejected as a final candidate because its
  single low paper edge did not make the source-to-stop relationship legible.
- [x] Vizcom 3D studies were retained as non-final composition references. The
  imported assets lack rights documentation, and their wide study left the
  paper state too pale or underscaled for the live route.
- [x] The primitive-only Blender route was rejected because headless Blender
  crashed before output; this has no effect on the accepted CSS 3D source.

- [x] The initial local Omma-derived desktop composition was rejected because
  its carbon rail crossed the live headline. The accepted local revision moves
  and shortens the source, stack, stop rail, and tab into a right-side dark
  instrument band, keeping the live left copy lane clear.
- [x] Forced fallback verification confirms the static study remains a readable
  Paper-native route fallback rather than a second WebGL canvas.
- [x] The supplied `interactive-3d-ai-workflow-pro.zip` was reviewed only as a
  separate `/products` System Spine candidate; it is not imported or used by
  this `/services` artifact.

## Rights and use

CREATE SOMETHING-authored HTML, CSS, and browser-rendered pixels only. No
external image input, third-party asset, or model is present in the static
fallback masters. The interactive candidate is a user-owned Omma-derived,
locally adapted procedural renderer; it imports the repository's existing
`three` package but no Omma runtime or external media. The visual is
illustrative and must not be presented as evidence of a real workflow run.

## Refresh condition

Replace this study only if the `/services` workflow meaning changes, a current
desktop or mobile page-context verifier fails, or a later owned working-paper
artifact clearly improves the source-to-stop legibility. Do not refresh for
novelty alone.
