---
title: "Subtractive Typography: When Removal Is the Animation"
category: "research"
abstract: "Exploring scroll-driven text subtraction where the medium embodies the message—corporate fluff strikes through and fades, leaving only the essence: "We remove what obscures.""
keywords: ['Typography', 'Animation', 'Scroll-Driven', 'Subtraction', 'Canon', 'CSS']
publishedAt: "2025-12-11T00:00:00Z"
readingTime: 8
difficulty: "intermediate"
published: true
componentPath: "$lib/experiments/text-revelation.svelte"
---

```
╔═══════════════════════════════════════════════════════════════╗
    ║   SUBTRACTIVE TYPOGRAPHY                                      ║
    ║                                                               ║
    ║   Frame 0:                                                    ║
    ║   ┌─────────────────────────────────────────────────────────┐ ║
    ║   │ We help businesses identify operational inefficiencies  │ ║
    ║   │ and implement AI-powered automation solutions that      │ ║
    ║   │ streamline workflows and remove what obscures.          │ ║
    ║   └─────────────────────────────────────────────────────────┘ ║
    ║                              ↓ scroll                         ║
    ║   Frame 1:                                                    ║
    ║   ┌─────────────────────────────────────────────────────────┐ ║
    ║   │ We h̶e̶l̶p̶ ̶b̶u̶s̶i̶n̶e̶s̶s̶e̶s̶ ̶i̶d̶e̶n̶t̶i̶f̶y̶ ̶o̶p̶e̶r̶a̶t̶i̶o̶n̶a̶l̶ ̶i̶n̶e̶f̶f̶i̶c̶i̶e̶n̶c̶i̶e̶s̶  │ ║
    ║   │ a̶n̶d̶ ̶i̶m̶p̶l̶e̶m̶e̶n̶t̶ ̶A̶I̶-̶p̶o̶w̶e̶r̶e̶d̶ ̶a̶u̶t̶o̶m̶a̶t̶i̶o̶n̶ ̶s̶o̶l̶u̶t̶i̶o̶n̶s̶ ̶t̶h̶a̶t̶      │ ║
    ║   │ s̶t̶r̶e̶a̶m̶l̶i̶n̶e̶ ̶w̶o̶r̶k̶f̶l̶o̶w̶s̶ ̶a̶n̶d̶ remove what obscures.        │ ║
    ║   └─────────────────────────────────────────────────────────┘ ║
    ║                              ↓ scroll                         ║
    ║   Frame 2:                                                    ║
    ║   ┌─────────────────────────────────────────────────────────┐ ║
    ║   │                                                         │ ║
    ║   │              We remove what obscures.                   │ ║
    ║   │                                                         │ ║
    ║   └─────────────────────────────────────────────────────────┘ ║
    ║                                                               ║
    ║   "The medium embodies the message."                          ║
    ╚═══════════════════════════════════════════════════════════════╝
```

## Interactive Demo

<script>
  import TextRevelationDemo from '$lib/experiments/text-revelation.svelte';
</script>

<TextRevelationDemo />


## The Problem

Hero animations typically follow additive patterns: fade in, slide up, scale from zero.
			They announce presence. They demand attention. They say "look at me."

But CREATE SOMETHING's philosophy is subtractive. We remove what obscures.
			How do you animatethat?



## Treatments Explored

We evaluated five approaches before selecting Progressive Erasure:



## Why Progressive Erasure Won

The strikethrough treatment is semantically honest:

The user watches subtraction happen. They see what was removed and why.
			The technique teaches the philosophy it describes.

- Shows the "before"— Corporate fluff in full view
- Makes removal visible— Strikethrough as editorial act
- Reveals the essence— What remains after subtraction



## Implementation

The component uses scroll position to drive four distinct phases:

Each word carries akeepboolean. Essential words remain; others subtract.

The strikethrough is a pseudo-element withwidthdriven by scroll progress.
			No JavaScript animation library needed.

Removed words collapse by transitioningmax-widthto 0.
			This creates smooth horizontal compression without layout jumps.


| Scroll % | Phase | Action |
|---|---|---|
| 0-10% | Reading | Full text visible, user reads the corporate copy |
| 10-35% | Striking | Strikethrough animates across non-essential words |
| 35-50% | Fading | Struck words fade to transparent |
| 50-85% | Coalescing | Kept words collapse inward, gaps close |
| 85-100% | Complete | Final state: "We remove what obscures." + CTA |



## Philosophical Alignment

The animationisthe content. There are no decorative elements, no
			particles, no background effects. Text alone carries the entire experience.

Truth emerges through removal. The essence was always there—hidden by corporate fluff.
			The animation doesn't create meaning; it reveals what was obscured.

The technique demonstrates what it describes:

- DRY— One scroll handler, one state object, one render loop
- Rams— Every word earns its place or gets removed
- Heidegger— The animation serves the hermeneutic whole



## Results

The component is live oncreatesomething.agency.
			Qualitative observations:

The medium became the message. Visitors don't read about subtraction—they experience it.

- Users scroll slowly through the animation, watching the transformation
- The final phrase lands with weight—it's earned through the subtraction
- The CTA ("See how") appears only after the philosophy is demonstrated



## Conclusion

Progressive Erasure proves that animation can embody philosophy.
			By making removal the animation itself, we create an experience that teaches
			through doing rather than telling.

The strikethrough is honest: it shows what was there and what remains.
			The coalescing is satisfying: gaps close, essentials gather.
			The final state is earned: you watched the subtraction happen.

This is subtractive design applied to motion. The techniqueisthe message.

