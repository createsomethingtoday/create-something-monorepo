# Haiku + Ultrathink Validation: Near-Sonnet Performance at 10% Cost

**Experiment ID**: EXP-2026-004
**Date**: 2026-01-10
**Status**: Proposed

## Hypothesis

**H1 (Quality)**: Haiku 4.5 + ultrathink achieves ≥85% of Sonnet 4.5's quality on planning and refactoring tasks
**H2 (Cost)**: Haiku + ultrathink costs ≤15% of Sonnet for equivalent work
**H3 (Speed)**: Haiku + ultrathink completes tasks in ≤150% of Sonnet's time (acceptable if quality maintained)

## Community Claims

From Reddit/Discord discussions (December 2025):
- Haiku 4.5 + ultrathink achieves "~90% of Sonnet 4.5's performance"
- "Near-frontier coding quality"
- 4-5x faster than Sonnet
- Significant cost savings

**Our goal**: Validate these claims empirically.

## Test Design

### Task Selection

Select 10 tasks spanning complexity tiers:

| Task ID | Beads Issue | Type | Complexity | Description |
|---------|-------------|------|------------|-------------|
| T1 | csm-y3vos | Refactor | Trivial | Extract duplicate validation logic |
| T2 | csm-srz9n | Feature | Simple | Add pagination to existing list |
| T3 | csm-x0pko | Bug fix | Simple | Fix TypeScript type errors |
| T4 | csm-lajbf | Refactor | Standard | Restructure auth module (DRY violations) |
| T5 | csm-t53za | Feature | Standard | Add caching layer to API |
| T6 | csm-p84o0 | Planning | Standard | Design database migration strategy |
| T7 | csm-zi9nk | Debug | Standard | Fix intermittent test failures |
| T8 | csm-dieul | Refactor | Complex | Extract shared business logic across 5 files |
| T9 | csm-uv9ox | Feature | Complex | Implement OAuth flow with PKCE |
| T10 | csm-bg71a | Architecture | Complex | Design multi-tenant routing strategy |

### Execution Pattern

For each task:

**Run 1: Haiku + Ultrathink**
```
1. Explore: Let Haiku read relevant files
2. Plan: "ultrathink. Analyze this and propose a plan. Don't code yet."
3. Review plan with human
4. Code: "Implement the plan"
5. Verify: Run tests, check acceptance criteria
```

**Run 2: Sonnet (Baseline)**
```
1. Same exploration
2. Same planning step (without ultrathink)
3. Same review
4. Same implementation
5. Same verification
```

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Quality Match** | ≥85% | Tasks where Haiku result = Sonnet result |
| **Cost Savings** | ≥85% | (Sonnet cost - Haiku cost) / Sonnet cost |
| **Time Overhead** | ≤150% | Haiku time / Sonnet time |
| **Tests Pass Rate** | 100% | Both must pass tests |
| **Plan Quality** | ≥85% | Plans accepted by human without major revision |

### What We'll Track

For each task execution:

```typescript
interface TaskExecution {
  taskId: string;
  model: 'haiku-ultrathink' | 'sonnet';

  // Quality
  testsPass: boolean;
  acceptanceMet: boolean;
  planQuality: 'excellent' | 'good' | 'needs-revision' | 'poor';
  humanRevisionsNeeded: number;

  // Cost
  apiCost: number;
  tokensUsed: number;

  // Time
  explorationTime: number;  // seconds
  planningTime: number;     // seconds
  codingTime: number;       // seconds
  totalTime: number;        // seconds

  // Outcome
  success: boolean;
  notes: string;
}
```

## Implementation Guidance

Based on community experience and Anthropic documentation (Jan 2026):

### What Haiku + Ultrathink Provides

- **Extended thinking mode**: Internal reasoning budget before emitting answer, significantly improves multi-step coding and tool-using tasks
- **Performance**: Matches Sonnet 4 on coding and agent tasks while being faster and cheaper
- **Community validation**: Successful use as subagents with Sonnet coordinating, "pretty good" reliability for code exploration and structured coding

### Cost Management

**Thinking budget strategy**:
- Start with **small thinking budget (~1K tokens)** for most tasks
- Only raise budget for tasks that repeatedly fail quality gates
- Ultrathink is overkill for trivial operations (simple CRUD, styling)
- Thinking tokens are billed separately as output

**Best use cases for ultrathink**:
- Architecture and complex logic
- Deep design decisions
- Non-trivial Workers logic
- Trickier SvelteKit hooks
- Cross-file changes

**Skip ultrathink for**:
- Simple Cloudflare/SvelteKit primitives
- Trivial code edits
- Styling changes

### Reliability Boundaries

**Known limits** (per Anthropic documentation):
- Computer-use / agent success rates: **~50%**
- "Not reliable enough for autonomous operation" without guardrails
- Ultrathink improves reasoning but does NOT create perfect self-driving agent

**Required safeguards**:
- Quality gates: tests, typecheck, deploy dry-runs
- Escalation paths to Sonnet/Opus for repeated failures
- Human review for complex decisions

### Recommended Pattern

1. **Planner**: Claude Code with Sonnet 4.5 for bd issues and acceptance criteria
2. **Primary executor**: Haiku 4.5 with extended thinking for most coding, always behind quality gates
3. **Escalation**: Sonnet (or Opus) only for small percentage of tasks that repeatedly fail Haiku + tests

This experiment validates whether this pattern delivers the claimed cost savings while maintaining quality.

## Expected Results

**If H1 is true**: Haiku + ultrathink completes 8-9 of 10 tasks with same quality as Sonnet

**If H2 is true**: Average cost per task ~$0.001 (Haiku) vs ~$0.01 (Sonnet) = 90% savings

**If H3 is true**: Haiku takes 1.5x longer but still completes tasks correctly

**If all hypotheses true**: We've validated a middle tier that saves 85%+ on most tasks

## Implementation Plan

### Phase 1: Task Preparation (30 min)

- [x] Create 10 Beads issues for test tasks
- [x] Label with complexity tiers
- [x] Define acceptance criteria for each
- [ ] Prepare test files/environments (deferred to execution phase)

### Phase 2: Haiku + Ultrathink Execution (3-4 hours)

- [ ] Execute all 10 tasks with Haiku + ultrathink
- [ ] Track metrics for each
- [ ] Document plan quality
- [ ] Note any failures or issues

### Phase 3: Sonnet Baseline Execution (2-3 hours)

- [ ] Reset to pre-task state for each task
- [ ] Execute same 10 tasks with Sonnet
- [ ] Track same metrics
- [ ] Compare outcomes

### Phase 4: Analysis (1 hour)

- [ ] Calculate quality match percentage
- [ ] Calculate cost savings
- [ ] Calculate time overhead
- [ ] Identify patterns (where Haiku wins, where it struggles)

## Risk Mitigation

**Risk 1**: Haiku + ultrathink might fail on complex tasks
- Mitigation: Include full spectrum (trivial → complex), expect failures on T8-T10

**Risk 2**: Time overhead might be too high for practical use
- Mitigation: Track separately—cost savings might justify slower execution

**Risk 3**: Plan quality might be poor even if final code works
- Mitigation: Track plan quality separately—poor plans that work still count as success

## Success Criteria Summary

**Minimum viable**:
- 7/10 tasks succeed with Haiku + ultrathink
- 85%+ cost savings vs Sonnet
- All tasks that succeed pass tests

**Strong validation**:
- 9/10 tasks succeed
- 90%+ cost savings
- Time overhead <120%

**Conclusive proof**:
- 10/10 tasks succeed
- 90%+ cost savings
- Time overhead ≤100% (same or faster)

## What This Proves

**If successful**: We have a validated middle tier for model routing:
- Trivial → Haiku (pattern matching, $0.001)
- **Simple-Standard → Haiku + ultrathink (planning/refactoring, $0.001)**
- Standard (multi-file) → Sonnet (coordination, $0.01)
- Complex → Opus (architecture, $0.10)

**If unsuccessful**: Document where it fails and why, update routing recommendations

## Deliverables

1. **Experiment tracking**: This document with results filled in
2. **Research paper**: `packages/io/src/routes/papers/haiku-ultrathink-validation/+page.svelte`
3. **Updated routing docs**: `model-routing-optimization.md` with Haiku + ultrathink tier
4. **Harness integration**: (if successful) Add ultrathink support to harness routing

## Related Experiments

- [Orchestrated Code Generation](./orchestrated-code-generation.md) - Proved direct execution > orchestration at current scale
- [Dual-Agent Routing (archived)](../rules/dual-agent-routing.md) - Gemini orchestration not viable

---

## Results

_Results will be documented here as experiment progresses._

### Phase 1: Task Preparation

**Status**: Complete (2026-01-10)

**Created issues**:
- T1: csm-y3vos (Trivial: Extract duplicate validation logic)
- T2: csm-srz9n (Simple: Add pagination to existing list)
- T3: csm-x0pko (Simple: Fix TypeScript type errors)
- T4: csm-lajbf (Standard: Restructure auth module)
- T5: csm-t53za (Standard: Add caching layer to API)
- T6: csm-p84o0 (Standard: Design database migration strategy)
- T7: csm-zi9nk (Standard: Fix intermittent test failures)
- T8: csm-dieul (Complex: Extract shared business logic)
- T9: csm-uv9ox (Complex: Implement OAuth flow with PKCE)
- T10: csm-bg71a (Complex: Design multi-tenant routing strategy)

All issues labeled with `experiment:haiku-ultrathink` and appropriate complexity tiers.

### Phase 2: Haiku + Ultrathink Execution

**Status**: Not started

### Phase 3: Sonnet Baseline Execution

**Status**: Not started

### Phase 4: Analysis

**Status**: Not started

---

## Conclusion

_To be completed after experiment._
