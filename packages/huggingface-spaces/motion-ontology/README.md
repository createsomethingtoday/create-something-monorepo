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

## Explicit system browser (qualification candidate)

Use Node 22.12 or newer (qualification pins 22.21.1) and install Chromium or
Chrome separately. Set `PUPPETEER_EXECUTABLE_PATH` to its absolute executable
path. The service validates the file before launching it and never falls back
to installing a browser. `puppeteer-core` ignores Puppeteer's configuration
files; this application passes the validated path explicitly.

The Dockerfile supplies Debian Chromium at `/usr/bin/chromium`. Use
`npm ci --ignore-scripts` for installation; browser package lifecycle hooks are
absent and other dependency lifecycles remain disabled. The core dependency
still contains browser download/extraction APIs through `@puppeteer/browsers`;
this change does not remove that capability from disk. Application launch does
not call those APIs. Do not add a downloader fallback for missing browsers.

Run `npm run build`, `npm test`, `node test/check-dependency-policy.mjs`, then
`npm run test:browser` with the explicit path configured. Browser tests use
synthetic data URLs, disposable profiles and prohibit remote Node HTTP/fetch.
The container qualification additionally disables container networking.
System browser versions need qualification when updated; arbitrary installed
Chromium versions are not guaranteed compatible.
