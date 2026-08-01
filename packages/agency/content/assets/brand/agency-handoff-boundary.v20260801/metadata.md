# Agency Handoff Boundary

> Asset ID: `brand.agency-handoff-boundary.v20260801`
> Owner: CREATE SOMETHING
> Generated and inspected: 2026-08-01
> Tracking: `CRE-1551`, motion correction `CRE-1554`
> Status: approved for the `.agency` homepage only

## Role

This homepage-owned Performance Lab study replaces the shared natural-water opening. It shows a
real bench-scale hydraulic boundary: a glass channel, fixed steel gate, gauge, datum, and contained
flow. The apparatus makes ownership and control visible without depicting a person. The left half
remains quiet enough for the headline; the right half carries the operating condition.

Visual family: `material-prototype-study`.

## Generation record

- Still model: OpenAI `gpt-image-1.5` through the bundled Imagegen workflow.
- Exact still prompt: `source/imagegen-prompt.txt`.
- Reference images supplied to the still model: none.
- Motion model: OpenAI `sora-2-pro`, 1280 x 720, 4 seconds, using the accepted still as
  the input reference and `source/sora-prompt.txt` as the exact structured prompt.
- Motion job: `video_6a6d8d399cfc8191ae368f04c57ff9c90d60f51428cbbb02`, completed with a
  vault-injected `WEBFLOW_OPENAI_API_KEY`. The credential value was neither printed nor persisted.
- Motion finishing: the completed study was horizontally flipped to restore the accepted still's
  left-side copy space and right-side apparatus. Its empty AAC track was removed. H.264 and VP9
  exports contain video only; the accepted still remains the reduced-motion and loading fallback.
- Motion correction: live review found that the first study's water change was too restrained to
  read as animation at homepage scale. Sora remix
  `video_6a6dc5140cd08191bd68a518e3c6f7ad0fb40a43c63fec7a` uses the exact prompt in
  `source/sora-remix-prompt.txt`. The forward surge was joined to its time reverse, creating a
  deterministic 240-frame closed cycle. The replacement begins and ends at the same physical
  state, contains no cut or audio, and relies on the native muted `loop` playback attribute.

Mobbin supplied hierarchy evidence only. No Mobbin screen, asset, copy, layout, or trade dress was
used as a generation input or reproduced.

## Accepted exports

| File | Size | SHA-256 | Role |
| --- | ---: | --- | --- |
| `exports/agency-handoff-boundary.png` | 1672 x 941 | `242d900bf17107195b740ffee333e6459205fa14d5d9d9a4a51b82945672175b` | Original generation master |
| `static/images/performance-lab/agency-handoff-boundary.webp` | 1536 x 864 | `048965e6c1cc72e850e4063363c1d5c51104dea335fdb0d76001fdb4c4eef6fb` | Desktop homepage opening |
| `static/images/performance-lab/agency-handoff-boundary-mobile.webp` | 819 x 1024 | `e9621d46bde43210aa6f63ee5293e5f82efec847350ad3da501dcefdf3bed9f3` | Mobile hard crop on gate and gauge |
| `static/images/performance-lab/agency-handoff-boundary-motion-loop.mp4` | 1280 x 720, 8.0 s | `8969fd066b2a33a12e380074a728c0e923acb8ef3c12b2f4b076a5be58e1a2b1` | H.264 visibly animated closed loop |
| `static/images/performance-lab/agency-handoff-boundary-motion-loop.webm` | 1280 x 720, 8.0 s | `2c3529020dc5cb6c7a5e279007bbfaadbeeb486a04c7c59f4d470f427b39c3c0` | VP9 visibly animated closed loop |

## Inspection record

- [x] Original and responsive exports inspected individually.
- [x] Eight motion checkpoints inspected across the forward and reverse cycle; apparatus geometry remains stable.
- [x] The waterline and rolling surge change clearly while the gate, camera, and fixture stay fixed.
- [x] Apparatus-region SSIM falls from `0.919592` in the rejected study to `0.836093` in the
  replacement, confirming materially greater frame change.
- [x] The forward sequence and exact time reverse form a deterministic closed cycle without a cut.
- [x] Motion exports contain no audio stream and preserve the still as a reduced-motion fallback.
- [x] Gate, gauge, channel, water boundary, and supporting fixture remain legible.
- [x] Desktop retains near-black negative space for copy.
- [x] Mobile centers the boundary apparatus rather than an empty or landscape crop.
- [x] Monochrome treatment contains no blue, cyan, decorative gradient, or AI glow.
- [x] No person, hand, face, logo, watermark, or third-party mark is present.
- [x] No fake workflow result or numeric claim is embedded in the image.
- [x] The image is illustrative campaign material, not evidence of a real workflow run.
- [x] Assigned to one public surface family: `.agency` homepage.

## Rights and refresh

Original generated work from a CREATE SOMETHING-authored prompt. No external image was passed to
the model, copied, or traced. Replace only when the homepage decision or material grammar changes,
or when the motion study no longer explains flow without changing the apparatus or competing with
the copy.
