---
name: demo-director
description: Create cinematic product showcases from real browser or desktop recordings with reproducible FFmpeg zooms, pans, cuts and narration. Use for product demos and release videos, including Draw agent interactions; preserve actual product behavior and timing.
---

# Demo Director

Create a film of the product working. Use retained recordings, a reviewed spoken script, and a JSON edit manifest. Resolve this plugin root two directories above this skill. Python 3, FFmpeg (with libx264, drawtext and loudnorm), and FFprobe are required. Run `python3 <root>/scripts/director.py --help`.

## Brief and sources

Resolve audience, takeaway, duration, aspect ratio, narration/music, and delivery destination from the request. Ask only consequential missing questions. Default delivery is a private local MP4, not public posting. A browser selection is part of the user's intent: if it cannot capture, explain the limitation and obtain agreement before switching browsers.

For CREATE SOMETHING narration, use the installed Draw & Motion + Descript skill when available. It owns the approved Voice A, credential retrieval, async jobs, transcript verification and private audio export. If unavailable, use supplied narration or ask for the missing capability; never substitute a voice. Do not stretch speech to meet picture timing. When the user requests breathing room, add silence at verified sentence boundaries and longer paragraph breaks, then retime the shots; preserve the existing performance and retain the prior composition. For music, require a separately accepted source and usage rights; do not invent a music bed.

Write one spoken paragraph per beat. Keep titles and production directions out of speech. Do not turn a single timing observation into a general speed claim. Narration and shot coverage must demonstrate the same behavior. In agent-product demos, explain the agent-to-product connection before showing actions. Distinguish the transport actually recorded from other supported paths (for Draw: paired MCP adapter versus browser-native WebMCP); label explanatory overlays as editorial context, not product UI.

## Capture real behavior

Use a staging project or retain a recovery snapshot before reversible edits. Preserve user work. Use the product's supported agent tools for actual agent interactions and ordinary UI controls for human actions. Record command/change receipts separately. Do not inject fake activity, emulate product UI, expose pairing codes, or film unrelated private windows.

For an authorized Ego Page, import `<root>/scripts/capture.mjs` inside `ego-browser nodejs` and call `capture(page, absoluteNewDirectory, seconds, action)`. It records the current page via supported CDP screencast commands while an optional async action runs. Duration is bounded to 120 seconds. Discover and observe the page before passing it in; use the same TaskSpace throughout. The helper saves only frame data and timing, not unrelated network events. It does not create/select a browser or grant access.

Encode the retained capture with `python3 <root>/scripts/director.py encode-capture <capture-directory> <new-recording.mp4>`. Frame arrival timings preserve holds; do not present this as a precision latency measurement. Camera effects belong to the edit, not to fabricated in-product behavior. If capture fails, retain partial evidence and resolve access; do not substitute animated stills without agreement.

## Edit and render

Read [the manifest contract](references/manifest.md). Create a version 1 manifest with source files, source ranges, narration segments and camera endpoints. Sources resolve relative to the manifest. Save the original narration and footage beside it or link local retained files.

Use wide shots to orient, push-ins to reveal detail, pans to follow causally related objects, and cuts between distinct actions. Set equal camera endpoints for reading holds. Keep important UI within the crop. Use a restrained zoom (usually 1–1.6), not constant motion. Avoid captions that obscure controls or imply in-product UI. Keep real action clips at native speed. Reorder clips only when the sequence still truthfully represents the workflow.

Run `python3 <root>/scripts/director.py render <manifest.json> <new-final.mp4>`. This validates source ranges, preserves narration speed, inserts explicit pauses, applies smooth camera interpolation, assembles cuts, normalizes speech and writes hashes plus a technical receipt. Existing outputs are refused. Rendering is local; the plugin has no cloud service or credentials.

## Acceptance and handoff

Inspect frames at every cut and the tightest crops. Verify script against the exported transcript, source audio duration, output streams, full decode, and picture/narration alignment. Play the entire film when playback is available. A technical receipt is not an audible or aesthetic verdict; report unavailable checks and ask the owner to audition the final output.

Deliver the playable MP4, script/transcript, edit manifest, source location, narration project link, and receipt. Retain input hashes and real operation evidence. Keep rendered, technically verified, owner accepted, and published distinct. Follow the browser skill's cleanup rules; stop recording before revoking a staging connection or closing its page.
