# Coordination Primitives

## The Principle

**Issues, claims, dependencies—the graph of work.**

When multiple agents collaborate, they need shared understanding of work. Not just tasks, but relationships between tasks. This is coordination infrastructure.

## The Work Graph

Work isn't a list—it's a graph:

```
                    ┌──────────────┐
                    │    Ethos     │
                    │ (org values) │
                    └──────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Project A   │ │  Project B   │ │  Project C   │
    │  (website)   │ │   (API)      │ │  (mobile)    │
    └──────────────┘ └──────────────┘ └──────────────┘
           │               │               │
    ┌──────┼──────┐       │        ┌──────┼──────┐
    │      │      │       │        │      │      │
  Issue  Issue  Issue   Issue    Issue  Issue  Issue
    │      │      │       │        │      │      │
    └──────┴──────┴───────┴────────┴──────┴──────┘
                          │
                    (dependencies)
```

Agents navigate this graph to find work, understand context, and coordinate.

## Issues: The Atomic Unit

An issue is the smallest trackable unit of work:

```typescript
interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  type: 'task' | 'bug' | 'feature' | 'epic';
  priority: number;
  assignee?: string;
  dependencies: string[];  // IDs of blocking issues
  created_at: Date;
  updated_at: Date;
  closed_at?: Date;
  reason?: string;  // Why it was closed
}
```

### Issue States

```
  ┌─────────┐    claim     ┌─────────────┐    close     ┌────────┐
  │  open   │ ──────────→ │ in_progress │ ──────────→ │ closed │
  └─────────┘              └─────────────┘              └────────┘
       ↑                         │
       └─────── release ─────────┘
```

- **Open**: Work is defined, not started
- **In Progress**: An agent has claimed this work
- **Closed**: Work is complete (or abandoned with reason)

## Claims: Work Ownership

When an agent starts work, it claims the issue:

```typescript
// Claiming prevents collisions
async function claimIssue(issueId: string, agentId: string): Promise<boolean> {
  const issue = await getIssue(issueId);

  if (issue.status !== 'open') {
    return false; // Already claimed
  }

  await updateIssue(issueId, {
    status: 'in_progress',
    assignee: agentId,
    updated_at: new Date()
  });

  return true;
}
```

### Claim Etiquette

1. **Claim before working** → Prevents duplicate effort
2. **Release if blocked** → Others can proceed
3. **Complete or close** → Don't abandon silently
4. **Small claims** → Claim one issue at a time

## Dependencies: The Blocking Relationship

Issues can depend on other issues:

```typescript
// Add dependency: issueA depends on issueB
await addDependency('issue-A', 'issue-B');

// Check if ready (no open dependencies)
async function isReady(issueId: string): Promise<boolean> {
  const issue = await getIssue(issueId);

  for (const depId of issue.dependencies) {
    const dep = await getIssue(depId);
    if (dep.status !== 'closed') {
      return false; // Blocked by open dependency
    }
  }

  return true;
}
```

### Dependency Patterns

**Sequential**:
```
A ──→ B ──→ C
(B waits for A, C waits for B)
```

**Parallel**:
```
    ┌──→ B ──┐
A ──┤        ├──→ D
    └──→ C ──┘
(B and C can run together after A)
```

**Diamond**:
```
    ┌──→ B ──┐
A ──┤        ├──→ D
    └──→ C ──┘
(D waits for both B and C)
```

## Ready Work

An agent finds work by querying for ready issues:

```typescript
async function getReadyIssues(): Promise<Issue[]> {
  const openIssues = await db
    .prepare(`
      SELECT * FROM issues
      WHERE status = 'open'
      ORDER BY priority DESC
    `)
    .all();

  const ready: Issue[] = [];

  for (const issue of openIssues.results) {
    if (await isReady(issue.id)) {
      ready.push(issue);
    }
  }

  return ready;
}
```

**Agents work on what's ready, not what's urgent.**

## The Beads System

CREATE SOMETHING uses Beads for agent-native task management:

### Core Commands

```bash
# Find ready work
bd ready

# Show issue details
bd show <issue-id>

# Claim work
bd update <issue-id> --status=in_progress

# Complete work
bd close <issue-id> --reason="Description of what was done"

# Create new issue discovered during work
bd create --title="Discovered issue" --type=task

# Add dependency
bd dep add <issue> <depends-on>
```

### Session Workflow

```bash
# Start session: Find work
bd ready
# → Shows prioritized list of unblocked issues

# Claim issue
bd update beads-xxx --status=in_progress

# Work happens...

# Discover related work
bd create --title="Need to also handle edge case" --type=task
bd dep add beads-yyy beads-xxx  # New issue depends on current

# Complete work
bd close beads-xxx --reason="Implemented feature with tests"

# Sync to remote
bd sync
```

## Graph Queries

Powerful queries reveal system state:

### What's Blocking Everything?

```sql
-- Find issues that block the most other issues
SELECT
  i.id,
  i.title,
  COUNT(d.issue_id) as blocks_count
FROM issues i
JOIN dependencies d ON i.id = d.depends_on
WHERE i.status != 'closed'
GROUP BY i.id
ORDER BY blocks_count DESC
LIMIT 10;
```

### Critical Path

```typescript
// Find the longest chain of dependencies
function findCriticalPath(issues: Issue[]): Issue[] {
  const graph = buildDependencyGraph(issues);
  let longestPath: Issue[] = [];

  for (const issue of issues) {
    const path = findLongestPathFrom(issue, graph);
    if (path.length > longestPath.length) {
      longestPath = path;
    }
  }

  return longestPath;
}
```

### Orphaned Work

```sql
-- Issues with no project connection
SELECT * FROM issues
WHERE project_id IS NULL
  AND status = 'open';
```

## Coordination Protocols

### Handoff Protocol

When an agent can't complete work:

1. Document current state in issue
2. Release claim (status back to open)
3. Add note explaining where it stopped
4. Next agent can see context and continue

```bash
bd update beads-xxx --status=open
bd comment beads-xxx "Completed steps 1-3, blocked on API access for step 4"
```

### Escalation Protocol

When an issue needs human attention:

1. Tag issue with priority/needs-attention
2. Add detailed context
3. Continue with other work

```bash
bd update beads-xxx --priority=1 --labels="needs-human"
bd comment beads-xxx "Architecture decision needed: should we use X or Y approach?"
```

### Completion Protocol

When closing an issue:

1. Verify work is actually done
2. Add reason explaining what was done
3. Close any resolved dependencies
4. Trigger downstream work

```bash
bd close beads-xxx --reason="Implemented auth middleware with JWT validation"
# Downstream issues with dependency on beads-xxx now become ready
```

## Anti-Patterns

### Orphan Issues

```
Issue created → No dependencies → No project → Lost in the void
```

**Always connect issues to projects or parent issues.**

### Circular Dependencies

```
A depends on B
B depends on C
C depends on A  ← Cycle!
```

**Validate when adding dependencies.**

### Over-Granular Issues

```
Issue: Add semicolon to line 45
Issue: Add semicolon to line 46
Issue: Add semicolon to line 47
```

**Issues should be meaningful units of work.**

### Under-Granular Issues

```
Issue: Rebuild the entire application
```

**Issues should be completable in reasonable time.**

---

## Reflection

Before the praxis:

1. How do you currently track work relationships?
2. What would a dependency graph of your current project look like?
3. How often does duplicate work happen due to poor coordination?

**Praxis**: Set up a coordination system for a real project.
