# CREATE SOMETHING Stop-Motion Pilot Intent Packet

Linear: CRE-1333
Lane: claim-worktree
Tier: mixed
Goal: Produce one auditable 20-second, 16:9 stop-motion marketing pilot that explains Signal -> Decision -> Proof without spatial or causal discontinuity.

## Decisions

- Internal CREATE SOMETHING campaign studio, not a general-purpose product.
- CREATE SOMETHING Performance material language with Vox-style editorial explainer storytelling.
- One 20-second 16:9 pilot only.
- One locked low three-quarter 35mm-equivalent camera showing the entire connected tunnel.
- True 12 fps authored cadence delivered in a 24 fps MP4.
- Recurring narration; no captions burned into the image.
- Player captions remain a separate WebVTT delivery artifact.
- Pilot story: Signal -> Decision -> Proof.

## Non-goals

- No 9:16, square, or responsive reframing.
- No multi-scene campaign library, editor UI, customer product, billing, or deployment.
- No publication, social posting, or production promotion.
- No real people, copyrighted characters, logos, generated UI, or text inside the image.

## Acceptance criteria

- Final MP4 is exactly 20 seconds, 1280x720, and 24 fps.
- Motion is conformed to 12 authored frames per second, with each pose held for two delivery frames.
- The clip visibly communicates an incoming signal, a policy decision, an approved action, and a proof receipt.
- The camera remains locked and the tunnel remains one connected physical route.
- The signal never reverses and is visibly beyond the gate before the proof receipt appears.
- The completed proof state holds still for the final two seconds.
- Narration says: "First, a signal. Then, a decision. Only then, action—and proof."
- No captions or other legible text are burned into the video.
- Scene spec, clean plates, deterministic composition, output hash, and WebVTT file are stored beside the export.

## Verification

- Inspect duration, frame rate, dimensions, codecs, and audio with `ffprobe`.
- Extract and visually inspect a contact sheet across the full clip.
- Hash the final MP4 and record the result in metadata.
- Confirm the generated clip did not alter unrelated repository files.

## Stop conditions

- Stop if the Sora credential or model access is unavailable.
- Stop rather than publish or deploy; promotion requires a separate approval.
- Reject the pilot if the story requires cuts to hide continuity failure.
- Reject the pilot if narration, generated text, or visual artifacts make the operational claim unclear.

## Policy artifacts

- `/AGENTS.md`
- `/packages/agency/AGENTS.md`
- `/docs/IMAGE_LANGUAGE_FOUNDATION.md`
- `/docs/PERFORMANCE_LAB_FOUNDATION_AUDIT.md`
- `/packages/ltd/src/lib/content/canon/guidelines/images.md`

## Evidence target

Local asset folder containing the final MP4, scene source, prompt, reference image, API receipt, accessibility sidecar, inspection sheet, and hashes.
