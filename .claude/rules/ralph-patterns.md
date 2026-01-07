# Ralph Patterns

Iterative refinement through self-referential feedback loops. The prompt never changes—your work does.

## What to Do This Week

| When... | Do this |
|---------|---------|
| Tests keep failing after implementation | `/ralph-loop "Fix failing tests..." --max-iterations 15` |
| Need to refine until criteria met | Use Ralph with clear completion criteria |
| Single feature needs iteration | Ralph (one session, multiple attempts) |
| Multiple features in parallel | Gas Town (multiple sessions, parallel work) |
| Sequential multi-step workflow | Harness (planned phases, checkpoint gates) |

**Example session:**

```bash
# Implemented feature, but 5 tests failing
/ralph-loop "Fix failing auth tests. Test output: <paste>. All tests must pass. Output <promise>TESTS_PASS</promise> when green." --max-iterations 15 --completion-promise "TESTS_PASS"

# Ralph iterates:
# Attempt 1: Fixes 2 tests, 3 still failing
# Attempt 2: Fixes 1 more, 2 failing
# Attempt 3: All pass → outputs <promise>TESTS_PASS</promise> → exits
```

---

## What Ralph Is

Ralph is a **single-session iteration loop** powered by Claude Code's Stop hook. You provide a prompt once. Claude works, tries to exit, gets blocked, sees its own changes, and tries again.

**The mechanism:**
1. You run `/ralph-loop "Your task" --completion-promise "DONE"`
2. Claude works on the task
3. Claude tries to exit
4. Stop hook blocks exit, re-feeds the same prompt
5. Claude sees its previous work in files and git history
6. Repeat until completion criteria met or max iterations reached

**Key insight**: The prompt stays the same. The files change. Each iteration, Claude sees its own past work and refines it.

---

## When to Use Ralph

### Good For

| Scenario | Why Ralph Works |
|----------|-----------------|
| **Test-fix loops** | Keep iterating until all tests pass |
| **Refinement with clear criteria** | "Tests pass," "linter clean," "build succeeds" |
| **Self-correcting work** | Each attempt improves on the last |
| **Greenfield iteration** | You can walk away, let it run |

### Not Good For

| Scenario | Use Instead |
|----------|-------------|
| **One-shot operations** | Regular Claude Code session |
| **Sequential multi-step plans** | Harness (planned workflow) |
| **Parallel independent features** | Gas Town (multiple workers) |
| **Subjective design decisions** | Human judgment required |
| **Production debugging** | Targeted debugging session |

---

## Commands

### `/ralph-loop`

Starts a Ralph iteration loop in the current session.

```bash
/ralph-loop "<prompt>" --max-iterations <n> --completion-promise "<text>"
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `<prompt>` | Yes | Task description with completion criteria |
| `--max-iterations <n>` | **Yes** | Safety limit (recommended: always set) |
| `--completion-promise "<text>"` | No | Exact string triggering exit (strict match) |

**Example:**

```bash
/ralph-loop "Fix all TypeScript errors. Run 'tsc --noEmit'. Output <promise>TYPES_CLEAN</promise> when zero errors." --max-iterations 20 --completion-promise "TYPES_CLEAN"
```

### `/cancel-ralph`

Cancels the active Ralph loop.

```bash
/cancel-ralph
```

---

## Prompt Writing

Good Ralph prompts have three parts: **context**, **criteria**, **signal**.

### Pattern: Test-Fix Loop

```bash
/ralph-loop "
Fix failing tests in auth module.

Test output:
<paste test failures>

Completion criteria:
- All tests in auth/ pass
- No new failures introduced
- Coverage remains >80%

Output <promise>TESTS_PASS</promise> when all green.
" --max-iterations 15 --completion-promise "TESTS_PASS"
```

### Pattern: Incremental Implementation

```bash
/ralph-loop "
Implement user registration endpoint.

Requirements:
1. POST /api/auth/register
2. Validate email format
3. Hash password with bcrypt
4. Store in D1 database
5. Return JWT token
6. Tests pass (coverage >80%)

Output <promise>ENDPOINT_COMPLETE</promise> when all requirements met.
" --max-iterations 20 --completion-promise "ENDPOINT_COMPLETE"
```

### Pattern: Refinement Until Clean

```bash
/ralph-loop "
Refactor auth.ts to remove duplication.

Current issues:
- 3 functions repeat JWT validation logic
- Password hashing duplicated in 2 places

Goals:
- Extract shared validation to auth-utils.ts
- DRY: Single source for each pattern
- Tests still pass
- Linter clean

Output <promise>REFACTOR_COMPLETE</promise> when clean.
" --max-iterations 10 --completion-promise "REFACTOR_COMPLETE"
```

### Pattern: Self-Diagnosis (Escape Hatch)

```bash
/ralph-loop "
Fix database migration errors.

Error: <paste error>

Try these in order:
1. Check migration SQL syntax
2. Verify schema matches current state
3. Test migration on local D1
4. If still failing after 8 attempts, document blockers and output <promise>NEED_HELP</promise>

Output <promise>MIGRATION_SUCCESS</promise> when applied cleanly.
" --max-iterations 10 --completion-promise "MIGRATION_SUCCESS"
```

**Note**: Include an escape hatch. If Ralph can't solve it, have it document what was tried and exit.

---

## Safety Mechanisms

### Always Set `--max-iterations`

**Critical**: Never run Ralph without iteration limits. Costs can spiral.

| Task Complexity | Recommended Max Iterations |
|----------------|---------------------------|
| Trivial (linting, formatting) | 5 |
| Simple (single-file fixes) | 10 |
| Standard (multi-file, tests) | 15-20 |
| Complex (architecture refactor) | 25-30 |

**Philosophy**: If Ralph can't solve it in 20 iterations, it's the wrong tool. Escalate to human or Gas Town.

### Completion Promise Limitations

`--completion-promise` uses **exact string matching**. It cannot handle:
- Multiple completion conditions
- Fuzzy matching
- Conditional outputs

**Good**: `<promise>DONE</promise>` (exact string)

**Bad**: `<promise>DONE if all tests pass, else PARTIAL</promise>` (conditional)

**Solution**: Use `--max-iterations` as your primary safety. Treat `--completion-promise` as a bonus optimization.

### Cost Budgeting

| Model | Cost per Request | 20 Iterations Cost |
|-------|------------------|-------------------|
| Haiku | ~$0.001 | ~$0.02 |
| Sonnet | ~$0.01 | ~$0.20 |
| Opus | ~$0.10 | ~$2.00 |

**Recommendation**: Use Haiku for Ralph loops when possible. Test-fix loops don't need Opus reasoning.

---

## Integration with CREATE SOMETHING Stack

### Ralph + Harness: Self-Healing Baseline

Harness checks baseline gates (tests, typecheck, lint) before starting work. Ralph handles the fix loop with model escalation:

```typescript
// In harness baseline check (packages/harness/src/self-heal.ts)
import { fixFailingBaselineWithRalph } from './ralph-escalation.js';

async function attemptRalphFix(
  gate: BaselineGate,
  config: BaselineConfig,
  cwd: string
): Promise<BaselineGate> {
  // Ralph handles tests and typecheck with escalation
  const result = await fixFailingBaselineWithRalph(
    gate.name as 'tests' | 'typecheck',
    gate.output
  );

  // Re-check if tests pass after Ralph execution
  const recheckResult = await runQualityGate(gate.name, config, cwd);
  return recheckResult;
}
```

**Usage:**

```bash
# Enable Ralph escalation in harness baseline check
bd work cs-abc123 --baseline-config '{"useRalphEscalation": true}'
```

Or programmatically:

```typescript
import { runBaselineCheck } from '@create-something/harness';

const result = await runBaselineCheck({
  gates: { tests: true, typecheck: true, lint: true },
  useRalphEscalation: true,  // Ralph will iteratively fix failures
  createBlockers: true
}, cwd);
```

**What happens:**
1. Harness runs tests → 5 failures
2. Standard auto-fix attempt (if `autoFix: true`)
3. Ralph escalation (if `useRalphEscalation: true`):
   - Iterations 1-5: Haiku tries to fix ($0.005 total)
   - Iterations 6-10: Escalates to Sonnet ($0.05 more)
   - Iterations 11-15: Escalates to Opus ($0.50 more)
4. Re-check: Runs tests again
5. If still failing: Creates blocker issue

**Use case**: Before harness starts implementing new features, Ralph ensures tests are green.

### Ralph + Harness: Checkpoint Recovery

Harness runs quality gates (security, architecture, quality). If gates fail, Ralph iterates to fix:

```typescript
// In harness checkpoint review
if (securityReviewFailed) {
  await ralphLoop({
    prompt: `
Security review found issues:
${reviewFindings}

Fix all security concerns. Re-run security review. Output <promise>SECURITY_PASS</promise> when clean.
    `,
    maxIterations: 10,
    completionPromise: 'SECURITY_PASS'
  });
}
```

**Use case**: Harness detects problem → Ralph iterates to fix → Harness continues.

### Ralph + Gas Town: Worker Self-Rescue

Gas Town workers can get stuck. Before escalating to Coordinator, try Ralph self-rescue:

```typescript
// In Gas Town worker
if (blockedForNIterations(3)) {
  const rescued = await ralphLoop({
    prompt: `
Task: ${currentTask}
Blocker: ${blockerError}

Try different approaches. Document what you try.
Output <promise>UNBLOCKED</promise> if solved, or <promise>NEED_HELP</promise> after 8 attempts.
    `,
    maxIterations: 10
  });

  if (!rescued) {
    sendMessage('HELP', { from: workerId, issue: currentTask });
  }
}
```

**Philosophy**: Nondeterministic idempotence—Ralph tries multiple paths, same outcome (unblocked or documented failure).

### Ralph + Beads: Iteration Label

Add `ralph-retry` label to Beads issues expected to need iteration:

```bash
# Create issue with Ralph hint
bd create "Fix flaky integration tests" --label ralph-retry --priority P1

# Harness sees label, uses Ralph for execution
if (issue.labels.includes('ralph-retry')) {
  await ralphLoop({
    prompt: generatePromptFromBeadsIssue(issue),
    maxIterations: 15
  });
}
```

**Labels for Ralph:**

| Label | Meaning |
|-------|---------|
| `ralph-retry` | Expected to need iteration (use Ralph) |
| `ralph-trivial` | Simple (5 iterations max) |
| `ralph-complex` | Complex (25 iterations max) |

---

## Prompt Generation from Beads

**Anti-pattern**: Hardcoded prompt templates (framework thinking)

**Pattern**: Generate prompts from Beads context (zero framework cognition)

```typescript
// Bad: Template prompt (framework)
const prompt = RALPH_TEMPLATE.replace('{{task}}', task.title);

// Good: Contextual prompt (reasoning)
function generateRalphPrompt(issue: BeadsIssue, error?: Error): string {
  return `
Issue: ${issue.title}

Context:
${issue.description}

Previous attempts:
${issue.notes || 'None'}

Acceptance criteria:
${issue.acceptance?.map(a => `- ${a}`).join('\n') || '- Task complete'}

${error ? `Error encountered:\n${error.message}` : ''}

Iterate until all acceptance criteria met. Output <promise>DONE</promise> when complete.
  `;
}
```

**Why this works**: Each prompt is specific to the Beads issue. No templates, no frameworks—just the problem.

---

## Examples

### Example 1: Test-Fix Loop

**Scenario**: Implemented auth feature, 5 tests failing.

```bash
/ralph-loop "
Fix failing auth tests.

Test output:
FAIL src/lib/auth.test.ts
  ✓ validates email format
  ✕ rejects weak passwords (expected 8 chars, got 6)
  ✕ hashes password with bcrypt (bcrypt not called)
  ✓ creates user in database
  ✕ returns valid JWT (token undefined)
  ✕ prevents duplicate emails (duplicate created)

Fix all failures. Output <promise>TESTS_PASS</promise> when all green.
" --max-iterations 15 --completion-promise "TESTS_PASS"
```

**What happens:**
- Iteration 1: Fixes password validation, 4 tests still failing
- Iteration 2: Adds bcrypt call, 3 tests failing
- Iteration 3: Fixes JWT return, 2 tests failing
- Iteration 4: Adds duplicate email check, all tests pass → outputs `<promise>TESTS_PASS</promise>` → exits

**Cost**: ~4 iterations × Sonnet = $0.04

### Example 2: Linting Cleanup

**Scenario**: 23 ESLint errors after refactor.

```bash
/ralph-loop "
Fix all ESLint errors.

Run: pnpm exec eslint src/

Current count: 23 errors

Keep fixing until zero errors. Output <promise>LINT_CLEAN</promise> when clean.
" --max-iterations 10 --completion-promise "LINT_CLEAN"
```

**What happens:**
- Iteration 1: Auto-fixes 18 errors, 5 manual fixes needed
- Iteration 2: Fixes 3 more, 2 remaining
- Iteration 3: Fixes remaining 2 → outputs `<promise>LINT_CLEAN</promise>` → exits

**Cost**: ~3 iterations × Haiku = $0.003

### Example 3: Type Errors After Dependency Update

**Scenario**: Updated SvelteKit, now 12 TypeScript errors.

```bash
/ralph-loop "
Fix TypeScript errors after SvelteKit 2.0 update.

Run: tsc --noEmit

Errors:
<paste tsc output>

Fix all type errors. Maintain existing functionality. Output <promise>TYPES_CLEAN</promise> when zero errors.
" --max-iterations 20 --completion-promise "TYPES_CLEAN"
```

**What happens:**
- Iteration 1-5: Fixes import paths, PageData types
- Iteration 6-8: Updates load function signatures
- Iteration 9: Zero errors → outputs `<promise>TYPES_CLEAN</promise>` → exits

**Cost**: ~9 iterations × Sonnet = $0.09

---

## Anti-Patterns

### Don't: Use Ralph for Sequential Workflows

```bash
# ❌ Bad: Ralph for multi-step feature
/ralph-loop "
1. Design database schema
2. Create migrations
3. Build API endpoints
4. Write tests
5. Deploy to production
"
```

**Why it's bad**: This is a **planned workflow**, not iteration. Use Harness.

**Fix**: Use Harness with spec file for sequential phases.

### Don't: Use Ralph Without Clear Exit Criteria

```bash
# ❌ Bad: Vague completion
/ralph-loop "Make the auth better" --max-iterations 50
```

**Why it's bad**: "Better" is subjective. Ralph will iterate forever (or hit max).

**Fix**: Define measurable criteria.

```bash
# ✅ Good: Clear criteria
/ralph-loop "
Improve auth:
- Add rate limiting (5 req/min)
- Add password strength check (8+ chars, 1 number, 1 special)
- Tests pass
- Linter clean

Output <promise>AUTH_IMPROVED</promise> when all criteria met.
" --max-iterations 20
```

### Don't: Use Ralph for Design Decisions

```bash
# ❌ Bad: Ralph for architecture
/ralph-loop "Design the best possible API architecture"
```

**Why it's bad**: Architecture requires human judgment, not iteration.

**Fix**: Make the decision yourself, use Ralph for implementation.

### Don't: Forget Max Iterations

```bash
# ❌ Bad: No safety limit
/ralph-loop "Fix all bugs"
```

**Why it's bad**: Could run forever, rack up massive costs.

**Fix**: Always set `--max-iterations`.

```bash
# ✅ Good: Safety limit
/ralph-loop "Fix all bugs in auth module" --max-iterations 20
```

---

## Philosophical Tensions

### Zuhandenheit vs Visible Iteration

**Tension**: Ralph makes iteration **visible** (you see attempts, explicit looping). This is Vorhandenheit—the tool demands attention.

**Resolution**: Ralph is for **refinement phases**, not production use. It's acceptable for the tool to be visible when you're actively debugging. Once refined, the result recedes into transparent use.

**When to use**: Debugging, test fixing, refinement
**When to avoid**: Production code that should "just work"

### Zero Framework Cognition vs Prompt Templates

**Tension**: Ralph requires carefully crafted prompts. This could become "framework thinking" (prompts as templates, not reasoning).

**Resolution**: Generate prompts from Beads context, don't hardcode templates. Each prompt should reason about the specific problem, not fill in a template.

**Test**: Can you explain why this exact prompt for this exact problem? If yes, it's reasoning. If "because that's the template," it's framework thinking.

### Persistence vs Restart

**Tension**: Ralph operates in a single session. Gas Town enables cross-session work. When to use which?

**Resolution**:

| Scenario | Tool | Why |
|----------|------|-----|
| Refinement in one session | Ralph | Iteration doesn't need persistence |
| Work spanning multiple sessions | Gas Town | Needs cross-session memory |
| Work that might crash/timeout | Gas Town | Beads ensures survival |

**Rule**: If the work might exceed session limits, use Gas Town. If it's refinement within limits, use Ralph.

---

## Cost Optimization

### Use Haiku for Simple Loops

Ralph loops can use Haiku when reasoning requirements are low:

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Linting fixes | Haiku | Pattern matching, not reasoning |
| Test fixes (unit) | Haiku | Bounded problem, clear feedback |
| Type errors | Sonnet | May need reasoning about types |
| Architecture refactor | Opus | Deep reasoning required |

**Savings**: Haiku is 10x cheaper than Sonnet for simple loops.

### Early Exit on Success

Use `--completion-promise` to exit as soon as criteria are met:

```bash
# Without completion promise: runs full 20 iterations even if done at 5
/ralph-loop "Fix tests" --max-iterations 20

# With completion promise: exits at iteration 5 when tests pass
/ralph-loop "Fix tests. Output <promise>DONE</promise> when all pass." --max-iterations 20 --completion-promise "DONE"
```

**Savings**: Up to 75% cost reduction if task completes early.

---

## Model Escalation (Proposed Enhancement)

**Current behavior**: Ralph uses whatever model your Claude Code session is running. If you start with Haiku and it can't solve the problem, it keeps trying with Haiku until max iterations.

**Proposed**: Add `--escalate` flag for automatic model escalation on repeated failures.

### How It Would Work

```bash
# Simple Ralph (current behavior)
/ralph-loop "Fix tests" --max-iterations 15

# Ralph with escalation (proposed)
/ralph-loop "Fix tests" --max-iterations 15 --escalate
```

**Escalation pattern** (mirrors harness self-healing):

```
Iterations 1-5:   Haiku (~$0.005 total)
Iterations 6-10:  Sonnet (~$0.05 total)
Iterations 11-15: Opus (~$0.50 total)
```

### Decision Logic

```typescript
interface EscalationConfig {
  initialModel: 'haiku' | 'sonnet' | 'opus';
  escalationThreshold: number;  // Iterations before escalating
  maxEscalations: number;        // How many times to escalate
}

const DEFAULT_ESCALATION: EscalationConfig = {
  initialModel: 'haiku',
  escalationThreshold: 5,  // Try 5 times before escalating
  maxEscalations: 2        // haiku → sonnet → opus
};

function selectModel(iteration: number, config: EscalationConfig): Model {
  const escalationLevel = Math.floor(iteration / config.escalationThreshold);

  if (escalationLevel === 0) return 'haiku';
  if (escalationLevel === 1) return 'sonnet';
  return 'opus';  // Final escalation
}
```

### Cost Comparison

**Without escalation** (Haiku throughout):
```
15 iterations × Haiku = ~$0.015
Success rate: ~60% (many tasks too complex for Haiku)
```

**With escalation** (Haiku → Sonnet → Opus):
```
Best case (Haiku solves): 3 iterations × Haiku = ~$0.003
Average case (Sonnet solves): 5 Haiku + 3 Sonnet = ~$0.035
Worst case (Opus needed): 5 Haiku + 5 Sonnet + 5 Opus = ~$0.555
Success rate: ~90% (escalates to appropriate model)
```

**The trade-off**: Higher average cost (~$0.035 vs $0.015), but better success rate (90% vs 60%). Fewer wasted iterations.

### When to Use `--escalate`

| Scenario | Use Escalation? |
|----------|-----------------|
| Unknown complexity | Yes - let it discover the right model |
| Known simple task (linting) | No - just use Haiku |
| Known complex task (architecture) | No - start with Opus directly |
| Iterative debugging | Yes - complexity may increase |

### Configuration Options (Future)

```bash
# Start with Sonnet, escalate to Opus if needed
/ralph-loop "Refactor auth" --escalate --start-model sonnet --max-iterations 20

# Custom escalation threshold
/ralph-loop "Fix tests" --escalate --escalation-threshold 3 --max-iterations 15

# Escalate based on error patterns (advanced)
/ralph-loop "Fix types" --escalate --escalate-on "TypeScript error" --max-iterations 20
```

### Integration with Harness

Harness already has escalation for task execution. Ralph escalation would work the same way:

```typescript
// Harness task escalation
if (taskFails(haiku)) → retry with sonnet
if (taskFails(sonnet)) → retry with opus

// Ralph iteration escalation (proposed)
if (iterations 1-5 fail) → switch to sonnet
if (iterations 6-10 fail) → switch to opus
```

**Consistency**: Same escalation pattern across the stack (Ralph, Harness, Gastown reviewers).

### Implementation Status

**Status**: Proposed enhancement (not yet implemented)

**Tracking**: See Beads issue `csm-5jz5r` for implementation progress

**Workaround** (current):
1. Start Ralph with Haiku
2. Monitor iterations manually
3. If stuck, cancel: `/cancel-ralph`
4. Restart with better model: `/ralph-loop` (switch to Sonnet/Opus session)

### Philosophical Grounding

**Subtractive Triad:**

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have we built this? | Yes - Harness has the pattern |
| **Rams** | Does it earn existence? | Yes - prevents wasted iterations, but keep it optional |
| **Heidegger** | Does it serve the whole? | Yes - matches stack-wide escalation pattern |

**Zero Framework Cognition**: Escalation emerges from reasoning about the problem (task not solving), not from framework rules. The system adapts the tool to the task.

**Zuhandenheit**: When escalation works correctly, you don't think about models—you just get working code. The infrastructure recedes.

---

## Troubleshooting

### Ralph Doesn't Exit

**Symptom**: Hits max iterations without outputting completion promise.

**Diagnosis**: Check if Claude ever output the exact promise string.

**Fix**:
1. Review last few iterations—did Claude output close but not exact?
2. Simplify promise string: `DONE` is easier to hit than `ALL_TESTS_PASSING_AND_LINTER_CLEAN`
3. Increase max iterations if task is legitimately complex

### Ralph Loops Without Progress

**Symptom**: Multiple iterations, files keep changing, but no improvement.

**Diagnosis**: Task is too vague or has conflicting requirements.

**Fix**:
1. Cancel the loop: `/cancel-ralph`
2. Rewrite prompt with clearer criteria
3. Break into smaller tasks if too complex

### Cost Explosion

**Symptom**: Ralph loop costs $5+ (way above estimates).

**Diagnosis**: Used Opus for too many iterations, or no max iterations set.

**Fix**:
1. Set strict `--max-iterations` based on task complexity
2. Use Haiku for simple loops
3. Monitor costs via Anthropic console

---

## Real-World Results

**From Ralph Wiggum documentation:**
- 6 repositories generated overnight (Y Combinator hackathon)
- $50k contract completed for $297 in API costs
- Entire programming language created over 3 months

**CREATE SOMETHING validation needed:** These are upstream claims. We should validate with our own experiments.

---

## Beads Integration: Ralph-Specific Fields

Add Ralph metadata to Beads issues:

```bash
# Create issue with Ralph config
bd create "Fix auth test failures" \
  --label ralph-retry \
  --label complexity:simple \
  --priority P1 \
  --metadata '{"ralph":{"maxIterations":15,"prompt":"Fix auth tests. Output <promise>DONE</promise>"}}'
```

**Metadata schema:**

```typescript
interface RalphMetadata {
  maxIterations: number;
  prompt?: string;  // Optional pre-generated prompt
  model?: 'haiku' | 'sonnet' | 'opus';  // Override model selection
  completionPromise?: string;
}
```

---

## Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| Average iterations to completion | <10 | Efficiency indicator |
| Success rate (completed vs max) | >80% | Prompt quality |
| Cost per Ralph session | <$0.20 | Budget control |
| Early exit rate | >50% | Completion promise effectiveness |

---

## Decision Matrix: Ralph vs Harness vs Gas Town

```
Is this iterative refinement (fix-test-fix)?
├─ Yes → Is it simple (tests, linting, types)?
│        ├─ Yes → Ralph (single session iteration)
│        └─ No → Is it sequential multi-phase work?
│                 ├─ Yes → Harness (planned workflow)
│                 └─ No → Is it parallel independent work?
│                          ├─ Yes → Gas Town (multi-session parallel)
│                          └─ No → Regular Claude Code session
└─ No → Is it planned sequential work?
         ├─ Yes → Harness
         └─ No → Is it parallel independent features?
                  ├─ Yes → Gas Town
                  └─ No → Regular Claude Code session
```

---

## The Subtractive Triad

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** (Implementation) | Have I built this before? | Harness has retry logic; Ralph is the pattern |
| **Rams** (Artifact) | Does this earn existence? | Yes—for iterative refinement, not all tasks |
| **Heidegger** (System) | Does this serve the whole? | Yes—fills iteration gap between harness and Gas Town |

**Philosophy**: Ralph embodies "iteration > perfection." Don't aim for perfect on first try. Let the loop refine the work.

**Zuhandenheit moment**: When Ralph completes successfully, it disappears. You're left with working code, no evidence of the 10 iterations it took. The tool receded; only the work remains.

---

## Implementation Reference: Escalation Logic

**Note**: This is reference code for implementing the proposed `--escalate` feature (Beads issue `csm-5jz5r`).

### Core Escalation Engine

```typescript
// ralph-escalation.ts

export type Model = 'haiku' | 'sonnet' | 'opus';

export interface EscalationConfig {
  enabled: boolean;
  initialModel: Model;
  escalationThreshold: number;  // Iterations before escalating
  maxEscalations: number;        // How many times to escalate (2 = haiku→sonnet→opus)
}

export interface RalphLoopOptions {
  prompt: string;
  maxIterations: number;
  completionPromise?: string;
  escalation?: EscalationConfig;
}

export const DEFAULT_ESCALATION: EscalationConfig = {
  enabled: false,
  initialModel: 'haiku',
  escalationThreshold: 5,
  maxEscalations: 2
};

/**
 * Select model based on current iteration and escalation config.
 *
 * Pattern: Try N iterations at each level before escalating
 * - Iterations 0-4: haiku
 * - Iterations 5-9: sonnet
 * - Iterations 10+: opus
 */
export function selectModel(
  iteration: number,
  config: EscalationConfig
): Model {
  if (!config.enabled) {
    return config.initialModel;
  }

  const escalationLevel = Math.min(
    Math.floor(iteration / config.escalationThreshold),
    config.maxEscalations
  );

  const models: Model[] = ['haiku', 'sonnet', 'opus'];
  const initialIndex = models.indexOf(config.initialModel);
  const targetIndex = Math.min(initialIndex + escalationLevel, models.length - 1);

  return models[targetIndex];
}

/**
 * Calculate estimated cost for a Ralph loop with escalation.
 */
export function estimateCost(
  iterations: number,
  config: EscalationConfig
): number {
  const costs: Record<Model, number> = {
    haiku: 0.001,
    sonnet: 0.01,
    opus: 0.10
  };

  let totalCost = 0;

  for (let i = 0; i < iterations; i++) {
    const model = selectModel(i, config);
    totalCost += costs[model];
  }

  return totalCost;
}

/**
 * Main Ralph loop with escalation support.
 *
 * This is a reference implementation showing how escalation
 * would integrate with the existing Ralph loop mechanism.
 */
export async function ralphLoopWithEscalation(
  options: RalphLoopOptions
): Promise<{ success: boolean; iterations: number; finalModel: Model; cost: number }> {
  const escalation = options.escalation || DEFAULT_ESCALATION;
  let currentModel = escalation.initialModel;
  let iterationsAtCurrentModel = 0;
  const costs: Record<Model, number> = { haiku: 0.001, sonnet: 0.01, opus: 0.10 };
  let totalCost = 0;

  for (let i = 0; i < options.maxIterations; i++) {
    // Determine model for this iteration
    currentModel = selectModel(i, escalation);

    console.log(`Iteration ${i + 1}/${options.maxIterations} using ${currentModel}`);

    // Run iteration with selected model
    const result = await runRalphIteration({
      prompt: options.prompt,
      model: currentModel,
      iterationNumber: i + 1
    });

    totalCost += costs[currentModel];
    iterationsAtCurrentModel++;

    // Check completion
    if (options.completionPromise && result.output.includes(options.completionPromise)) {
      console.log(`✓ Completed at iteration ${i + 1} using ${currentModel}`);
      return {
        success: true,
        iterations: i + 1,
        finalModel: currentModel,
        cost: totalCost
      };
    }

    // Escalation notification
    if (escalation.enabled) {
      const nextModel = selectModel(i + 1, escalation);
      if (nextModel !== currentModel) {
        console.log(`→ Escalating to ${nextModel} after ${iterationsAtCurrentModel} attempts with ${currentModel}`);
        iterationsAtCurrentModel = 0;
      }
    }
  }

  console.log(`✗ Max iterations reached (${options.maxIterations})`);
  return {
    success: false,
    iterations: options.maxIterations,
    finalModel: currentModel,
    cost: totalCost
  };
}

/**
 * Placeholder for actual Ralph iteration execution.
 * In practice, this would call the Claude Code API with the specified model.
 */
async function runRalphIteration(params: {
  prompt: string;
  model: Model;
  iterationNumber: number;
}): Promise<{ output: string }> {
  // This would integrate with Claude Code's actual execution mechanism
  // For now, this is a placeholder showing the interface
  throw new Error('Not implemented: runRalphIteration would call Claude Code API');
}
```

### CLI Integration

```typescript
// ralph-cli.ts

import { ralphLoopWithEscalation, DEFAULT_ESCALATION, type EscalationConfig } from './ralph-escalation';

interface RalphCLIArgs {
  prompt: string;
  maxIterations: number;
  completionPromise?: string;

  // Escalation flags
  escalate?: boolean;
  startModel?: 'haiku' | 'sonnet' | 'opus';
  escalationThreshold?: number;
}

/**
 * Parse /ralph-loop command with escalation flags.
 *
 * Examples:
 *   /ralph-loop "Fix tests" --max-iterations 15 --escalate
 *   /ralph-loop "Refactor" --max-iterations 20 --escalate --start-model sonnet
 *   /ralph-loop "Fix lint" --max-iterations 10 --escalate --escalation-threshold 3
 */
export async function executRalphCommand(args: RalphCLIArgs): Promise<void> {
  // Build escalation config from CLI args
  const escalation: EscalationConfig = {
    enabled: args.escalate || false,
    initialModel: args.startModel || 'haiku',
    escalationThreshold: args.escalationThreshold || DEFAULT_ESCALATION.escalationThreshold,
    maxEscalations: DEFAULT_ESCALATION.maxEscalations
  };

  // Validate args
  if (args.maxIterations < 1 || args.maxIterations > 50) {
    throw new Error('max-iterations must be between 1 and 50');
  }

  if (escalation.enabled && escalation.escalationThreshold < 1) {
    throw new Error('escalation-threshold must be at least 1');
  }

  console.log('Starting Ralph loop with escalation:');
  console.log(`  Prompt: ${args.prompt.substring(0, 60)}...`);
  console.log(`  Max iterations: ${args.maxIterations}`);
  if (escalation.enabled) {
    console.log(`  Escalation: ${escalation.initialModel} → ${escalation.escalationThreshold} iterations per level`);
  } else {
    console.log(`  Model: ${escalation.initialModel} (no escalation)`);
  }
  console.log('');

  // Execute loop
  const result = await ralphLoopWithEscalation({
    prompt: args.prompt,
    maxIterations: args.maxIterations,
    completionPromise: args.completionPromise,
    escalation
  });

  // Report results
  console.log('');
  console.log('Ralph loop complete:');
  console.log(`  Success: ${result.success ? '✓' : '✗'}`);
  console.log(`  Iterations: ${result.iterations}`);
  console.log(`  Final model: ${result.finalModel}`);
  console.log(`  Total cost: $${result.cost.toFixed(3)}`);
}
```

### Harness Integration

```typescript
// harness-ralph-integration.ts

import { ralphLoopWithEscalation } from './ralph-escalation';
import type { BeadsIssue } from './beads';

/**
 * Harness self-healing baseline using Ralph with escalation.
 *
 * Called before harness starts work to ensure tests/linting are clean.
 */
export async function fixFailingBaselineWithRalph(
  gate: 'tests' | 'typecheck' | 'lint',
  testOutput: string
): Promise<boolean> {
  const prompts = {
    tests: `
Fix failing baseline tests.

Test output:
${testOutput}

Keep iterating until all tests pass. Output <promise>BASELINE_CLEAN</promise>.
    `,
    typecheck: `
Fix TypeScript errors.

Run: tsc --noEmit

Errors:
${testOutput}

Fix all type errors. Output <promise>TYPES_CLEAN</promise> when zero errors.
    `,
    lint: `
Fix linting errors.

Run: pnpm exec eslint src/

Errors:
${testOutput}

Fix all lint errors. Output <promise>LINT_CLEAN</promise> when clean.
    `
  };

  const result = await ralphLoopWithEscalation({
    prompt: prompts[gate],
    maxIterations: 15,
    completionPromise: gate === 'tests' ? 'BASELINE_CLEAN' :
                       gate === 'typecheck' ? 'TYPES_CLEAN' : 'LINT_CLEAN',
    escalation: {
      enabled: true,
      initialModel: gate === 'lint' ? 'haiku' : 'sonnet',  // Linting is simpler
      escalationThreshold: 5,
      maxEscalations: 2
    }
  });

  return result.success;
}

/**
 * Execute Beads issue with Ralph (when labeled ralph-retry).
 */
export async function executeBeadsIssueWithRalph(issue: BeadsIssue): Promise<boolean> {
  // Check if issue has ralph-retry label
  if (!issue.labels.includes('ralph-retry')) {
    throw new Error('Issue must have ralph-retry label to use Ralph');
  }

  // Determine initial model from complexity label
  const complexity = issue.labels.find(l => l.startsWith('complexity:'));
  const initialModel = complexity === 'complexity:trivial' ? 'haiku' :
                       complexity === 'complexity:complex' ? 'opus' : 'sonnet';

  // Generate prompt from issue
  const prompt = `
Issue: ${issue.title}

Context:
${issue.description}

${issue.acceptance?.length ? 'Acceptance criteria:\n' + issue.acceptance.map(a => `- ${a}`).join('\n') : ''}

Iterate until all acceptance criteria met. Output <promise>DONE</promise> when complete.
  `;

  // Execute with escalation
  const result = await ralphLoopWithEscalation({
    prompt,
    maxIterations: 20,
    completionPromise: 'DONE',
    escalation: {
      enabled: true,
      initialModel,
      escalationThreshold: 5,
      maxEscalations: 2
    }
  });

  return result.success;
}
```

### Testing

```typescript
// ralph-escalation.test.ts

import { selectModel, estimateCost, type EscalationConfig } from './ralph-escalation';

describe('Ralph Escalation', () => {
  const config: EscalationConfig = {
    enabled: true,
    initialModel: 'haiku',
    escalationThreshold: 5,
    maxEscalations: 2
  };

  describe('selectModel', () => {
    it('starts with haiku for iterations 0-4', () => {
      expect(selectModel(0, config)).toBe('haiku');
      expect(selectModel(4, config)).toBe('haiku');
    });

    it('escalates to sonnet at iteration 5', () => {
      expect(selectModel(5, config)).toBe('sonnet');
      expect(selectModel(9, config)).toBe('sonnet');
    });

    it('escalates to opus at iteration 10', () => {
      expect(selectModel(10, config)).toBe('opus');
      expect(selectModel(15, config)).toBe('opus');
    });

    it('respects custom start model', () => {
      const sonnetConfig = { ...config, initialModel: 'sonnet' as const };
      expect(selectModel(0, sonnetConfig)).toBe('sonnet');
      expect(selectModel(5, sonnetConfig)).toBe('opus');
    });

    it('stays at initial model when disabled', () => {
      const disabled = { ...config, enabled: false };
      expect(selectModel(0, disabled)).toBe('haiku');
      expect(selectModel(10, disabled)).toBe('haiku');
    });
  });

  describe('estimateCost', () => {
    it('calculates cost for 15 iterations with escalation', () => {
      // 5 haiku ($0.005) + 5 sonnet ($0.05) + 5 opus ($0.50) = $0.555
      expect(estimateCost(15, config)).toBeCloseTo(0.555, 3);
    });

    it('calculates cost for early completion', () => {
      // 3 haiku = $0.003
      expect(estimateCost(3, config)).toBeCloseTo(0.003, 3);
    });

    it('calculates cost without escalation', () => {
      const disabled = { ...config, enabled: false };
      // 15 haiku = $0.015
      expect(estimateCost(15, disabled)).toBeCloseTo(0.015, 3);
    });
  });
});
```

### Usage Examples

```typescript
// Example 1: Simple escalation
await ralphLoopWithEscalation({
  prompt: 'Fix all test failures. Output <promise>DONE</promise>',
  maxIterations: 15,
  completionPromise: 'DONE',
  escalation: {
    enabled: true,
    initialModel: 'haiku',
    escalationThreshold: 5,
    maxEscalations: 2
  }
});
// Cost: $0.003-$0.555 depending on when it completes

// Example 2: Start with Sonnet, escalate to Opus if needed
await ralphLoopWithEscalation({
  prompt: 'Refactor auth module. Output <promise>REFACTOR_DONE</promise>',
  maxIterations: 20,
  completionPromise: 'REFACTOR_DONE',
  escalation: {
    enabled: true,
    initialModel: 'sonnet',
    escalationThreshold: 5,
    maxEscalations: 1  // Only escalate once (sonnet → opus)
  }
});

// Example 3: No escalation (current behavior)
await ralphLoopWithEscalation({
  prompt: 'Fix linting errors',
  maxIterations: 10,
  escalation: {
    enabled: false,
    initialModel: 'haiku',
    escalationThreshold: 5,
    maxEscalations: 0
  }
});
// Cost: exactly $0.010 (10 × haiku)
```

---

## Related Documentation

- [Harness Patterns](./harness-patterns.md) - Single-session workflows
- [Gastown Patterns](./gastown-patterns.md) - Multi-session orchestration
- [Beads Patterns](./beads-patterns.md) - Issue tracking
- [Model Routing Optimization](./model-routing-optimization.md) - Cost-effective model selection

---

## Installation

Ralph Wiggum is a Claude Code plugin. Install it:

```bash
# Clone the plugin
git clone https://github.com/anthropics/claude-code.git
cd claude-code/plugins/ralph-wiggum

# Install (exact mechanism depends on Claude Code plugin system)
# Consult Claude Code plugin documentation for installation
```

---

**Source**: Ralph Wiggum technique by Geoffrey Huntley (https://ghuntley.com/ralph/)
**Plugin**: Anthropic Claude Code official plugin
