# Agentic Layer Cost Analysis

## The Experiment

**Context**: Last month (December 2025), $400 in overages on Claude Code Max Plus while doing harness/convoy management.

**Hypothesis**: Same work output through agentic layer with budget enforcement = controlled costs + less management overhead.

**Goal**: Review completed work instead of managing execution.

---

## Cost Comparison: Claude Code vs Agentic Layer

### Current Approach (Manual Management)

| Activity | Time/Month | Cost Impact |
|----------|-----------|-------------|
| Managing harness sessions | ~20 hours | Hidden (context switching) |
| Monitoring convoy progress | ~15 hours | Hidden (attention cost) |
| Reviewing partial work | ~10 hours | Rework if direction wrong |
| **Uncontrolled API usage** | **Variable** | **$400 overage** |

**Total monthly cost**: Max Plus subscription + $400 overage = **~$620**

### Agentic Layer (Autonomous + Budget Limits)

| Activity | Time/Month | Cost Impact |
|----------|-----------|-------------|
| Submit tasks with budgets | ~2 hours | Upfront planning |
| Review completed artifacts | ~8 hours | Final approval only |
| Approve/reject/refine | ~5 hours | Quality decisions |
| **Controlled API usage** | **Budgeted** | **$0 overage (hard stop at 100%)** |

**Total monthly cost**: Max Plus subscription + budgeted API = **~$220-300** (estimated)

**Savings**: ~$320-400/month (52-65% reduction)

---

## Claude Code Costs (Reference)

From https://code.claude.com/docs/en/costs:

| Metric | Value |
|--------|-------|
| Average cost/developer/day | $6 |
| Daily cost (90th percentile) | <$12 |
| Team usage (Sonnet 4.5) | $100-200/developer/month |

**Your usage**: $620/month suggests heavy automation/multiple sessions, well above typical.

---

## Agentic Layer Pricing (Sonnet 4.5)

### Per-Token Costs

| Type | Cost |
|------|------|
| Input tokens | $3 / million tokens ($0.003 / 1K) |
| Output tokens | $15 / million tokens ($0.015 / 1K) |

### Typical Session Costs

| Session Type | Iterations | Input Tokens | Output Tokens | Total Cost |
|--------------|------------|--------------|---------------|------------|
| **Simple fix** | 5 | 25K | 10K | $0.225 |
| **Feature implementation** | 15 | 150K | 50K | $1.20 |
| **Template generation** | 25 | 300K | 100K | $2.40 |
| **Complex refactor** | 40 | 600K | 200K | $4.80 |

**Note**: Extended Thinking adds ~10-15% to input token cost but reduces iterations needed (net savings).

---

## Budget Recommendations

### Single Tasks

| Task Complexity | Recommended Budget | Expected Outcome |
|----------------|-------------------|------------------|
| **Trivial** (typo, config change) | $0.25 | Completes in 3-5 iterations |
| **Simple** (single component) | $1.00 | Completes in 8-12 iterations |
| **Standard** (multi-file feature) | $3.00 | Completes in 15-25 iterations |
| **Complex** (architecture change) | $8.00 | Completes in 30-45 iterations |

### Convoys (Parallel Tasks)

| Convoy Type | Tasks | Total Budget | Per-Task Budget |
|-------------|-------|--------------|-----------------|
| **Component library** | 5 components | $5.00 | $1.00 each |
| **Template suite** | 3 templates | $15.00 | $5.00 each |
| **Feature set** | 8 features | $20.00 | $2.50 each |

---

## Cost Control Mechanisms

### 1. Hard Budget Limits (80% warn, 100% stop)

```typescript
// Session stops automatically at 100%
if (costConsumed >= budget) {
  status = 'budget_exhausted';
  terminate();  // NO OVERAGES
}
```

**Impact**: Prevents runaway costs. Worst case = budgeted amount (never more).

### 2. Real-Time Tracking

Every iteration logs cost to DB immediately:

```sql
-- Query current spend
SELECT
  SUM(cost_consumed) as total_spent,
  COUNT(DISTINCT issue_id) as tasks_completed
FROM agentic_sessions
WHERE DATE(started_at) = CURRENT_DATE;
```

**Impact**: Know exactly where money goes, per-task attribution.

### 3. Estimated Iterations Remaining

```typescript
// Before iteration N:
avgCost = totalCost / iteration;
remaining = budget - costConsumed;
estimatedRemaining = remaining / avgCost;

// Agent gets warned at 80% with estimate
```

**Impact**: Agent can wrap up gracefully instead of hitting hard stop.

---

## Monthly Budget Scenarios

### Scenario 1: Conservative (Match Claude Code Average)

| Allocation | Tasks/Month | Avg Budget | Total |
|------------|-------------|------------|-------|
| Daily allocation | ~30 tasks | $2.00 each | $180 |

**Outcome**: Matches typical Claude Code usage ($6/day × 30 days).

### Scenario 2: Your Current Usage (Controlled)

| Allocation | Tasks/Month | Avg Budget | Total |
|------------|-------------|------------|-------|
| High automation | ~100 tasks | $3.00 each | $300 |

**Outcome**: Matches your current work output, but with hard limits (no $400 overage).

### Scenario 3: Experimental (Push Limits)

| Allocation | Tasks/Month | Avg Budget | Total |
|------------|-------------|------------|-------|
| Aggressive automation | ~150 tasks | $3.50 each | $525 |

**Outcome**: Exceeds current spend BUT you control when to stop.

---

## ROI Analysis

### Time Savings

| Activity | Before (hours/month) | After (hours/month) | Savings |
|----------|---------------------|-------------------|---------|
| Session management | 20 | 2 | 18 hours |
| Progress monitoring | 15 | 5 | 10 hours |
| Context switching | 10 (hidden) | 0 | 10 hours |
| **Total** | **45** | **7** | **38 hours** |

**Value**: 38 hours/month × $X hourly rate = substantial.

### Cost Savings (Conservative Estimate)

| Scenario | Monthly Cost | Savings vs Current |
|----------|--------------|-------------------|
| Current (uncontrolled) | $620 | baseline |
| Agentic (conservative) | $220 | **$400/month (65%)** |
| Agentic (moderate) | $300 | **$320/month (52%)** |

---

## Monitoring & Alerts

### Real-Time Dashboards

```sql
-- Daily spend
SELECT DATE(created_at), SUM(cost)
FROM agentic_iterations
WHERE created_at >= datetime('now', '-7 days')
GROUP BY DATE(created_at);

-- Budget utilization
SELECT
  COUNT(*) as total_tasks,
  SUM(CASE WHEN status = 'budget_exhausted' THEN 1 ELSE 0 END) as exhausted,
  AVG(cost_consumed / budget) as avg_utilization
FROM agentic_sessions
WHERE started_at >= datetime('now', '-30 days');
```

### Alerts (Future Enhancement)

- Daily spend > $15 → email alert
- Weekly spend > $100 → review required
- Task budget exhausted without completion → manual review

---

## Experiment Tracking

### Metrics to Track

| Metric | Purpose |
|--------|---------|
| **Total cost/month** | Compare to $620 baseline |
| **Tasks completed** | Measure output volume |
| **Budget exhaustion rate** | % of tasks hitting 100% |
| **Average cost/task** | Efficiency indicator |
| **Completion rate** | % tasks that finish vs timeout |
| **Review time/task** | Time spent on final approval |

### Success Criteria

1. **Cost**: Monthly API costs < $350 (vs $400 overage)
2. **Output**: Complete ≥80% of tasks attempted
3. **Efficiency**: Review time < 10 hours/month
4. **Quality**: Approval rate ≥ 70% on first submission

---

## Recommendations

### Week 1: Baseline Establishment

- Budget: $50 for the week ($7/day)
- Tasks: 15-20 simple-to-standard tasks
- Goal: Calibrate budget estimates

### Week 2-4: Scale Up

- Budget: $75/week
- Tasks: 25-30 mixed complexity
- Goal: Validate cost controls work at scale

### Month 2+: Optimize

- Adjust per-task budgets based on actual data
- Identify task types with best ROI
- Automate high-confidence workflows

---

## Cost Optimization Strategies

### 1. Model Routing (Future)

| Task Type | Model | Cost | When |
|-----------|-------|------|------|
| Simple edits | Haiku | $0.001/1K | Bounded, clear tasks |
| Feature work | Sonnet | $0.003/1K | Current default |
| Architecture | Opus | $0.015/1K | Critical decisions only |

**Potential savings**: 30-50% on simple tasks.

### 2. Convoy Batching

Group related work to amortize planning cost:

```
Single tasks: 3 × $3 = $9 (each has planning overhead)
Convoy: 3 tasks × $2.50 = $7.50 (shared planning)
Savings: $1.50 (17%)
```

### 3. Acceptance Criteria Precision

Vague criteria → more iterations → higher cost.

**Bad**: "Make it look good"
**Good**: "Lighthouse score ≥ 90, WCAG AA, Canon compliant"

---

## Related Documentation

- [Harness Patterns](../../../.claude/rules/harness-patterns.md) - What we're replacing
- [Orchestration Patterns](../../../.claude/rules/orchestration-patterns.md) - Cost tracking inspiration
- [Model Routing Optimization](../../../.claude/rules/model-routing-optimization.md) - Future cost savings

---

## Philosophical Reflection

This experiment validates the Subtractive Triad:

| Level | Application |
|-------|-------------|
| **DRY** | Don't duplicate management across sessions—automate it |
| **Rams** | Budget limits earn existence—prevent $400 overage |
| **Heidegger** | Infrastructure recedes—you review work, not manage sessions |

When cost controls work correctly, you think about quality decisions, not about how much you're spending. The budget system has receded into transparent use.

**The test**: Can you complete the same work for 50% less cost while spending 80% less time on management?
