# SCRIPT.md — SEEING COMMERCIAL

## Audio Notes

**Duration**: ~12 seconds of voiceover (commercial is 30s total)
**Voice**: Adam (ElevenLabs) - calm, direct, peer-to-peer
**Style**: Nicely Said. Plain language. Like explaining to a colleague.
**Product**: learn.createsomething.space/seeing

---

## Voiceover Script

[SILENCE 4s]

Same logic in three places. [PAUSE] Now they're different.

[SILENCE 2s]

Three questions. In order.

[SILENCE 8s]

Have I built this before? [PAUSE 2s]
Does this earn its existence? [PAUSE 2s]  
Does this serve the whole?

[SILENCE 4s]

Free. In your terminal. [PAUSE] Start when you're ready.

[END]

---

## Voice Direction (Nicely Said)

- Not: "The codebase drifts" (dramatic)
- Yes: "Now they're different" (plain, specific)
- Not: "Unlock the power of..." (marketing)
- Yes: "Run this command" (direct)

The test: Would you say this to a colleague? If it sounds like ad copy, rewrite it.

---

## Timing Markers (for AudioSync)

| Marker | Frame | Content |
|--------|-------|---------|
| START | 0 | Silence begins |
| VO_1 | 120 | "Same logic in three places..." |
| VO_2 | 180 | "Three questions. In order." |
| VO_3 | 240 | "Have I built this before?" |
| VO_4 | 300 | "Does this earn its existence?" |
| VO_5 | 360 | "Does this serve the whole?" |
| VO_6 | 420 | "Free. In your terminal..." |
| END | 900 | Commercial ends |

---

## ElevenLabs Generation

```bash
# Generate voiceover (when script is final)
pnpm --filter=motion-studio generate-voiceover seeing
```

Output: `audio/seeing/voiceover.mp3`
