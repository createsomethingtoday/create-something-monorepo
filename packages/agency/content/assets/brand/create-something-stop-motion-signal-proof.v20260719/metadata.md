# CREATE SOMETHING Stop-Motion Signal -> Decision -> Proof

> Content asset ID: `brand.stop-motion.signal-decision-proof.v20260719`
> Owner: CREATE SOMETHING
> Surface: internal marketing pilot
> Review status: draft
> Publication status: not approved
> Last updated: 2026-07-19

## Source

| Artifact | Purpose |
| --- | --- |
| `source/intent-packet.md` | Approved scope, acceptance criteria, and boundaries |
| `source/scene.v1.json` | Machine-readable who/what/where/when/camera/timing source |
| `source/sora-prompt--v20260719.txt` | Exact structured video-generation prompt |
| `source/reference--1280x720--v20260719.png` | 16:9 derivative of the approved Performance Lab material reference |
| `source/captions--en--v20260719.vtt` | Player-rendered English captions; not burned into the video |
| `source/scene.v3.json` | Addressable 18-second scene, render-cell dependencies, and cost policy |
| `source/sora-prompt--proof-resolution--v3--v20260719.txt` | Exact prompt for the isolated proof-resolution cell |
| `source/captions--en--v3--v20260719.vtt` | Player-rendered captions for the 18-second delivery |
| `source/scene.v8.json` | Final 20-second deterministic scene contract and invariants |
| `source/clean-plate--v8--v20260719.png` | AI-generated connected-tunnel plate with the gate closed |
| `source/open-gate-plate--v8--v20260719.png` | Matching AI-generated plate with the gate open |
| `source/captions--en--v8--v20260719.vtt` | Player-rendered captions for the 20-second delivery |
| `source/sora-prompt--v7--connected-tunnel-pro--20s--v20260719.txt` | Exact prompt for the final whole-scene source generation |
| `receipts/sora-single-shot--v7--v20260719.json` | Request and provider receipt for the retained V7 source |

## Generation

| Field | Value |
| --- | --- |
| Provider | OpenAI |
| Model | `sora-2-pro` |
| Requested master | 1280x720, 12 seconds |
| Final delivery | 1280x720, exactly 10 seconds, 24 fps |
| Authored cadence | 12 fps, each pose held for two delivery frames |
| Sora job | `video_6a5cde81e1708193bfd0f419e5bb751a03dff68369cf80c9` |
| Credential source | Infisical `prod:/`: `WEBFLOW_OPENAI_API_KEY` injected as `OPENAI_API_KEY`; value never written to disk |
| Generated master hash | `d705bdf5890431d54c3e887cebb3cdc00fd25a90b2f2c3aa0cb28cc17de88c90` |
| Final export hash | `f030613730d2ca9147a372c625f65e6f4ded57b7837a605b75da6f09de564622` |
| Scene spec hash | `58724057716ff1c2886b7a4c39ae639fbdeb3433076396634ce4194b6d768926` |
| Prompt hash | `e8281a5b846321994de570204f2dc034ec2729107fc9921624c373adb6807cf0` |
| Reference hash | `eb3f538079aeae7a6d7c328b9df22036ddc86946e4ac8e2055eecf024c0e6154` |

## Review gate

- [x] The incoming signal is visually clear.
- [x] The policy gate visibly pauses, decides, and opens.
- [x] The downstream water and proof handoff read as evidence of action.
- [x] The proof card is the final focal object.
- [x] The camera remains one continuous shot with no visible cut in the contact-sheet review.
- [x] The story completes by 10 seconds.
- [x] The final encode samples 12 authored poses per second and duplicates each pose into a 24 fps delivery.
- [x] Narration is intelligible and matches the approved line according to an independent Whisper transcription.
- [x] No captions, text, logos, watermarks, fake UI, or people appear.
- [x] The final export passes ffprobe and contact-sheet inspection.

## Verification result

- Final duration: `10.000000` seconds.
- Final dimensions: `1280x720`.
- Final video: H.264, `24/1` fps, `240` frames.
- Final audio: AAC, stereo, 96 kHz.
- Independent audio transcription: `AI work shouldn't just run, it should leave proof.`
- Visual evidence: `receipts/final-contact-sheet--v20260719.jpg`.

## Revision v2: directed causal scene

The v2 remix responds to the v1 coherence review. It preserves the miniature Performance laboratory while replacing adjacent symbolic events with one directed left-to-right route.

| Field | Value |
| --- | --- |
| Source scene | `source/scene.v2.json` |
| Remix prompt | `source/sora-remix-prompt--v2--v20260719.txt` |
| Remixed from | `video_6a5cde81e1708193bfd0f419e5bb751a03dff68369cf80c9` |
| Sora remix job | `video_6a5ce355fb288190bc2434bb68e5bafd0f04007483e349c8` |
| Requested master | `sora-2-pro`, 1280x720, 12 seconds |
| Final delivery | 1280x720, exactly 10 seconds, 240 frames at 24 fps |
| Full-sequence conform | Entire 12.1-second master accelerated to 10 seconds before 12 fps sampling, preserving the receipt event |
| Scene spec hash | `20def8d6f1dcbbb5eeae4a87d1050add55565e09f924d2e6cc5a56e74995ee94` |
| Remix prompt hash | `47d333c7d96193b570ee7721aa2345c4f4c11ba4360f2c43a522f169efb8f105` |
| Generated master hash | `9d9996b8152ee77eaa9ff43b5b4b1710091562d3ed7b666f842a4f419157a9b0` |
| Final export hash | `d8cec89416f050d4aecd3e21e366bac22618cceca1698b70ecceba173f069d1e` |
| Estimated generation cost | $3.60 at the documented $0.30/second Pro 1280x720 rate |

### V2 review

- [x] Opening composition establishes one connected route before the action.
- [x] The cobalt signal visibly changes position from the inlet to the decision gate.
- [x] Camera progression follows the same left-to-right route.
- [x] The proof card is withheld until the final beat.
- [x] The new narration independently transcribes as the approved three-part line.
- [x] The final delivery is exactly 10 seconds, 1280x720, and 240 frames at 24 fps.
- [x] No captions or legible text are burned into the video.
- [ ] The same cobalt signal is not continuously visible after entering the gate; the gate occludes it before the proof card appears.

V2 verdict: clearer candidate, not final approval. It resolves scene establishment and direction, but a future deterministic compositor or another specifically approved render would be required to prove continuous signal identity through the gate without occlusion.

## Revision v3: completed proof resolution

V3 preserves the approved ten-second v2 journey as a cached render cell and
adds one eight-second proof-resolution cell. The receipt now finishes its
mechanical travel, receives a restrained cobalt verification glint, and remains
visible through a terminal hold instead of being cut at issuance.

| Field | Value |
| --- | --- |
| Source scene | `source/scene.v3.json` |
| Cached cell | `exports/signal-decision-proof--remix-v2--10s--16x9--v20260719.mp4` |
| Generated cell | `exports/signal-decision-proof--proof-resolution--8s--16x9--v20260719.mp4` |
| Sora job | `video_6a5ce9c346908190931867b08cad88ee03c39c9cf12e6940` |
| Generated model | `sora-2`, 1280x720, 8 seconds |
| Final delivery | 1280x720, exactly 18 seconds, 432 frames at 24 fps |
| Authored cadence | 12 sampled poses per second, duplicated for 24 fps delivery |
| Cell transition | 0.3-second deterministic stop-motion crossfade at 9.7 seconds |
| Scene spec hash | `f8ca5bb687b10aa55305075c38ff365e1e7fcf2d04eed138a498520e8ee6ee59` |
| Continuation prompt hash | `169a05aea5d5387f8a98556c9bc42a9bc2867cc1ea1d0c300a4dd68e408aa3b0` |
| Input reference hash | `966670121eb0e1eb2d746f2d7249a6d416709536b99edfcfe562d3a682521606` |
| Generated cell hash | `ef84c4b279320137f8bbd3df669996c4904a499af9be226285514f35ff279a21` |
| Final export hash | `d68f866e9ac2e2672ecac39d71b787d9f686fd822e713bed9eacb5a05ac27c95` |
| Incremental generation cost | $0.80 at the documented $0.10/second Sora 2 1280x720 rate |
| Cumulative pilot generation cost | $8.00: $3.60 original + $3.60 v2 remix + $0.80 v3 cell |

### V3 programmatic receipts

- `receipts/motion-plan--v3--draft.json` proves the compiler reused the cached
  v2 cell and priced only `proof-resolution-v1` at $0.80.
- `receipts/motion-edit-plan--proof-resolution--v3--draft.json` proves that an
  edit to the proof-resolution beat invalidates only that cell and its terminal
  hold.
- `receipts/motion-assembly--v3.json` records the exact cached and regenerated
  cells used by the deterministic assembler.
- `receipts/motion-verification--v3.json` is the fail-closed Motion Studio media
  verdict; every delivery check passes.
- `receipts/final-ffprobe--v3--v20260719.json` proves the final media contract.
- `receipts/cadence-verification--v3--v20260719.txt` proves the adjacent
  delivery-frame pairs preserve the intended 12-pose-per-second cadence.
- `receipts/audio-transcription--v3--v20260719.txt` independently verifies the
  narration and confirms no additional generated speech in the continuation.
- `receipts/final-contact-sheet--1s--v3--v20260719.jpg` and
  `receipts/final-seam-contact-sheet--v3--v20260719.jpg` provide visual review
  surfaces for the whole story and the cell boundary.

### V3 review

- [x] The complete 18-second story remains one left-to-right causal journey.
- [x] The existing signal, decision, action, and proof beats are reused without another paid generation.
- [x] The receipt finishes its travel instead of being cut at issuance.
- [x] The cobalt verification event is restrained and causally attached to the receipt.
- [x] The proof remains visible through the terminal hold.
- [x] The delivery is exactly 18 seconds, 1280x720, and 432 frames at 24 fps.
- [x] The encode contains video and audio streams and no subtitle stream.
- [x] The narration independently transcribes as the approved line.
- [x] No captions or legible text are burned into the video.
- [x] The generated continuation stayed inside its $1.60 draft budget without a Pro rerender.

V3 verdict: complete internal pilot candidate. Publication remains a separate
approval boundary.

## Revision v8: deterministic connected-tunnel recreation

V8 supersedes the stitched and fully generative candidates. The environment is
AI-generated, while Remotion deterministically controls the cube, gate state,
receipt timing, camera, and 12 fps pose cadence. This removes the topology and
causal failures found in the prior renders and makes future element-level edits
local and zero-generation-cost.

| Field | Value |
| --- | --- |
| Source scene | `source/scene.v8.json` |
| Composition | `packages/motion-studio/src/compositions/SignalDecisionProof.tsx` |
| Final delivery | 1280x720, exactly 20 seconds, 480 frames at 24 fps |
| Authored cadence | 12 sampled poses per second, duplicated for 24 fps delivery |
| Camera | Locked wide, low three-quarter view |
| Closed-gate plate hash | `3f5104194f05abb55994fb1a174e4da67ebe83e17136b0dfcd2d2ffc3842eab3` |
| Open-gate plate hash | `7b9002b47875b8e6a516b2ac5760d87eb8d42d955904f8d8fda081be7e6b6a44` |
| Composition hash | `04d2eebf46592ba0bfacd89852d7af37ad84182604f58c4739efefba51df860a` |
| Final export hash | `8cb49efc5ff88f08ef654072fce72731bf833be78217589b24ce81b5c2e84500` |
| Incremental AI video cost for the deterministic V8 pass | $0; V8 reuses the V7 source audio and uses image clean plates plus local rendering |
| Recreation-sequence AI video spend | $10 total: two rejected $2 Sora 2 drafts plus the $6 Sora 2 Pro source used by V8 |
| Cumulative pilot AI video spend | $18 through V8; image-edit tool usage is not included because no price receipt was exposed |

### V8 programmatic receipts

- `test/signal-decision-proof.test.ts` proves signal x-position never decreases,
  passage precedes proof, and the receipt reaches its terminal state.
- `receipts/final-ffprobe--v8--v20260719.json` proves the exact media contract.
- `receipts/cadence-verification--v8--v20260719.txt` proves paired-frame cadence.
- `receipts/audio-transcription--v8--v20260719.txt` independently verifies narration.
- `receipts/final-contact-sheet--500ms--v8--v20260719.jpg` exposes the entire
  sequence at half-second intervals for continuity review.

### V8 review

- [x] One unbroken acrylic channel remains visible throughout.
- [x] The same cobalt cube moves only left to right.
- [x] The gate opens before the cube passes through it.
- [x] The cube is clearly beyond the gate before the receipt appears.
- [x] The receipt completes its travel and the final state holds for two seconds.
- [x] The delivery is exactly 20 seconds, 1280x720, and 480 frames at 24 fps.
- [x] The encode contains video and audio streams and no subtitle stream.
- [x] Narration independently transcribes as the approved line.
- [x] No captions or legible text are burned into the video.

V8 verdict: recreated internal pilot master. Publication remains a separate
approval boundary.

## Boundary

This artifact is an internal prototype. Generation and local review do not authorize publication, posting, deployment, or broader product development.
