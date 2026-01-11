# Ralph Patterns

**Ralph is the primary orchestration method for autonomous work.** The script spawns fresh Claude Code instances that work through user stories until complete.

## What to Do This Week

| When... | Do this |
|---------|---------|
| Building a new feature | `/prd-to-ralph` → `./ralph.sh` |
| Want overnight autonomous work | Create prd.json, run Ralph, sleep |
| Need parallel work (3+ features) | Use [Gastown](./gastown-patterns.md) (on request) |
| Quick test-fix loop (same session) | `/ralph-loop` (legacy single-session) |

**Default**: Use Ralph for all autonomous work.
**Exception**: Gastown only when you explicitly need parallelism (rare).

---

## Quick Start

```bash
# 1. Create your PRD (use the skill or write manually)
#    In Claude Code: "use /prd-to-ralph to create a contact form feature"
#    This generates prd.json

# 2. Run Ralph
./packages/agent-sdk/scripts/ralph.sh --max-iterations 10

# 3. Go to sleep (or have dinner)
# Ralph works through stories automatically

# 4. Check results
cat progress.txt
git log --oneline -10
```

---

## How Ralph Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        ralph.sh                                 │
├─────────────────────────────────────────────────────────────────┤
│  for iteration in 1..MAX_ITERATIONS:                            │
│    1. Read prd.json                                             │
│    2. Find story where passes == false                          │
│    3. Spawn fresh Claude Code instance                          │
│    4. Claude implements story, commits, updates prd.json        │
│    5. Log to progress.txt                                       │
│    6. If all stories pass → done                                │
│    7. Next iteration                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight**: Each iteration gets a fresh context window. No context pollution between stories.

---

## PRD Format

```json
{
  "title": "Feature Name",
  "description": "What this feature accomplishes",
  "created": "2026-01-11T00:00:00Z",
  "stories": [
    {
      "id": "story-1",
      "title": "Add login form",
      "description": "Create login form component",
      "acceptance": [
        "Form renders at /login",
        "Email validation works",
        "Tests pass"
      ],
      "files": ["src/routes/login/+page.svelte"],
      "passes": false
    }
  ]
}
```

### Story Rules

| Rule | Why |
|------|-----|
| **One story = one context window** | Keeps iterations focused |
| **Max 3-5 files per story** | Prevents scope creep |
| **Acceptance criteria must be verifiable** | Agent needs to know when done |
| **Order by dependency** | Foundation → Core → UI → Integration |

---

## Creating PRDs

### Option 1: Use the Skill

```
# In Claude Code
"Use /prd-to-ralph to create a user authentication feature with login, signup, and password reset"
```

The skill will:
1. Ask clarifying questions
2. Break the feature into atomic stories
3. Generate prd.json

### Option 2: Write Manually

Use the template at `packages/agent-sdk/templates/prd-template.json`

### Option 3: Voice → PRD

1. Open Claude Code
2. Use Whisper Flow to describe the feature
3. Say "use /prd-to-ralph to convert that into a PRD"

---

## Running Ralph

```bash
# Basic usage
./packages/agent-sdk/scripts/ralph.sh

# Custom iterations
./packages/agent-sdk/scripts/ralph.sh --max-iterations 20

# Custom PRD file
./packages/agent-sdk/scripts/ralph.sh --prd-file features/auth-prd.json

# Help
./packages/agent-sdk/scripts/ralph.sh --help
```

### Output Files

| File | Purpose |
|------|---------|
| `prd.json` | User stories (updated as stories complete) |
| `progress.txt` | Short-term memory, iteration logs |
| `.ralph-archive/` | Thread logs, archived PRDs |

---

## Acceptance Criteria

Good acceptance criteria are **specific and testable**:

| Good | Bad |
|------|-----|
| "Form renders at /login route" | "Form works" |
| "Returns 400 for invalid email" | "Validates correctly" |
| "Tests pass: `pnpm test --filter=auth`" | "Has tests" |
| "Component uses `--color-fg-primary` token" | "Follows Canon" |

---

## Cost Estimation

| Iterations | Estimated Cost | Use Case |
|------------|----------------|----------|
| 5 | ~$1.50 | Small feature (3-4 stories) |
| 10 | ~$3.00 | Medium feature (6-8 stories) |
| 20 | ~$6.00 | Large feature (12-15 stories) |

**Compare to**: Developer time at $100/hour. Ralph at $6 for overnight work.

---

## Troubleshooting

### Ralph Stops Early

**Symptom**: All stories show `passes: true` but feature isn't complete.

**Cause**: Acceptance criteria too vague. Claude marked them done when they weren't.

**Fix**: Write more specific acceptance criteria. Re-run with updated prd.json.

### Same Error Repeating

**Symptom**: Multiple iterations hit the same error.

**Cause**: Missing context in CLAUDE.md or agents.md.

**Fix**: Add the learning to CLAUDE.md so future iterations know about it.

### Story Too Big

**Symptom**: Claude can't complete a story in one iteration.

**Cause**: Story scope exceeds context window.

**Fix**: Break the story into smaller atomic pieces.

---

## Integration with Beads

Ralph works alongside Beads for issue tracking:

```bash
# Create a Beads issue for the feature
bd create "Implement user auth" --priority P1 --label feature

# Run Ralph to implement it
./ralph.sh --prd-file auth-prd.json

# Close the Beads issue when done
bd close <issue-id>
```

**Workflow**:
1. Create Beads issue for high-level feature
2. Use `/prd-to-ralph` to break into stories
3. Run Ralph to implement
4. Close Beads issue when all stories pass

---

## When to Use Gastown Instead

Use Gastown only when you need **true parallelism** (rare):

| Scenario | Tool |
|----------|------|
| Overnight feature development | **Ralph** |
| Sequential stories | **Ralph** |
| 3+ independent features simultaneously | Gastown |
| Need visibility into multiple workers | Gastown |

**Default to Ralph.** Gastown adds complexity without benefit for most work.

---

## Legacy: Single-Session Ralph

The `/ralph-loop` command is still available for quick test-fix loops within a single session:

```bash
/ralph-loop "Fix failing tests. Output <promise>DONE</promise> when green." --max-iterations 10
```

This is useful for:
- Quick test-fix loops
- Refinement within a session
- When you don't want to create a PRD

But for overnight autonomous work, **use the bash script Ralph**.

---

## Philosophy

### Why Fresh Context Per Iteration?

Context pollution is real. When Claude works on story 1, it accumulates context about that implementation. By story 5, the context window is cluttered with irrelevant details from earlier stories.

Fresh context per iteration means:
- Each story gets Claude's full attention
- No "memory" of implementation details that don't matter
- Cleaner, more focused work

### Why PRD.json?

The PRD is Claude's task board. Just like humans grab sticky notes from a kanban board, Claude grabs stories from the PRD.

The format is simple because it needs to be:
- Machine-readable (Claude parses it)
- Human-readable (you write it)
- Versionable (git tracks changes)

### Nondeterministic Idempotence

Different paths, same outcome. Ralph might take 8 iterations or 12. Stories might complete in different orders. But the end result is the same: a working feature.

This is why work survives crashes. If Ralph stops at iteration 5, you restart and it picks up from story 6.

---

## Related

- [PRD to Ralph Skill](../.claude/skills/prd-to-ralph.md) - Generate PRDs
- [Gastown Patterns](./gastown-patterns.md) - For parallel work (on request)
- [Beads Patterns](./beads-patterns.md) - Issue tracking
- [Harness Patterns](./harness-patterns.md) - Quality gates and checkpoints
