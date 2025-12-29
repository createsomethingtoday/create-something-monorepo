# LinkedIn Thread: AI Agent Patterns

**Campaign:** GTM Sprint 2 - Tutorial/Educational
**Target:** LinkedIn
**Type:** 7-post thread
**CTA:** createsomething.io/papers

---

## Thread

### Post 1 (Hook)

Your AI coding assistant is only as good as your system around it.

We've built 50+ projects with Claude Code this year. Here's what actually works:

---

### Post 2 (The Problem)

Most teams use AI assistants like autocomplete on steroids.

They get:
- Faster typing
- Occasional helpful suggestions
- A lot of hallucinations to clean up

This is using a power tool as a hammer.

---

### Post 3 (Pattern 1: Context Files)

Pattern 1: Give your AI a brain.

Create a CLAUDE.md (or similar) in your repo root:
- Project architecture overview
- Key conventions and patterns
- What NOT to do
- Links to critical documentation

The AI reads this first. Every session starts informed.

---

### Post 4 (Pattern 2: Task Decomposition)

Pattern 2: Break work into bounded tasks.

Bad: "Build the authentication system"

Good:
- "Create the User model with email/password fields"
- "Add JWT token generation to login endpoint"
- "Write middleware to validate tokens on protected routes"

Small tasks = fewer hallucinations = better code.

---

### Post 5 (Pattern 3: Verification Gates)

Pattern 3: Trust but verify.

After every significant change:
1. Run the tests
2. Check the types
3. Review the diff

Make the AI fix what it broke before moving on.

90% of AI mistakes are caught by automated checks. Use them.

---

### Post 6 (Pattern 4: Session Continuity)

Pattern 4: Preserve context across sessions.

Use task tracking that persists:
- What was attempted
- What succeeded
- What's blocked

We use Beads (agent-native issue tracking). The AI picks up where it left off.

No more "let me re-explain the entire project."

---

### Post 7 (CTA)

The AI isn't the bottleneck. Your system around it is.

These patterns turned our AI from "helpful autocomplete" to "junior developer who never sleeps."

Deep dive on agent orchestration: createsomething.io/papers

---

## Formatting Notes

**LinkedIn-specific formatting:**

1. **Line breaks** - Generous for mobile
2. **Pattern numbers** - Clear structure (Pattern 1, 2, 3, 4)
3. **Bad/Good contrast** - Concrete examples
4. **No emoji** - Per voice guidelines
5. **Hashtags** - Final post only

**Suggested hashtags (add to Post 7):**
- #AIEngineering
- #DeveloperProductivity
- #ClaudeAI

---

## Voice Compliance Checklist

- [x] Claims backed by experience (50+ projects)
- [x] Specific patterns, not vague advice
- [x] Concrete examples (auth system decomposition)
- [x] Tool mentioned (Beads) with context
- [x] No marketing jargon
- [x] Direct, actionable sentences
- [x] Solves real problem (AI assistant effectiveness)

---

## Source References

- Agent orchestration research: createsomething.io/papers
- Beads task tracking: github.com/steveyegge/beads
- Claude Code patterns: createsomething.io/papers/code-mode-hermeneutic-analysis

---

## Posting Instructions

1. Schedule as drip: one post per day on Tue/Thu
2. Start date: February (after Triad thread)
3. Best times: 9:00 AM Pacific
4. Engage with comments in first 30 minutes
5. Link CTA goes in comment of final post

---

## Schedule (Tentative - After Triad Thread)

| Post | Date | Time |
|------|------|------|
| 1/7 | Tue, Feb 4 | 9:00 AM PST |
| 2/7 | Thu, Feb 6 | 9:00 AM PST |
| 3/7 | Tue, Feb 11 | 9:00 AM PST |
| 4/7 | Thu, Feb 13 | 9:00 AM PST |
| 5/7 | Tue, Feb 18 | 9:00 AM PST |
| 6/7 | Thu, Feb 20 | 9:00 AM PST |
| 7/7 | Tue, Feb 25 | 9:00 AM PST |
