# Agency Handoff Boundary

> Asset ID: `brand.agency-handoff-boundary.v20260801`
> Owner: CREATE SOMETHING
> Generated and inspected: 2026-08-01
> Tracking: `CRE-1551`, motion correction `CRE-1554`, natural loop correction `CRE-1555`, full-frame correction `CRE-1559`, fluid-intelligence direction `CRE-1562`
> Status: approved for the `.agency` homepage only

## Role

This homepage-owned Performance Lab media family replaces the shared natural-water opening. The
current v4 video shows a water-driven liquid-glass calibration instrument operating inside a fixed
test stand. A restrained blue-green dye tracer makes pressure and continuous circulation visible;
the rotor translates that pressure into controlled work. The left half remains quiet enough for the
headline, while the right half carries the operating condition. Earlier hydraulic and rigid-rotor
studies remain in this record as iteration history only.

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
- Rejected v2 finishing: the approved full-frame still remained fixed while a soft mask confined a
  mathematically periodic ripple field to the contained-water region. Its eased phase advances
  monotonically, producing one-directional water motion without a reverse segment and reaching zero
  velocity at the cycle boundary. The result is a deterministic 300-frame closed cycle at 30 fps;
  it contains no cut or audio and relies on the native muted `loop` playback attribute. This export
  was rejected after user screenshot review because the masked lower region read as a warped
  bottom-half treatment rather than a coherent video shot.
- Native-video correction: `CRE-1559` started fresh with `sora-2-pro` native text-to-video. No input image,
  source still, remix parent, or image animation was used. The accepted generation job is
  `video_6a6e3f855dd08193bd9e0e0af70afb0c0c7e67327025f8bc`, created from the exact prompt in
  `source/sora-native-brand-loop-simple-prompt.txt`. It produced one continuous locked shot of a
  rigid calibration rotor. Matching source phases at frames `77` and `257` are exactly six seconds
  apart and measure `0.968897` full-resolution SSIM. That native physical cycle was uniformly timed
  to twelve seconds, with every source frame kept whole. No dissolve, interpolation, time reverse,
  frozen background, composited image, or regional treatment is present, and no spatial mask is
  used. The final 360-frame export uses a direct phase boundary: its last frame flows to the
  matching first phase as the next ordinary rotor frame.
- Fluid-intelligence direction: `CRE-1562` used the original text-only moodboard brief in
  `source/fluid-intelligence-motion-system.md` to define the idea, materials, camera, light, and
  motion system. The generated moodboard is retained in `source/fluid-intelligence-motion-moodboard.jpg`
  as review evidence only. It was not supplied to Sora as an input image or reference frame.
- Accepted v4 generation: Sora job
  `video_6a6e5fe931d481918d9b27c50492831e0e6ad0eb8ba83e51` used `sora-2-pro`,
  1280 x 720, and the exact native text-to-video prompt in
  `source/sora-fluid-intelligence-loop-prompt.txt`. No input image, edit source, or remix parent was
  supplied. The one locked shot produced a stable liquid-glass annular instrument, a continuously
  rotating metal rotor, a large near-black copy field, and a circulating water pulse marked by a
  restrained blue-green dye trace: fluid intelligence under pressure.
- Accepted v4 loop finishing: the native matching phases at frames `187` and `340` measure
  `0.949592` full-frame SSIM and `0.939489` on the apparatus crop. Frames `187` through `339` form
  the accepted 153-frame forward physical cycle. They were uniformly timed from 5.1 seconds to
  twelve seconds and encoded at 30 fps using whole native frames only; repeated display frames fill
  the common playback cadence, with no synthesized in-between frames. Frame `340` is the next
  native phase after the last included frame and matches frame `187`, so the final export uses a
  direct phase boundary. No dissolve, interpolation, time reverse, frozen background, composited
  image, spatial mask, regional treatment, cut, or hidden reset is present.

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
| `static/images/performance-lab/agency-handoff-boundary-motion-loop-v2.mp4` | 1280 x 720, 10.0 s | `99da595f79322c58c5b50c1de0a2cd429548a153b07f987fc55888053a824d38` | Rejected masked H.264 treatment |
| `static/images/performance-lab/agency-handoff-boundary-motion-loop-v2.webm` | 1280 x 720, 10.0 s | `14b6f8c0042b00578f1d6d4e52cbb705e5002614c3e756b7f1f943cdece6c3cb` | Rejected masked VP9 treatment |
| `static/images/performance-lab/agency-performance-calibration-loop-v3.mp4` | 1280 x 720, 12.0 s | `ad49a2f85b9a8f5ca6519099279dec2b15b49bf0c481b0256d2cf4ad63f00491` | Accepted H.264 native-video loop |
| `static/images/performance-lab/agency-performance-calibration-loop-v3.webm` | 1280 x 720, 12.0 s | `fea9e85a69d09a7dcaaaddd753944f715ea9ba397ca90cd7224033a8b5c469d9` | Accepted VP9 native-video loop |
| `static/images/performance-lab/agency-performance-calibration-loop-v3-poster.webp` | 1280 x 720 | `bb6169987350556a4fa7bf43d116076c1ce1e1ae427a0bbef7ff51e9865369eb` | Video-derived desktop poster and reduced-motion still |
| `static/images/performance-lab/agency-performance-calibration-loop-v3-poster-mobile.webp` | 819 x 1024 | `9625a64a96fcb900d07b66223c1f26fb5f864121214b48b90140061b8362ab40` | Video-derived mobile poster and reduced-motion still |
| `static/images/performance-lab/agency-fluid-intelligence-loop-v4.mp4` | 1280 x 720, 12.0 s | `9232f5352f3830a15fbecaa5fba80edbdba8e0a42323b198ed094ac139d2eac0` | Accepted H.264 native-video fluid-instrument loop |
| `static/images/performance-lab/agency-fluid-intelligence-loop-v4.webm` | 1280 x 720, 12.0 s | `9418a1e6fa27cd0a12699a94b0bf8329b67d2090ca0710b94a349b271203a545` | Accepted VP9 native-video fluid-instrument loop |
| `static/images/performance-lab/agency-fluid-intelligence-loop-v4-poster.webp` | 1280 x 720 | `347b1eed30c17a43810cc6c29c83fa6876e2d1d7e1ebb9bb8048ee120ca03e65` | Video-derived desktop poster and reduced-motion still |
| `static/images/performance-lab/agency-fluid-intelligence-loop-v4-poster-mobile.webp` | 819 x 1024 | `b12b93c6e1cdb23a5e2ce8265fff596509e1c0ffe8ef7c4377ce408bc1541a7a` | Video-derived mobile poster centered on the instrument |

## Inspection record

- [x] v4 is native text-to-video from one locked Sora shot; no reference image, edit source, or remix parent was supplied.
- [x] The accepted source cycle is frames `187` through `339`; frame `340` matches frame `187` at `0.949592` full-frame SSIM and `0.939489` apparatus-crop SSIM.
- [x] The last included source frame to the matching first phase is one ordinary forward-motion step.
- [x] A blue-green dye trace stays inside the transparent annular water channel and remains visible throughout the cycle.
- [x] The metal rotor, axle, glass ring, inlet, outlet, base, camera, lighting, and left copy field remain stable through twelve checkpoints.
- [x] No dissolve, interpolation, mask, bottom-half effect, regional displacement, still-image layer, time reverse, or hidden reset is present.
- [x] The v4 MP4 and WebM contain 360 frames at 30 fps, a 12.0-second duration, and no audio stream.
- [x] Decoded v4 MP4 first-to-last SSIM is `0.915364`; the final frame advances into the matching source phase rather than duplicating it.

### Accepted v3 rigid-rotor inspection history

- [x] v3 is native text-to-video from one locked Sora shot; no reference image or remix parent was supplied.
- [x] The accepted source cycle is frames `77` through `256`; frame `257` matches frame `77` at `0.968897` SSIM.
- [x] The last included source frame to the matching first phase is an ordinary forward-motion step, not a reset or reverse.
- [x] No dissolve, interpolation, mask, bottom-half effect, regional displacement, still-image layer, or time reverse is present.
- [x] The v3 MP4 contains 360 frames at 30 fps, a 12.0-second duration, and no audio stream.
- [x] Twelve motion checkpoints preserve the locked camera, fixed stand, near-black copy field, and continuously rotating wheel.

### Rejected hydraulic-study inspection history

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
