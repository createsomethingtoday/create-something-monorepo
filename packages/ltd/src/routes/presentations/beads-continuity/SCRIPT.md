# SCRIPT.md — BEADS: CONTINUITY

## Recording Notes

**Duration**: ~20 minutes
**Pace**: Practical and grounded. This is about workflow, not philosophy.
**Tone**: Instructive but not pedantic. You're sharing how you work.

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

Beads: Continuity.

[PAUSE]

Agent-native task tracking. [PAUSE] Memory that persists.

[PAUSE 2s]

By the end of this presentation, you'll understand how to maintain context across sessions—so every time you start work, you know exactly where you left off and what matters most.

{hold 2 seconds on title}

---

## Slide 2: The Problem [1:30]

{slide transition}

[BREATHE]

Every session, context *resets*.

[PAUSE]

What was I working on↗ [PAUSE] What's blocked by what↗ [PAUSE] What did I discover yesterday↗

[BEAT]

Humans remember. [PAUSE] Agents forget.

[PAUSE 2s]

This is the fundamental challenge of AI-native development. The context window is finite. When it ends, memory ends.

[PAUSE]

Beads solves this.

---

## Slide 3: Quote - Heidegger [3:00]

{slide transition}

[BREATHE]

Heidegger described the hermeneutic circle:

[QUOTE]
"Understanding is always already moving in a circle."
[/QUOTE]

[PAUSE 2s]

To understand the whole, you need the parts. To understand the parts, you need the whole.

[PAUSE]

Memory bridges the gap between sessions. [PAUSE] Each session builds on the last. Understanding deepens.

---

## Slide 4: Beads Architecture [4:15]

{slide transition - ASCII diagram appears}

[BREATHE]

Here's the architecture.

[PAUSE]

Beads uses dual storage. [PAUSE] SQLite for speed. JSONL for sync.

[PAUSE]

The SQLite database—beads.db—is your local cache. [PAUSE] It's gitignored. Fast queries, local speed.

[PAUSE]

The JSONL file—issues.jsonl—is the source of truth. [PAUSE] It's git-synced. This is how memory persists across machines.

[PAUSE 2s]

SQLite for speed. JSONL for sync. Git for memory.

[PAUSE]

The two work together. Write locally, sync globally.

---

## Slide 5: bd create [6:00]

{slide transition - code appears}

Let's walk through the core commands.

[BREATHE]

First: `bd create`.

[PAUSE]

When you discover work, capture it immediately. Don't wait.

[PAUSE]

`bd create "Implement user dashboard"` [PAUSE]

With priority: `bd create "Fix login bug" --priority P0` [PAUSE]

With labels: `bd create "Add dark mode" --label feature --label space`

[PAUSE 2s]

Capture work as it emerges. [PAUSE] Don't lose discovered tasks.

[PAUSE]

If you think of it and don't write it down, it's gone next session.

---

## Slide 6: bd ready [7:30]

{slide transition - code appears}

Second: `bd ready`.

[BREATHE]

This answers the question: What *can* you start right now↗

[PAUSE]

`bd ready` shows unblocked work. [PAUSE] No pending dependencies. Status is open or in progress. Ranked by priority.

[PAUSE]

For AI agents, use: `bv --robot-priority`

[PAUSE 2s]

Don't ask "what should I do↗" [BEAT] Ask Beads.

[PAUSE]

Start every session here. Let the system tell you what matters most.

---

## Slide 7: bd close [9:00]

{slide transition - code appears}

Third: `bd close`.

[BREATHE]

When work is done, close it.

[PAUSE]

`bd close cs-abc` [PAUSE]

With reason: `bd close cs-abc --reason "Commit abc123"` [PAUSE]

Multiple at once: `bd close cs-abc cs-def cs-ghi`

[PAUSE 2s]

Work without closure is work forgotten.

[PAUSE]

If you don't close it, the next session won't know it's done.

---

## Slide 8: bd sync [10:15]

{slide transition - code appears}

Fourth: `bd sync`.

[BREATHE]

This is how memory persists.

[PAUSE]

`bd sync` pushes your local changes to Git. [PAUSE]

`bd sync --from-main` pulls updates from the main branch. [PAUSE]

`bd sync --status` checks whether you need to sync.

[PAUSE 2s]

Sync before session ends. [PAUSE] Memory persists through Git.

[PAUSE]

Forget to sync, forget your progress.

---

## Slide 9: Session Workflow [11:30]

{slide transition - ASCII diagram appears}

[BREATHE]

Here's the complete workflow.

[PAUSE]

Three phases.

[PAUSE]

Session start: [PAUSE] `bv --robot-priority` to see what's highest impact. `bd show` to review the issue. `bd update --status in_progress` to claim it.

[PAUSE]

During work: [PAUSE] `bd create` for discovered tasks. `bd dep add` for dependencies.

[PAUSE]

Session end: [PAUSE] `bd close` to mark complete. `bd sync` to persist. `git commit` for your code.

[PAUSE 2s]

Start with context. End with closure.

---

## Slide 10: Dependencies [13:00]

{slide transition - code appears}

[BREATHE]

Dependencies are relationships.

[PAUSE]

`bd dep add cs-auth blocks cs-dashboard` [PAUSE] means the dashboard cannot start until auth completes.

[PAUSE]

`bd dep add cs-subtask parent cs-epic` [PAUSE] creates hierarchy.

[PAUSE]

`bd dep add cs-login related cs-auth` [PAUSE] creates informational links.

[PAUSE]

`bd dep add cs-bugfix discovered-from cs-feature` [PAUSE] tracks audit trails.

[PAUSE 2s]

Dependencies are relationships. [BEAT] Relationships are memory.

[PAUSE]

When you record *why* things connect, you preserve understanding.

---

## Slide 11: Robot Mode [14:30]

{slide transition - ASCII table appears}

[BREATHE]

Beads was designed for AI agents. Not adapted—*designed*.

[PAUSE]

Robot mode provides machine-readable output.

[PAUSE]

`--robot-priority` returns PageRank plus Critical Path ranking. [PAUSE] What *actually* matters most, algorithmically.

`--robot-insights` detects bottlenecks and keystones. [PAUSE] What's blocking progress.

`--robot-plan` suggests execution sequence. [PAUSE] An optimal order of work.

[PAUSE 2s]

Taskwarrior was designed for humans. [PAUSE] Beads speaks machine to machine.

---

## Slide 12: Labels [16:00]

{slide transition - ASCII diagram appears}

[BREATHE]

Labels organize work across two dimensions.

[PAUSE]

Properties—*where*. [PAUSE] Agency for client work. IO for research. Space for practice. Ltd for philosophy.

[PAUSE]

Types—*what*. [PAUSE] Feature, bug, research, refactor.

[PAUSE]

Priority—P0 through P4. [PAUSE] P0 is drop everything. P4 is maybe never.

[PAUSE 2s]

Scope plus type plus priority equals complete context.

[PAUSE]

One glance tells you everything.

---

## Slide 13: Molecules [17:30]

{slide transition - ASCII table appears}

[BREATHE]

Molecules are work templates using a chemistry metaphor.

[PAUSE]

Three phases. [PAUSE] Solid, liquid, vapor.

[PAUSE]

Solid—Protos—are templates. Reusable patterns you can instantiate.

Liquid—Mols—are persistent work. Git-synced feature work.

Vapor—Wisps—are ephemeral. Scratch work, experiments. Gitignored.

[PAUSE 2s]

`bd pour` converts a proto to a mol. Solid to liquid.

`bd wisp create` makes a wisp. Solid to vapor.

`bd mol squash` compresses a wisp to permanent. Vapor to solid.

`bd mol burn` deletes without trace.

[PAUSE]

Protos are templates. Mols persist. Wisps evaporate.

---

## Slide 14: Hermeneutic Continuity [19:00]

{slide transition}

[BREATHE]

[PAUSE 2s]

[SLOW]Memory bridges sessions.[/SLOW]

[PAUSE]

[SLOW]Understanding accumulates.[/SLOW]

[PAUSE 2s]

`bv --robot-priority` [PAUSE] Start every session here.

[BEAT]

The tool recedes. Context persists. The hermeneutic circle continues.

[PAUSE]

That's Beads. Continuity across context boundaries.

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
- [ ] Verify all 14 slides covered
- [ ] Run /audit-voice on transcript
