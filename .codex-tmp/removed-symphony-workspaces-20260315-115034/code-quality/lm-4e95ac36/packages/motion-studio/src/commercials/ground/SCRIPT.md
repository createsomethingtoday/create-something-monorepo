# SCRIPT.md — GROUND COMMERCIAL

## Audio Notes

**Duration**: ~20 seconds of voiceover (commercial is 30s total)
**Voice**: You, first person, calm
**Style**: Nicely Said. Like explaining to a colleague what you built and why.
**Product**: Ground MCP - github.com/createsomethingtoday/ground

---

## Voiceover Script

[Terminal typing begins]

I was building with agents.

[PAUSE — command finishes, error appears]

They'd say "95% similar" without comparing the files.

[PAUSE — new command starts]

So I made a rule: you can't claim something until you've checked it.

[PAUSE — parsing happens: 847 nodes, 891 nodes, computing...]

Now it parses the code. Computes real similarity.

[PAUSE — claim succeeds]

Then you can make claims.

[PAUSE — install command]

[END]

---

## Voice Direction (Nicely Said)

You're explaining what you built to a friend who codes.

- Not: "AI agents hallucinate at alarming rates" (dramatic)
- Yes: "They'd say 95% similar without comparing the files" (plain)
- Not: "Ground revolutionizes agentic reliability" (marketing)
- Yes: "So I made a rule" (direct)

The test: Would you say this at a coffee shop? If it sounds like a pitch deck, rewrite it.

---

## Full Transcript (for recording)

```
I was building with agents.

They'd say "95% similar" without comparing the files.

So I made a rule: you can't claim something until you've checked it.

Now it parses the code. Computes real similarity.

Then you can make claims.
```

---

## Scene Breakdown (30s @ 30fps = 900 frames)

| Scene | Frames | Time | Visual | Audio |
|-------|--------|------|--------|-------|
| Failed Claim | 0-270 | 0-9s | Agent types claim → error | "I was building with agents. They'd say 95% similar..." |
| Comparison | 270-540 | 9-18s | Parsing... 847 nodes... | "So I made a rule... Now it parses the code..." |
| Success | 540-720 | 18-24s | Claim recorded | "Then you can make claims." |
| CTA | 720-840 | 24-28s | npm install | Silence |
| Close | 840-900 | 28-30s | GROUND logo | Silence |

---

## Terminal Flow

```
$ ground claim duplicate utils.ts helpers.ts "95% similar"

✗ Claim blocked

  You need to compare these files first:
  ground compare utils.ts helpers.ts
```

```
$ ground compare utils.ts helpers.ts

Parsing AST...
  utils.ts: 847 nodes
  helpers.ts: 891 nodes

Computing similarity...

  Similarity: 94.2%
  Shared functions: validateInput, sanitizeString, formatOutput

✓ Comparison stored.
```

```
$ ground claim duplicate utils.ts helpers.ts "same validation"

✓ Claim recorded

  utils.ts ↔ helpers.ts
  94.2% similar
```

```
$ npm install -g @createsomething/ground-mcp
```

---

## Timing Markers (for AudioSync)

| Marker | Frame | Content |
|--------|-------|---------|
| VO_1 | 45 | "I was building with agents." |
| VO_2 | 120 | "They'd say 95% similar without comparing the files." |
| VO_3 | 300 | "So I made a rule: you can't claim something until you've checked it." |
| VO_4 | 420 | "Now it parses the code. Computes real similarity." |
| VO_5 | 570 | "Then you can make claims." |
| END | 900 | Commercial ends |

---

## Key Message

You built this because you needed it. Agents were confident but wrong. Now they have to do the work first.
