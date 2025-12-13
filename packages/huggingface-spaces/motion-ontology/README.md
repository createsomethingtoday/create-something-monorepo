---
title: Motion Ontology Analyzer
emoji: ⚡
colorFrom: gray
colorTo: indigo
sdk: docker
pinned: false
license: mit
short_description: Phenomenological analysis of UI motion
---

# Motion Ontology Analyzer

**Analyze UI motion through Heidegger's phenomenological framework.**

Does your animation recede into use, or obstruct the user's intention?

## Core Concepts

| Concept | Meaning | Motion Implication |
|---------|---------|-------------------|
| **Zuhandenheit** | Ready-to-hand | Motion recedes — user focuses on goal |
| **Vorhandenheit** | Present-at-hand | Motion obstructs — user notices the interface |
| **Aletheia** | Unconcealment | Motion reveals — discloses relationships or state |

## How It Works

1. **Enter a URL** — any website with CSS animations or transitions
2. **Choose a trigger** — load, hover, click, or scroll
3. **Get analysis** — phenomenological interpretation + technical extraction

### What It Extracts

- CSS animations via `document.getAnimations()`
- CSS transitions from computed styles
- Duration, easing, keyframes, animated properties
- Screenshot during animation execution

### What It Interprets

- **Disclosure type**: What does the motion reveal?
- **Ontological mode**: Zuhandenheit or Vorhandenheit?
- **Judgment**: Functional, decorative, or ambiguous?
- **Recommendation**: Keep, modify, or remove?

## The Philosophy

From CREATE SOMETHING's Subtractive Triad:

> Every animation must justify its existence. If it cannot justify, it must be removed.

Motion should serve **disclosure** — revealing relationships, confirming actions, showing state changes. Motion that merely decorates violates both Dieter Rams ("Less, but better") and Heidegger (tools should recede into use).

## Claude Integration

When `ANTHROPIC_API_KEY` is set, Claude provides rich phenomenological interpretation grounded in Heidegger's framework. Without the key, heuristic analysis based on duration, easing, and property associations is used.

## Built By

[CREATE SOMETHING](https://createsomething.ltd) — Creation is the discipline of removing what obscures.

- [.space](https://createsomething.space) — Practice
- [.io](https://createsomething.io) — Research
- [.agency](https://createsomething.agency) — Services
- [.ltd](https://createsomething.ltd) — Philosophy
