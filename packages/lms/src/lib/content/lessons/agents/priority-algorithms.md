# Priority Algorithms

## The Principle

**PageRank, Critical Path, and impact scoring.**

Not all work is equal. Some tasks unlock others. Some have deadlines. Some have outsized impact. Priority algorithms surface the work that matters most.

## The Priority Problem

Simple priority systems fail:

```
Priority 1: Fix critical bug
Priority 1: Launch feature
Priority 1: Update documentation
Priority 1: Refactor auth
Priority 1: (Everything is priority 1)
```

When everything is high priority, nothing is.

## Robot Priority: The Beads Approach

Beads uses `--robot-priority` to compute priority algorithmically:

```bash
bd ready --robot-priority
```

This combines multiple signals:

1. **PageRank** → What's connected and blocking?
2. **Critical Path** → What's on the longest chain?
3. **Due Date** → What has a deadline?
4. **Impact Score** → What matters most?

## PageRank for Issues

PageRank measures importance through connections:

```
         ┌────────┐
         │ Issue A│◄───────────────┐
         └────────┘                │
              │                    │
              ▼                    │
         ┌────────┐          ┌────────┐
         │ Issue B│◄─────────│ Issue D│
         └────────┘          └────────┘
              │                    ▲
              ▼                    │
         ┌────────┐                │
         │ Issue C│────────────────┘
         └────────┘
```

PageRank says: **A issue that blocks many others is more important than an isolated issue.**

### Implementation

```typescript
function computePageRank(issues: Issue[], damping = 0.85, iterations = 20): Map<string, number> {
  const n = issues.length;
  const ranks = new Map<string, number>();

  // Initialize equal rank
  for (const issue of issues) {
    ranks.set(issue.id, 1 / n);
  }

  // Iterate
  for (let i = 0; i < iterations; i++) {
    const newRanks = new Map<string, number>();

    for (const issue of issues) {
      // Find issues that depend on this one (this blocks them)
      const blockers = issues.filter(i => i.dependencies.includes(issue.id));
      let rank = (1 - damping) / n;

      for (const blocker of blockers) {
        const blockerDeps = blocker.dependencies.length;
        rank += damping * (ranks.get(blocker.id) || 0) / blockerDeps;
      }

      newRanks.set(issue.id, rank);
    }

    ranks.clear();
    for (const [id, rank] of newRanks) {
      ranks.set(id, rank);
    }
  }

  return ranks;
}
```

### Interpretation

High PageRank issues:
- Block many downstream tasks
- Are central to the dependency graph
- Should be prioritized to unblock flow

Low PageRank issues:
- Isolated or terminal tasks
- Can be done anytime
- Good for parallel work

## Critical Path Analysis

The critical path is the longest chain of dependent tasks:

```
A (2d) ──→ B (3d) ──→ C (1d)
     \
      └─→ D (1d) ──→ E (1d)

Critical path: A → B → C = 6 days
Alternative: A → D → E = 4 days
```

**The critical path determines minimum completion time.**

### Finding the Critical Path

```typescript
function findCriticalPath(issues: Issue[]): Issue[] {
  const openIssues = issues.filter(i => i.status !== 'closed');
  const graph = buildDependencyGraph(openIssues);

  // Find all terminal issues (no dependents)
  const terminals = openIssues.filter(issue =>
    !openIssues.some(other => other.dependencies.includes(issue.id))
  );

  let longestPath: Issue[] = [];

  // DFS from each terminal, walking backwards
  for (const terminal of terminals) {
    const path = longestPathTo(terminal, graph, issues);
    if (path.length > longestPath.length) {
      longestPath = path;
    }
  }

  return longestPath;
}

function longestPathTo(issue: Issue, graph: Map<string, string[]>, issues: Issue[]): Issue[] {
  if (issue.dependencies.length === 0) {
    return [issue];
  }

  let longest: Issue[] = [];

  for (const depId of issue.dependencies) {
    const dep = issues.find(i => i.id === depId);
    if (!dep || dep.status === 'closed') continue;

    const path = longestPathTo(dep, graph, issues);
    if (path.length > longest.length) {
      longest = path;
    }
  }

  return [...longest, issue];
}
```

### Critical Path Priority

Issues on the critical path should be prioritized because:
- Any delay extends the entire project
- They're sequential, not parallelizable
- They're the bottleneck

## Due Date Priority

Simple but important—deadlines matter:

```typescript
function duePriority(issue: Issue): number {
  if (!issue.due_date) return 0;

  const now = new Date();
  const due = new Date(issue.due_date);
  const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilDue < 0) return 100;  // Overdue!
  if (daysUntilDue < 1) return 90;   // Due today
  if (daysUntilDue < 3) return 70;   // Due soon
  if (daysUntilDue < 7) return 50;   // This week

  return Math.max(0, 30 - daysUntilDue);
}
```

## Impact Scoring

Impact measures the value of completing an issue:

### Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| User Impact | High | Affects end users |
| Revenue Impact | High | Affects business metrics |
| Technical Debt | Medium | Reduces future velocity |
| Team Velocity | Medium | Unblocks team members |
| Learning | Low | Improves understanding |

### Scoring

```typescript
interface ImpactScores {
  user_impact: 0 | 1 | 2 | 3;      // None, Low, Medium, High
  revenue_impact: 0 | 1 | 2 | 3;
  tech_debt: 0 | 1 | 2 | 3;
  team_velocity: 0 | 1 | 2 | 3;
  learning: 0 | 1 | 2 | 3;
}

function computeImpact(scores: ImpactScores): number {
  return (
    scores.user_impact * 3 +
    scores.revenue_impact * 3 +
    scores.tech_debt * 2 +
    scores.team_velocity * 2 +
    scores.learning * 1
  );
}
```

## Combining Signals

The robot priority combines all signals:

```typescript
interface PriorityFactors {
  pageRank: number;      // 0-1
  criticalPath: boolean;
  duePriority: number;   // 0-100
  impact: number;        // 0-33
  explicit: number;      // 1-5 (user-set priority)
}

function computeRobotPriority(factors: PriorityFactors): number {
  let priority = 0;

  // PageRank: 30% weight
  priority += factors.pageRank * 100 * 0.30;

  // Critical path: 20% boost
  if (factors.criticalPath) {
    priority += 20;
  }

  // Due date: 25% weight
  priority += factors.duePriority * 0.25;

  // Impact: 15% weight
  priority += (factors.impact / 33) * 100 * 0.15;

  // Explicit priority: 10% weight
  priority += (factors.explicit / 5) * 100 * 0.10;

  return Math.min(100, Math.round(priority));
}
```

## Using Robot Priority

In practice:

```bash
$ bd ready --robot-priority

📋 Ready work (prioritized):

1. [P95] beads-abc: Implement authentication middleware
   └ Critical path, blocks 5 issues

2. [P78] beads-def: Fix database connection pooling
   └ High PageRank, due in 2 days

3. [P65] beads-ghi: Add user onboarding flow
   └ High user impact

4. [P45] beads-jkl: Update documentation
   └ Low urgency, can wait

5. [P32] beads-mno: Refactor old code
   └ Tech debt, not blocking
```

**Agents start at the top, humans can override.**

## Priority Recalculation

Priority isn't static. Recalculate when:

- Issues close (PageRank changes)
- Dependencies change
- Due dates approach
- Impact assessments update

```typescript
// Recalculate on every query for accuracy
async function getReadyWorkPrioritized(): Promise<Issue[]> {
  const ready = await getReadyIssues();
  const pageRanks = computePageRank(await getAllOpenIssues());
  const criticalPath = findCriticalPath(await getAllOpenIssues());

  return ready
    .map(issue => ({
      ...issue,
      robotPriority: computeRobotPriority({
        pageRank: pageRanks.get(issue.id) || 0,
        criticalPath: criticalPath.some(i => i.id === issue.id),
        duePriority: duePriority(issue),
        impact: issue.impact_score || 0,
        explicit: issue.priority || 3
      })
    }))
    .sort((a, b) => b.robotPriority - a.robotPriority);
}
```

## Human Override

Algorithms inform, humans decide:

```bash
# Override robot priority for specific issue
bd update beads-xxx --priority=1  # Force to top

# Mark issue as blocked by external factor
bd update beads-xxx --labels="waiting-on-external"
```

**Robot priority suggests. Humans confirm.**

---

## Reflection

Before moving on:

1. How do you currently decide what to work on next?
2. What would change if priority was computed from the dependency graph?
3. Are there hidden critical paths in your projects?

**The best priority system is one you trust enough to follow.**
