# Hierarchical Telos

## The Principle

**Ethos, projects, and issues—the three levels.**

Telos is purpose. Every piece of work exists within a hierarchy of purpose, from organizational ethos down to individual tasks. Understanding this hierarchy is essential for aligned agent behavior.

## The Three Levels

```
┌─────────────────────────────────────────────────────────────────┐
│                         ETHOS                                   │
│           (Organizational purpose and values)                   │
│                                                                 │
│  "Creation is the discipline of removing what obscures."        │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     PROJECT     │ │     PROJECT     │ │     PROJECT     │
│   (Bounded      │ │   (Bounded      │ │   (Bounded      │
│    initiative)  │ │    initiative)  │ │    initiative)  │
│                 │ │                 │ │                 │
│  "Launch LMS"   │ │ "Improve perf"  │ │ "Client work"   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
    ┌─────┼─────┐       ┌─────┼─────┐       ┌─────┼─────┐
    │     │     │       │     │     │       │     │     │
    ▼     ▼     ▼       ▼     ▼     ▼       ▼     ▼     ▼
  Issue Issue Issue   Issue Issue Issue   Issue Issue Issue
```

Each level has a different:
- **Scope**: Org → Project → Task
- **Duration**: Perpetual → Months → Days
- **Abstraction**: Values → Goals → Actions

## Ethos: The Unchanging Core

Ethos defines what the organization stands for:

```yaml
# ethos.yaml
name: CREATE SOMETHING
purpose: "Creation is the discipline of removing what obscures."

values:
  - Subtractive over additive
  - Transparency over opacity
  - Craft over speed
  - Understanding over accumulation

principles:
  dry:
    question: "Have I built this before?"
    action: Unify

  rams:
    question: "Does this earn its existence?"
    action: Remove

  heidegger:
    question: "Does this serve the whole?"
    action: Reconnect
```

**Ethos changes rarely—maybe once a year.**

Agents consult ethos when:
- Making architectural decisions
- Evaluating trade-offs
- Choosing between valid options

## Projects: Bounded Initiatives

Projects are time-bound efforts with clear outcomes:

```yaml
# project: lms-launch
name: Launch CREATE SOMETHING LMS
ethos_alignment:
  - "Making learning accessible aligns with understanding over accumulation"
  - "Subtractive design in curriculum follows our core principle"

goals:
  - Complete 6 learning paths
  - Build praxis exercise system
  - Deploy to learn.createsomething.space

success_metrics:
  - All paths have 5 lessons
  - Praxis coverage > 80%
  - Page load < 1s

timeline:
  start: 2025-12-01
  target_completion: 2025-12-31

constraints:
  - Must use Canon design system
  - No new dependencies without approval
  - Content must pass Subtractive Triad audit
```

**Projects change when the initiative evolves.**

Agents consult projects when:
- Understanding scope of work
- Prioritizing issues
- Knowing when "done" is done

## Issues: Atomic Work

Issues are the smallest meaningful unit:

```yaml
# issue: beads-xyz
title: "Create Infrastructure path content"
project: lms-launch
type: task

description: |
  Create 5 lessons for the Infrastructure learning path:
  1. edge-philosophy
  2. d1-patterns
  3. kv-caching
  4. workers-composition
  5. deployment-patterns

acceptance_criteria:
  - Each lesson follows established format
  - Code examples are tested
  - Reflection questions included

dependencies:
  - beads-abc  # Foundations path must be complete

estimated_effort: 4 hours
```

**Issues change constantly—created, updated, closed.**

Agents consult issues when:
- Deciding what to work on
- Understanding specific requirements
- Tracking progress

## The Telos Cascade

Every decision should cascade from ethos:

```
Ethos: "Does this earn its existence?"
                ↓
Project: "LMS must teach the principles, not just list them"
                ↓
Issue: "Each lesson needs praxis exercises"
                ↓
Work: "Create token-migration praxis for canon-tokens lesson"
```

When work aligns with this cascade, it serves the whole.

## Querying the Hierarchy

Agents can navigate the hierarchy:

### Bottom-Up: Why Am I Doing This?

```typescript
async function getContext(issueId: string): Promise<TelContext> {
  const issue = await getIssue(issueId);
  const project = await getProject(issue.project_id);
  const ethos = await getEthos(project.org_id);

  return {
    issue: {
      title: issue.title,
      acceptance_criteria: issue.acceptance_criteria
    },
    project: {
      name: project.name,
      goals: project.goals
    },
    ethos: {
      purpose: ethos.purpose,
      principles: ethos.principles
    },
    alignment: assessAlignment(issue, project, ethos)
  };
}
```

### Top-Down: What Should I Work On?

```typescript
async function findNextWork(agentId: string): Promise<Issue | null> {
  const ethos = await getEthos();
  const projects = await getActiveProjects();

  // Sort projects by ethos alignment and priority
  const prioritized = projects.sort((a, b) =>
    (b.ethos_alignment_score + b.priority) -
    (a.ethos_alignment_score + a.priority)
  );

  for (const project of prioritized) {
    const issues = await getReadyIssues(project.id);

    if (issues.length > 0) {
      // Return highest priority issue from highest priority project
      return issues.sort((a, b) => b.priority - a.priority)[0];
    }
  }

  return null;
}
```

## Alignment Checking

Before working, check alignment:

```typescript
async function checkAlignment(issue: Issue): Promise<AlignmentReport> {
  const context = await getContext(issue.id);
  const checks: AlignmentCheck[] = [];

  // Check ethos alignment
  for (const principle of context.ethos.principles) {
    checks.push({
      level: 'ethos',
      name: principle.name,
      aligned: assessPrincipleAlignment(issue, principle),
      rationale: generateRationale(issue, principle)
    });
  }

  // Check project alignment
  for (const goal of context.project.goals) {
    checks.push({
      level: 'project',
      name: goal,
      aligned: contributesToGoal(issue, goal),
      rationale: explainContribution(issue, goal)
    });
  }

  return {
    issue: issue.id,
    overall: checks.every(c => c.aligned),
    checks
  };
}
```

## Orphaned Work

Work without telos connection is dangerous:

```typescript
async function findOrphans(): Promise<Issue[]> {
  return await db.prepare(`
    SELECT i.* FROM issues i
    LEFT JOIN projects p ON i.project_id = p.id
    WHERE p.id IS NULL
      AND i.status = 'open'
  `).all();
}
```

### Why Orphans Are Problems

- No context for decision-making
- Can't assess priority
- Might conflict with active projects
- Might violate ethos

### Orphan Resolution

```bash
$ bd orphans

⚠ Found 3 orphaned issues:

1. beads-abc: "Update readme"
   └ Suggest: Assign to project 'documentation' or close

2. beads-def: "Investigate performance"
   └ Suggest: Create 'performance' project or merge with existing

3. beads-ghi: "Random idea"
   └ Suggest: Move to backlog or close

$ bd assign beads-abc --project=documentation
$ bd close beads-ghi --reason="Not aligned with current priorities"
```

## Projects and Ethos Evolution

When projects complete, they might reveal ethos gaps:

```typescript
async function projectRetro(projectId: string): Promise<Retrospective> {
  const project = await getProject(projectId);
  const issues = await getProjectIssues(projectId);
  const ethos = await getEthos();

  // Analyze what was learned
  const learnings = analyzeLearnings(issues);

  // Check if ethos needs updates
  const ethosGaps = findEthosGaps(learnings, ethos);

  return {
    project: project.name,
    completed: issues.filter(i => i.status === 'closed').length,
    learnings,
    ethos_suggestions: ethosGaps.map(gap => ({
      type: gap.type,
      suggestion: gap.suggestion,
      evidence: gap.evidence
    }))
  };
}
```

## The Hermeneutic Circle of Telos

Telos isn't strictly hierarchical—it's circular:

```
       Ethos informs Projects
              ↓
       Projects generate Issues
              ↓
       Issues produce Results
              ↓
       Results update Understanding
              ↓
       Understanding evolves Ethos
              ↓
       (cycle continues)
```

Working on issues teaches us about our values. What we learn might change our principles. The hierarchy is alive.

---

## Reflection

Before moving on:

1. Can you trace any current task back to organizational values?
2. Are there orphaned issues in your system?
3. When was the last time work taught you something about your values?

**Work without purpose is motion without progress.**
