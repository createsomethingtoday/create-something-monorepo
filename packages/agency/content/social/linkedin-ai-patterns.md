# LinkedIn Post: AI Agent Patterns

**Campaign:** GTM Sprint 2 - Educational
**Target:** LinkedIn
**Type:** Longform post
**CTA:** createsomething.io/papers

---

## Post

Most teams treat AI coding assistants like autocomplete. Type faster, accept suggestions, clean up hallucinations. The AI does tasks. The human does damage control.

This inverts the relationship.

The AI should do the work. The human should design the system that makes the work possible.

We maintain a CLAUDE.md file in every repository. It contains: project architecture, naming conventions, what not to do, links to critical documentation. The AI reads this before every session. No more "let me re-explain the codebase." The context is already there.

But context isn't enough. Work needs to be bounded.

"Build the authentication system" produces hallucinations. The scope is too large. The AI guesses at requirements, invents patterns, loses coherence halfway through.

"Add JWT token generation to the login endpoint" produces working code. The scope is clear. Success criteria are obvious. The AI can verify its own work.

We decompose every feature into tasks small enough that the AI can hold the entire problem in context. If a task requires referencing code the AI hasn't seen, the task is too big.

The final piece: persistence across sessions.

AI assistants forget everything between conversations. Every session starts from zero. This forces humans to re-explain context—which they do poorly, inconsistently, and incompletely.

We use Beads, an agent-native issue tracker. It records what was attempted, what succeeded, what's blocked. The AI reads this at session start. Work continues where it left off.

The pattern: context (CLAUDE.md) + bounded tasks + persistent memory (Beads).

The AI isn't the bottleneck. The system around it is.

---

## Comment (Post after publishing)

Beads (agent-native task tracking): github.com/anthropics/beads

How we think about AI-human collaboration: createsomething.io/papers/code-mode-hermeneutic-analysis

#AIEngineering #DeveloperProductivity #ClaudeCode

---

## Voice Compliance

- [x] No unverified claims (removed "50+ projects", "90%")
- [x] Methodology explained, not listed as "tips"
- [x] Concrete example (JWT vs auth system)
- [x] Tools mentioned with purpose (CLAUDE.md, Beads)
- [x] No marketing jargon (removed "junior dev who never sleeps")
- [x] Direct, declarative sentences
- [x] Self-contained

---

## Posting Notes

- Best time: Wed Jan 8, 9:00 AM Pacific
- Character count: ~1,700
- Links paper (code-mode-hermeneutic-analysis) for depth
