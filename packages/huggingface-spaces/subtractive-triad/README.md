---
title: Subtractive Triad Reviewer
emoji: ✂️
colorFrom: gray
colorTo: black
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: mit
short_description: Code analysis through disciplined removal
---

# Subtractive Triad Reviewer

**Truth emerges through disciplined removal at every level of abstraction.**

Analyze your Python code through the lens of the Subtractive Triad:

## The Three Levels

| Level | Discipline | Question | Action |
|-------|------------|----------|--------|
| **DRY** | Implementation | "Have I built this before?" | Unify |
| **Rams** | Artifact | "Does this earn its existence?" | Remove |
| **Heidegger** | System | "Does this serve the whole?" | Reconnect |

## What It Detects

### DRY (Implementation)
- Duplicate code blocks
- Repeated string literals
- Similar function patterns

### Rams (Artifact)
- Unused imports
- Empty/stub functions
- Dead code
- Excessive complexity

### Heidegger (System)
- Missing documentation
- Inconsistent naming
- Low cohesion
- Disconnected parts

## The Philosophy

The Subtractive Triad is one principle — **subtractive revelation** — applied at three scales:

1. **DRY** at the implementation level: Don't repeat yourself
2. **Weniger, aber besser** at the artifact level: Less, but better (Dieter Rams)
3. **Hermeneutic circle** at the system level: Parts must serve the whole (Heidegger)

## Scoring

- **DRY**: 30% weight
- **Rams**: 30% weight
- **Heidegger**: 40% weight (system coherence matters most)

## Built By

[CREATE SOMETHING](https://createsomething.ltd) — Creation is the discipline of removing what obscures.

- [.space](https://createsomething.space) — Practice
- [.io](https://createsomething.io) — Research
- [.agency](https://createsomething.agency) — Services
- [.ltd](https://createsomething.ltd) — Philosophy
