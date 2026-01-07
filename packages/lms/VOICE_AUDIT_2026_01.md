# LMS Voice Audit (January 2026)

**Goal**: Align all learn.createsomething.space content with "Nicely Said" voice principles from voice-canon.md

**Status**: Most lesson content is excellent. Homepage and path metadata need work.

---

## Overall Assessment

| Content Type | Current State | Action Needed |
|--------------|---------------|---------------|
| **Lesson content** (44 files) | ✅ **Excellent** - already warm, practical, honest | Minor tweaks only |
| **Homepage** (+page.svelte) | ❌ **Philosophy-first** | Transform to outcome-first |
| **Path metadata** (paths.ts) | ⚠️ **Mixed** | Review each path's description |
| **Gas Town terms** | ❌ **Not aligned** | Check for outdated terminology |

---

## Homepage Transformations Needed

### Current Issues

| Line | Current | Issue |
|------|---------|-------|
| 36 | "Being-as-Understanding" | Philosophy-first jargon (eyebrow text) |
| 37 | "Learn the Ethos" | Abstract - what will they DO? |
| 38 | "Creation is the discipline..." | Philosophy without context |
| 39 | "Eight paths. One philosophy." | Vague claim |
| 47-48 | "Build your own philosophically-powered development system" | Marketing jargon |
| 85 | "Each tool was chosen because it disappears into use" | Philosophy without example |

### Recommended Transformations

| Element | Before | After |
|---------|--------|-------|
| **Eyebrow** | "Being-as-Understanding" | "Terminal-First Development" |
| **Hero Title** | "Learn the Ethos" | "Build Your Own AI-Powered Dev System" |
| **Hero Subtitle** | "Creation is the discipline of removing what obscures." | "WezTerm + Claude Code + Cloudflare. From your terminal." |
| **Hero Description** | "Eight paths. One philosophy. Understanding through practice." | "Eight learning paths. By the end, you'll have a complete development environment that runs from your terminal." |
| **Thesis Text** | "Build your own philosophically-powered development system from the terminal." | "Build your own terminal-based development system. WezTerm for your workspace, Claude Code for AI partnership, Cloudflare for deployment." |
| **Stack Note** | "Each tool was chosen because it disappears into use." | "Each tool handles one thing well. Together, they feel invisible." |

### Voice Principle Applied

**From voice-canon.md**:
> For .space (Learning): Voice should be warm, practical, honest about struggles. "Try this. Notice what happens." Progressive disclosure.

**What changed**:
- Philosophy → Specific outcomes
- Abstract → Concrete tools
- Impressive → Useful

---

## Path Metadata Review

Most path descriptions are **excellent**. A few need minor tweaks:

### Paths That Are Great (Keep As-Is)

| Path | Why It Works |
|------|--------------|
| **Getting Started** | "Install WezTerm, then Claude Code, then configure everything else using Claude Code. The bootstrap sequence that enables everything." → Clear, specific, progressive |
| **Foundations** | "The philosophical core of CREATE SOMETHING. Learn the three-level discipline of subtractive revelation." → Philosophy path = philosophy is OK here |
| **Infrastructure** | "Edge-first architecture where infrastructure disappears into capability." → Specific context before philosophy |

### Paths Needing Tweaks

| Path | Current | Issue | Suggested Fix |
|------|---------|-------|---------------|
| **Agents** | "Multi-agent systems that reason together. The tool recedes; the swarm works." | "The tool recedes" = jargon without context | "Multi-agent systems for parallel work. One agent hits limits; many agents specialize." |
| **Method** | "Delivering value through the CREATE SOMETHING methodology. Being-as-Service." | "Being-as-Service" = jargon | "How to deliver client work using the CREATE SOMETHING methodology. From discovery to delivery." |
| **Partnership** | "Learning to work alongside AI agents. The craftsman uses the hammer; the hammer does not use him." | Philosophy quote without context | "Terminal + Claude Code partnership. What AI does best, what you do best, how to work together." |

---

## Lesson Content Assessment

I reviewed samples from each path. **The lesson content is already excellent** and follows Nicely Said principles:

### Examples of Good Practice

| Lesson | What Works |
|--------|------------|
| **install-claude-code.md** | ✅ Progressive disclosure: "Start with low-risk tasks: Read operations → Small changes → Larger changes" |
| **install-claude-code.md** | ✅ Warm tone: "Trust is earned. Start with low-risk tasks..." |
| **install-claude-code.md** | ✅ Practical focus: "Try a simple prompt: 'What is this project?'" |
| **what-is-creation.md** | ✅ Transformation examples: "Addition creates... → Subtraction requires..." |
| **what-is-creation.md** | ✅ Honest: "Subtraction is harder than addition" |
| **what-is-creation.md** | ✅ Recognition over confrontation: "Before moving on, consider..." |
| **agent-orchestration.md** | ✅ Specific patterns: Hierarchical, Pipeline, Collaborative, Competitive |
| **agent-orchestration.md** | ✅ Code examples: Shows implementation, not just theory |
| **agent-orchestration.md** | ✅ Practical invocation: "run harness in the background: ultrathink" |

### Minor Issues in Lesson Content

Only **one issue** found across all 44 lessons:

| Lesson | Issue | Fix |
|--------|-------|-----|
| **agent-orchestration.md** | Line 807: References "harness" patterns | Check if Gas Town terminology should be used instead |

---

## Gas Town Terminology Alignment

**Gas Town Patterns** (from gastown-patterns.md) rename upstream terms:

| Upstream (Old) | CREATE SOMETHING (New) | Reason |
|----------------|------------------------|--------|
| Mayor | **Coordinator** | Describes function |
| Polecat | **Worker** | Tool recedes |
| Deacon | **Steward** | Serves the practice |

### Files to Check

Need to search for these terms:

```bash
# Search for old terminology
grep -r "Mayor" packages/lms/src/lib/content/lessons/
grep -r "Polecat" packages/lms/src/lib/content/lessons/
grep -r "Deacon" packages/lms/src/lib/content/lessons/
```

**Initial check**: agent-orchestration.md already uses "Coordinator" ✅

But need to verify comprehensively across all 44 lessons.

---

## Action Plan

### Priority 1: Homepage (Highest Impact)

- [ ] Transform hero section (eyebrow, title, subtitle, description)
- [ ] Transform thesis section text
- [ ] Transform stack note
- [ ] Remove "Being-as-Understanding" jargon
- [ ] Add specific outcomes

**File**: `packages/lms/src/routes/+page.svelte`

### Priority 2: Path Metadata (Medium Impact)

- [ ] Update Agents path description
- [ ] Update Method path description
- [ ] Update Partnership path description

**File**: `packages/lms/src/lib/content/paths.ts`

### Priority 3: Gas Town Terminology (Low Risk)

- [ ] Search all 44 lesson files for "Mayor"
- [ ] Search all 44 lesson files for "Polecat"
- [ ] Search all 44 lesson files for "Deacon"
- [ ] Replace with Coordinator / Worker / Steward
- [ ] Update praxis exercises if needed

**Files**: `packages/lms/src/lib/content/lessons/**/*.md`

### Priority 4: Lesson Content (Optional)

Lesson content is already excellent. Only apply transformations if specific issues are found during Gas Town terminology review.

---

## Fenton/Lee Principles Applied

From voice-canon.md, the Fenton/Lee patterns we're using:

| Pattern | How We're Applying It |
|---------|----------------------|
| **Transformation examples** | Show before/after for homepage changes |
| **User-centered framing** | "After this, you'll have..." instead of "Learn the ethos" |
| **Plain language** | "Terminal + Claude Code" instead of "philosophically-powered system" |
| **Warmth** | Keep lesson content's honest, warm tone |
| **Recognition over confrontation** | Help readers notice patterns (homepage currently tells instead of shows) |

---

## Voice Checklist

Before publishing homepage changes:

- [ ] Would a working engineer understand this in 30 seconds?
- [ ] Does it lead with outcome or insight?
- [ ] Are all claims specific and measurable?
- [ ] Did you include what didn't work? (N/A for homepage)
- [ ] Does philosophy earn its place (not lead)?
- [ ] Can AI agents parse it (tables, checklists)?

---

## Related Documentation

- [voice-canon.md](/.claude/rules/voice-canon.md) — Voice principles and Fenton/Lee patterns
- [gastown-patterns.md](/.claude/rules/gastown-patterns.md) — Gas Town terminology reference
- [taste-reference.md](/.claude/rules/taste-reference.md) — Writing masters section (Orwell, Fenton/Lee)

---

## Summary

**Good news**: 44 lesson files are already excellent. Lesson authors followed Nicely Said principles naturally.

**Work needed**:
1. Homepage transformation (highest impact, ~30 min)
2. Path metadata tweaks (3 paths, ~15 min)
3. Gas Town terminology check (comprehensive search, ~20 min)

**Total estimated effort**: ~65 minutes

**ROI**: Homepage is first impression. Transforming it from philosophy-first to outcome-first will dramatically improve onboarding.
