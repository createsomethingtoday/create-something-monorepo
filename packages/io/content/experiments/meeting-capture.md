---
slug: "meeting-capture"
category: "Experiment"
title: "Meeting Capture"
subtitle: "Tools Recede, Understanding Remains"
description: "Building a personal meeting transcription tool that embodies Heideggerian Zuhandenheit—the tool disappears into use while understanding emerges."
meta: "December 2025 · Swift + Cloudflare Workers · Heidegger, Rams"
publishedAt: "2025-12-15"
published: true
---

```
╔══════════════════════════════════════════════════════════════════╗
║  MEETING CAPTURE                                                 ║
║                                                                  ║
║  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐  ║
║  │  ((o))   │     │    ~     │     │   ___    │     │   [D1]  │  ║
║  │  AUDIO   │ ──► │ WHISPER  │ ──► │  TEXT    │ ──► │  STORE  │  ║
║  └──────────┘     └──────────┘     └──────────┘     └─────────┘  ║
║                                                                  ║
║     Swift          Workers AI        Transcript       Database   ║
║    (local)        (Cloudflare)                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

## Hypothesis


A meeting transcription tool withfewerfeatures will achieve higher actual
				utility than feature-rich alternatives—because tools that recede into transparent use
				(Zuhandenheit) serve understanding better than tools that demand attention.


## Success Criteria


## Measured Results


## Grounding: Heidegger on Tools


InBeing and Time(1927), Heidegger distinguishes two modes of encountering equipment:

> "The less we just stare at the hammer-thing, and the more we seize hold of it and use
						it, the more primordial does our relationship to it become."
> — — Heidegger, Being and Time §15


Feature-rich tools like Granola and Otter shift equipment from Zuhanden to Vorhanden
					through accumulated complexity: speaker identification, action item extraction, calendar
					sync, team sharing. Each individually justified; collectively attention-demanding.


## Method: Subtractive Triad


Following Rams's tenth principle ("As little design as possible") and the Subtractive
					Triad, we asked three questions for each potential feature:

- Real-time transcription— Complexity without benefit; post-meeting suffices
- Speaker identification— Adds 3x complexity; rarely needed for personal use
- Action item extraction— AI hallucination risk exceeds value
- Calendar integration— Meeting detection handles this
- Team sharing— Personal tool; single user
- Web dashboard—curlsuffices for queries

- Auto-detect meetings— Zoom, Google Meet, Teams via NSWorkspace + AppleScript
- Record microphone— AVFoundation; system audio requires kernel extension
- Upload on stop— Multipart form to Cloudflare Worker
- Transcribe via Whisper— @cf/openai/whisper-large-v3-turbo
- Store in D1— Searchable via SQL


## Implementation


## Limitations & Failures


## Reproducibility

- macOS 14+ (Sonoma) with Xcode 15+
- Cloudflare account with Workers AI access
- Microphone permission granted to app
- Automation permission for System Events

- Code signing: Without ad-hoc signing, AppleScript will fail silently
- Whisper input format: Use Base64, not ArrayBuffer for turbo model
- D1 FTS5: Full-text search virtual tables may cause database corruption


```
{`Build a macOS menubar app that:
1. Detects when Zoom/Meet/Teams starts a call
2. Records microphone audio
3. Uploads to a Cloudflare Worker on stop
4. Transcribes via Whisper and stores in D1

Use: Swift/SwiftUI, AVFoundation, NSWorkspace
Constraints: No UI during recording, <500 LOC total`}
```


## Conclusion


The hypothesis ispartially validated. A minimal transcription tool
					achieves Zuhandenheit for its core function—zero attention during meetings, automatic
					transcription after. The tool recedes.


However, the manual stop requirement and microphone-only capture represent failures
					to fully disappear. A tool that demands even one interaction per meeting has not
					completely achieved ready-to-hand status.

> "Weniger, aber besser."
> — — Dieter Rams


Less, but better. The discipline of removal produced a functional tool in ~600 LOC
					across two components. Whether "better" depends on use case: for personal meeting
					notes, this suffices. For team collaboration, the removed features become necessary.

