# Agency Handoff Boundary

> Asset ID: `brand.agency-handoff-boundary.v20260801`
> Owner: CREATE SOMETHING
> Generated and inspected: 2026-08-01
> Tracking: `CRE-1551`, motion correction `CRE-1554`, natural loop correction `CRE-1555`
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
- Natural-loop correction: live review found that the exact time reverse made the water reverse at
  the midpoint, so the closed cycle still read as a ping-pong rather than continuous operation.
  Three `sora-2-pro` motion studies were inspected before final finishing:
  - `video_6a6dff42ee1081919bdd87d66479dabe037c88d6d5d1d985` used the native 12-second
    cyclic motion pass in `source/sora-cyclic-prompt.txt`. It preserved the full apparatus and
    downstream motion but did not return to its opening waterline, so it was rejected as a loop.
  - `video_6a6e016f454c81938d1e7c39468e39e308ac1a5623bb1ef4` used
    `source/sora-cyclic-recovery-prompt.txt`. It lowered the waterline but reframed into a close crop,
    so it was rejected.
  - `video_6a6e02c8b0948191a520fe04b91fefd007bc595880363312` used
    `source/sora-steady-loop-prompt.txt`. It produced strong steady water motion but also reframed
    into a close crop, so it was rejected. No rejected Sora pixels appear in the accepted export.
- Accepted loop finishing: the approved full-frame still remains fixed while a soft mask confines a
  mathematically periodic ripple field to the contained-water region. Its eased phase advances
  monotonically, producing one-directional water motion without a reverse segment and reaching zero
  velocity at the cycle boundary. The result is a deterministic 300-frame closed cycle at 30 fps;
  it contains no cut or audio and relies on the native muted `loop` playback attribute.

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
| `static/images/performance-lab/agency-handoff-boundary-motion-loop-v2.mp4` | 1280 x 720, 10.0 s | `99da595f79322c58c5b50c1de0a2cd429548a153b07f987fc55888053a824d38` | H.264 natural cyclic loop |
| `static/images/performance-lab/agency-handoff-boundary-motion-loop-v2.webm` | 1280 x 720, 10.0 s | `14b6f8c0042b00578f1d6d4e52cbb705e5002614c3e756b7f1f943cdece6c3cb` | VP9 natural cyclic loop |

## Inspection record

- [x] Original and responsive exports inspected individually.
- [x] Ten motion checkpoints inspected across the accepted cycle; apparatus geometry and copy space remain fixed.
- [x] The water surface changes clearly while the waterline, gate, camera, and fixture stay fixed.
- [x] Water-region SSIM between the opening and half-cycle frames is `0.585141`, confirming that
  the localized ripple motion remains clearly visible rather than regressing to the rejected stillness.
- [x] The cycle contains no time reverse, midpoint turnaround, state reset, or cut.
- [x] Decoded MP4 seam SSIM is `0.993943`; the boundary advances by one eased ripple phase rather
  than jumping to a different physical state.
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
