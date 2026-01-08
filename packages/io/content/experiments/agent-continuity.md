---
slug: "agent-continuity"
category: "Reference Analysis"
title: "Agent Continuity"
subtitle: "Harnesses for Long-Running Sessions"
description: "Analysis of Anthropic's agent harness patterns through a Heideggerian lens—how persistent artifacts enable re-entry into the hermeneutic circle across context boundaries."
meta: "December 2025 · Agent Architecture · Heidegger, Anthropic"
publishedAt: "2025-12-15"
published: true
---

```
╔══════════════════════════════════════════════════════════════════╗
║  AGENT CONTINUITY                                                ║
║                                                                  ║
║  Session 1        Session 2        Session 3        Session N    ║
║  ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐   ║
║  │ Agent  │  ──►  │ Agent  │  ──►  │ Agent  │  ──►  │ Agent  │   ║
║  └───┬────┘       └───┬────┘       └───┬────┘       └───┬────┘   ║
║      │                │                │                │        ║
║      ▼                ▼                ▼                ▼        ║
║  ╔═══════════════════════════════════════════════════════════╗   ║
║  ║  progress.txt  │  features.json  │  git log  │  init.sh   ║   ║
║  ╚═══════════════════════════════════════════════════════════╝   ║
║                                                                  ║
║  "Artifacts enable re-entry into the hermeneutic circle"         ║
╚══════════════════════════════════════════════════════════════════╝
```

## Source


## The Problem


Long-running agents lose context across sessions. Each new context window is"an engineer arriving with no memory of what happened."


When context exhausts, agents experience what Heidegger callsUnzuhandenheit—
				the tool becomes conspicuous, workflow breaks. The hammer that was invisible during hammering
				suddenly demands attention because it has broken.


## Core Patterns


## Failure Modes & Solutions


## Hermeneutic Frame


The harness doesn'tsolvecontinuity—itenables re-entry into the
					hermeneutic circle. Each session is a new interpreter. The artifacts
					(progress files, git history, feature lists) are the shared understanding that
					allows interpretation to continue.

> "Understanding is always already situated. The harness creates the situation."
> — — Heidegger, applied


## Integration with CREATE SOMETHING

- ✓CLAUDE.md as initialization context
- ✓.claude/memory/for domain knowledge
- ✓TodoWrite for task tracking
- ✓Atomic git commits

- ○Explicit session startup sequence (could be a hook)
- ○Structured feature JSON for complex multi-session work
- ○Browser automation prompting for E2E testing


## Through the Subtractive Triad


## Key Insight

