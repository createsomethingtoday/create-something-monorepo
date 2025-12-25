# SCRIPT.md — CLAUDE CODE: PARTNER

## Recording Notes

**Duration**: ~25 minutes
**Pace**: Conversational but focused. Partnership means dialogue, not lecture.
**Tone**: Collaborative. Show the relationship between human and AI.

---

## Narration Markup Reference

| Markup | Meaning | Example |
|--------|---------|---------"|
| `[PAUSE]` | Brief pause (1 second) | "Less, but better. [PAUSE] That's it." |
| `[PAUSE 2s]` | Explicit duration pause | "The tool should disappear. [PAUSE 2s]" |
| `[BEAT]` | Dramatic beat (1.5 seconds) | "Not addition. [BEAT] Subtraction." |
| `[BREATHE]` | Take a breath, gather | "[BREATHE] Now let me explain..." |
| `[SLOW]...[/SLOW]` | Slower, deliberate pacing | "[SLOW]Weniger, aber besser.[/SLOW]" |
| `[QUOTE]...[/QUOTE]` | Read as quotation (different register) | "[QUOTE]The hammer disappears into use.[/QUOTE]" |
| `*emphasis*` | Vocal stress on word | "This is *one* principle at *three* scales." |
| `{stage direction}` | Visual/action note | "{slide transition}" |
| `↗` | Rising intonation (question) | "Have I built this before↗" |
| `↘` | Falling intonation (statement) | "Unify↘" |
| `—` | Em-dash = brief pause + emphasis | "Not addition—subtraction." |

---

## Slide 1: Title [0:00]

{slide appears}

[BREATHE]

Claude Code: Partner.

[PAUSE]

This isn't about using AI tools. [BEAT] It's about establishing a *partnership*.

AI-native development. Not AI-assisted. The distinction matters.

[PAUSE 2s]

By the end, you'll have Claude Code configured as a true development partner—one that understands your philosophy, follows your patterns, and recedes into transparent use.

{hold 2 seconds on title}

---

## Slide 2: The Partnership Model [1:30]

{slide transition}

[BREATHE]

Not *using* AI—*partnering* with AI.

[PAUSE]

Here's the division of labor:

You bring intent. [PAUSE] Judgment. [PAUSE] Domain knowledge.

Claude brings execution. [PAUSE] Pattern recognition. [PAUSE] Tirelessness.

[BEAT]

Together↗ [PAUSE] Systems that neither could build alone.

[PAUSE 2s]

The goal isn't to replace you. It's to *amplify* you.

[PAUSE]

You're still the architect. Claude is the tireless craftsman who never forgets your blueprints.

---

## Slide 3: Quote - Eames [3:00]

{slide transition}

[BREATHE]

Charles and Ray Eames defined the goal:

[QUOTE]
[SLOW]"The best for the most for the least."[/SLOW]
[/QUOTE]

[PAUSE 2s]

AI partnership embodies this. [PAUSE] The best development outcomes. [PAUSE] For the most use cases. [PAUSE] With the least friction.

[PAUSE]

The Eameses optimized physical production. We optimize cognitive production.

---

## Slide 4: What Claude Code Has Access To [4:15]

{slide transition - ASCII table appears}

[BREATHE]

This is what Claude Code sees before every session.

[PAUSE]

CLAUDE.md. [PAUSE] Your project philosophy, conventions, and patterns.

Rules directory. [PAUSE] Domain-specific constraints—Cloudflare patterns, CSS canon, Beads workflows.

MCP servers. [PAUSE] Direct API access to infrastructure. No shell commands—real API calls.

Hooks. [PAUSE] Automatic validation at key moments.

Skills. [PAUSE] Reusable workflows invoked by name.

[PAUSE 2s]

Claude doesn't just execute. [BEAT] It *understands* the philosophy.

[PAUSE]

Context is everything. Philosophy shapes execution.

---

## Slide 5: CLAUDE.md [6:00]

{slide transition}

CLAUDE.md is the contract.

[PAUSE]

Philosophy baked into context.

[BREATHE]

The Subtractive Triad—DRY, Rams, Heidegger—lives here. [PAUSE] Claude applies it automatically.

The Hermeneutic Circle—how .ltd, .io, .space, and .agency interconnect—is documented here.

Code mode preferences—when Claude uses tools versus code—defined here.

Domain commands and conventions—all here.

[PAUSE 2s]

Claude reads this before *every* session. [PAUSE] It becomes the shared language.

[PAUSE]

You write it once. Claude applies it always.

---

## Slide 6: CLAUDE.md Structure [7:30]

{slide transition - code appears}

Here's the actual structure.

[BREATHE]

At the top: Philosophy. The Subtractive Triad table. Level, Discipline, Question, Action.

Below that: Architecture. The package structure. Space for practice, IO for research, Agency for services, LTD for philosophy.

[PAUSE]

This isn't documentation for humans. [PAUSE] It's *configuration* for Claude.

[PAUSE 2s]

When you update CLAUDE.md, you update Claude's understanding. The partnership evolves.

---

## Slide 7: .claude/rules/ [9:00]

{slide transition}

[BREATHE]

Breakdowns become patterns.

[PAUSE]

The rules directory captures everything that's gone wrong—and how to prevent it.

`cloudflare-patterns.md`—D1 queries, KV operations, Workers deployment. Every edge case documented.

`css-canon.md`—Tailwind for structure, Canon for aesthetics. The exact token mappings.

`beads-patterns.md`—Task tracking across sessions. The commands that work.

`sveltekit-conventions.md`—Route patterns, component patterns, load function patterns.

[PAUSE 2s]

Every breakdown you repair becomes a rule Claude follows.

[PAUSE]

This is how the partnership *learns*. Not through training—through documentation.

---

## Slide 8: Rules Example [10:30]

{slide transition - code appears}

Here's css-canon.md in action.

[BREATHE]

The principle at the top: Tailwind for structure, Canon for aesthetics.

[PAUSE]

Layout utilities—keep them. Flex, grid, padding, margin.

Design utilities—avoid them. Use Canon tokens instead.

[PAUSE]

The table shows the mapping. `rounded-md` becomes `var(--radius-md)`. `bg-white/10` becomes `var(--color-bg-surface)`.

[PAUSE 2s]

Claude applies these rules *automatically*.

[PAUSE]

You don't remind Claude about design tokens. The rule file does that for you.

---

## Slide 9: MCP Servers [12:00]

{slide transition - ASCII table appears}

[BREATHE]

MCP servers give Claude direct infrastructure access.

[PAUSE]

Cloudflare. [PAUSE] D1 queries, KV operations, R2 storage, Workers deployment, Pages deployment. Direct API calls.

Beads. [PAUSE] Create issues, mark ready, close, sync. Task tracking across sessions.

Filesystem. [PAUSE] Read, Write, Edit, Glob, Grep. The standard file operations.

Browser. [PAUSE] WebFetch, WebSearch. Web access when needed.

[PAUSE 2s]

Claude doesn't shell out. [PAUSE] It calls APIs *directly*.

[PAUSE]

This is Zuhandenheit applied to infrastructure. The APIs recede. The work remains.

---

## Slide 10: Hooks [13:30]

{slide transition}

Hooks provide automatic validation.

[BREATHE]

Pre-commit. [PAUSE] Type checking, linting, tests. Before anything commits, validation runs.

Post-edit. [PAUSE] Format, validate, sync. After changes, cleanup happens automatically.

Session start. [PAUSE] Prime context, check Beads. Before work begins, state is recovered.

[PAUSE 2s]

Hooks run *automatically*. [PAUSE] You don't think about them.

[PAUSE]

That's the point. The validation disappears. Only the confidence remains.

---

## Slide 11: Hooks Example [15:00]

{slide transition - code appears}

Here's the configuration.

[BREATHE]

Settings.json in the .claude directory.

PreToolUse hooks. [PAUSE] When Claude uses Write or Edit tools, TypeScript checking runs first.

PostToolUse hooks. [PAUSE] After Write or Edit, Beads syncs automatically.

[PAUSE 2s]

The pattern: matcher identifies which tools trigger. Hooks define what runs.

[PAUSE]

Validation happens automatically. [PAUSE] The tool recedes.

---

## Slide 12: Skills [16:30]

{slide transition}

Skills are reusable workflows.

[BREATHE]

Slash-audit-canon. [PAUSE] Check CSS for Canon compliance. One command, comprehensive audit.

Slash-deploy. [PAUSE] Generate deployment commands. Package to production, one skill.

Slash-harness-spec. [PAUSE] Create harness specifications. Autonomous work, structured input.

Slash-audit-voice. [PAUSE] Check content for Voice compliance. Consistency across properties.

[PAUSE 2s]

Complex workflows become simple commands.

[PAUSE]

You invoke the skill. The workflow executes. The complexity is hidden.

---

## Slide 13: The Development Loop [18:00]

{slide transition - ASCII diagram appears}

[BREATHE]

This is how work actually flows.

[PAUSE]

Start with Read. [PAUSE] Context comes first. CLAUDE.md, rules, current state.

Then Plan. [PAUSE] Understand the approach before execution.

Then Execute. [PAUSE] Write the code, make the changes.

Then Verify. [PAUSE] Tests pass, types check, deployment succeeds.

[BEAT]

When breakdowns occur—and they will—loop back to Repair.

[PAUSE 2s]

Repair isn't just fixing. It's updating the rules. [PAUSE] Patterns feed future reads.

[PAUSE]

The circle closes. Understanding deepens.

---

## Slide 14: Zuhandenheit in Practice [20:00]

{slide transition}

[BREATHE]

When Claude Code works, it *disappears*.

[PAUSE]

You think about the *feature*, not the prompts.

You think about the *architecture*, not the syntax.

You think about the *user*, not the deployment.

[PAUSE 2s]

The partner recedes. [BEAT] The work remains.

[PAUSE]

This is Zuhandenheit applied to AI partnership. The tool is ready-to-hand. It serves without demanding attention.

[PAUSE]

When you notice Claude, something has broken. When Claude is invisible, the partnership is working.

---

## Slide 15: Installation [22:00]

{slide transition - code appears}

[BREATHE]

Here's how to begin.

[PAUSE]

Clone the monorepo. [PAUSE] Git clone, the standard way.

Install dependencies. [PAUSE] PNPM install handles everything.

Generate Cloudflare types. [PAUSE] Wrangler types creates the bindings.

Start development. [PAUSE] PNPM dev, filter to your package.

[PAUSE 2s]

Claude Code reads CLAUDE.md automatically.

Rules apply.

MCP servers connect.

Hooks run.

[BEAT]

The partnership begins.

[PAUSE]

Install once. Partner indefinitely.

---

## Slide 16: Final [24:00]

{slide transition}

[BREATHE]

[PAUSE 2s]

[SLOW]The partner should disappear.[/SLOW]

[PAUSE 2s]

When Claude Code is invisible, the partnership is complete.

[PAUSE]

You focus on the work. Claude handles the execution. The boundary dissolves.

[BEAT]

That's AI-native development.

[PAUSE]

Not using AI. Partnering with AI.

[PAUSE 2s]

The tool recedes.

The work remains.

{hold on final slide}

[END]

---

## Post-Production Notes

### Audio Cleanup
- Remove mouth clicks
- Normalize audio levels
- Add subtle room tone between sections

### Visual Sync
- Ensure slide transitions align with `{slide transition}` markers
- Add fade transitions (300ms) at section breaks
- Consider subtle zoom on ASCII diagrams

### Accessibility
- Generate captions from script
- Ensure captions include pause markers as `[...]`
- Verify contrast on all slides

---

## Narration Checklist

Before recording:

- [ ] Room is quiet (no HVAC, no fans)
- [ ] Microphone positioned correctly
- [ ] Water available (avoid mouth sounds)
- [ ] Script printed or on teleprompter
- [ ] Practiced full read-through once

During recording:

- [ ] Maintain consistent distance from microphone
- [ ] Pause fully at `[PAUSE]` markers
- [ ] Slow down at `[SLOW]` sections
- [ ] Breathe at `[BREATHE]` markers
- [ ] Emphasize `*words*` with vocal stress

After recording:

- [ ] Review for clarity and pacing
- [ ] Check for mouth sounds or clicks
- [ ] Verify all 16 slides covered
- [ ] Run /audit-voice on transcript
