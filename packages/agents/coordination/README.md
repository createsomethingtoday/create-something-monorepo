# @create-something/agent-coordination

Multi-agent coordination layer for Cloudflare Workers. Graph-based task tracking with claims, dependencies, and health monitoring.

> *"The system tends itself so that it can tend to the work."*

## Philosophy

This package implements **hierarchical telos** for multi-agent systems:

```
┌─────────────────────────────────────────────────────────────────┐
│                         ETHOS                                    │
│                   (Health Directive)                             │
│   "Maintain coherence, effectiveness, alignment with purpose"   │
└────────────────────────────┬────────────────────────────────────┘
                             │ informs
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PROJECTS                                  │
│                   (Specific Directives)                          │
│        Finite goals with success criteria                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ generates
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ISSUES                                   │
│                    (Actionable Work)                             │
│       Claimed, tracked, completed by agents                      │
└─────────────────────────────────────────────────────────────────┘
```

Health without projects is maintenance theater. Projects without health degrades into chaos.

## Installation

```bash
pnpm add @create-something/agent-coordination
```

## Quick Start

```typescript
import { Coordinator } from '@create-something/agent-coordination';

// Initialize with D1 database
const coordinator = new Coordinator(env.DB);
await coordinator.initialize();

// Agent workflow
const work = await coordinator.getNextWork('agent-1', ['research', 'analysis']);
if (work?.claimed) {
  // Do the work...
  await coordinator.completeWork(work.issue.id, 'agent-1', 'success', 'Found the answer');
}

// Health monitoring
const { metrics, violations, projects } = await coordinator.runHealthCheck();
```

## Core Concepts

### Issues

Units of work with status, priority, and labels.

```typescript
await coordinator.tracker.createIssue({
  description: 'Research agent memory patterns',
  projectId: 'proj-abc',
  priority: 1,  // P1 = high priority
  labels: ['research', 'agents'],
});
```

### Dependencies

Graph edges between issues.

```typescript
// A must complete before B can start
await coordinator.tracker.addDependency(issueA, issueB, 'blocks');

// B was discovered while working on A
await coordinator.tracker.addDependency(issueB, issueA, 'discovered_from');
```

### Claims

Prevent duplicate work across agents.

```typescript
// Claim an issue (5 minute TTL)
const claimed = await coordinator.claims.claim(issueId, agentId, { ttlMs: 5 * 60 * 1000 });

// Release when done or failed
await coordinator.claims.release(issueId, agentId);

// Expired claims are automatically reclaimed
await coordinator.claims.reclaimExpired();
```

### Priority

Graph-based prioritization.

```typescript
// Get prioritized ready issues
const prioritized = await coordinator.priority.getPrioritized(10);
// [{ issue, score: 0.85, reason: 'High impact, priority' }, ...]

// Get bottleneck issues (blocking the most work)
const bottlenecks = await coordinator.priority.getBottlenecks(5);

// Get critical path
const criticalPath = await coordinator.priority.getCriticalPath();
```

### Routing

Capability-based work assignment.

```typescript
// Get next issue for agent based on capabilities
const next = await coordinator.router.getNextFor('agent-1', {
  preferLabels: ['research'],
});

// Find best agent for an issue
const agent = await coordinator.router.getBestAgentFor(issueId);

// Auto-assign ready issues to available agents
const assignments = await coordinator.router.autoAssign(10);
```

### Ethos (Health Monitoring)

The general health directive that creates context for specific work.

```typescript
// Assess current health
const metrics = await coordinator.ethos.assessHealth();
// { coherence: 0.8, velocity: 2.5, blockage: 0.1, ... }

// Check for violations
const violations = await coordinator.ethos.checkViolations();
// [{ metric: 'coherence', current: 0.6, threshold: 0.7, action: 'create-linking-project' }]

// Run full monitoring cycle
const { metrics, violations, projects } = await coordinator.ethos.runCycle();
```

## Schema

Apply the D1 migration:

```bash
wrangler d1 migrations apply COORDINATION_DB --local
```

Or initialize programmatically:

```typescript
import { initializeSchema } from '@create-something/agent-coordination/schema';

await initializeSchema(env.DB);
```

## Agent Patterns

### Work Stealing

```typescript
async function agentLoop(agentId: string, capabilities: string[]) {
  while (true) {
    const work = await coordinator.getNextWork(agentId, capabilities);

    if (!work) {
      await sleep(5000);  // No work available
      continue;
    }

    if (!work.claimed) {
      continue;  // Another agent got it
    }

    try {
      const result = await doWork(work.issue);
      await coordinator.completeWork(work.issue.id, agentId, 'success', result);
    } catch (error) {
      await coordinator.completeWork(work.issue.id, agentId, 'failure', error.message);
    }
  }
}
```

### Pipeline Handoff

```typescript
// Agent A completes research
await coordinator.tracker.createIssue({
  description: 'Synthesize research findings',
  labels: ['synthesis'],
});
await coordinator.tracker.addDependency('research-issue', 'synthesis-issue', 'blocks');

// Complete research → automatically unblocks synthesis
await coordinator.completeWork('research-issue', 'agent-a', 'success');

// Agent B (with 'synthesis' capability) picks up the unblocked issue
```

### Speculative Parallelism

```typescript
// Create multiple approaches
const approachA = await coordinator.tracker.createIssue({ description: 'Approach A' });
const approachB = await coordinator.tracker.createIssue({ description: 'Approach B' });
const goal = await coordinator.tracker.createIssue({ description: 'Goal' });

// Any approach completing unblocks the goal
await coordinator.tracker.addDependency(approachA.id, goal.id, 'any_of');
await coordinator.tracker.addDependency(approachB.id, goal.id, 'any_of');

// First completion wins, others can be cancelled
```

## Health Thresholds

Default thresholds that trigger remediation projects:

| Metric | Threshold | Action |
|--------|-----------|--------|
| coherence | min 0.7 | Link orphaned issues to projects |
| blockage | max 0.3 | Prioritize blocking issues |
| staleness | max 7 days | Prune or revive stale issues |
| claimHealth | min 0.3 | Rebalance workload |
| agentHealth | min 0.5 | Investigate agent failures |

Customize thresholds:

```typescript
const coordinator = new Coordinator(env.DB, {
  thresholds: [
    { metric: 'coherence', operator: 'min', value: 0.9, action: 'enforce-project-linking' },
    { metric: 'blockage', operator: 'max', value: 0.1, action: 'emergency-unblock' },
  ],
});
```

## API Reference

### Coordinator

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize schema |
| `getNextWork(agentId, capabilities)` | Get and claim next work item |
| `completeWork(issueId, agentId, result, learnings)` | Complete and release work |
| `runHealthCheck()` | Run monitoring cycle |

### Tracker

| Method | Description |
|--------|-------------|
| `createProject(name, options)` | Create a project |
| `createIssue(options)` | Create an issue |
| `updateIssue(id, options)` | Update an issue |
| `addDependency(from, to, type)` | Add dependency edge |
| `getReadyIssues(limit)` | Get unblocked, unclaimed issues |
| `getBlockedIssues()` | Get blocked issues with blockers |
| `recordOutcome(issueId, agentId, result, learnings)` | Record work outcome |

### Claims

| Method | Description |
|--------|-------------|
| `registerAgent(agentId, capabilities)` | Register/update agent |
| `claim(issueId, agentId, options)` | Claim an issue |
| `release(issueId, agentId)` | Release a claim |
| `heartbeat(agentId)` | Update agent heartbeat |
| `reclaimExpired()` | Reclaim expired claims |
| `detectDeadAgents(timeoutMs)` | Detect and handle dead agents |

### Priority

| Method | Description |
|--------|-------------|
| `getPrioritized(limit)` | Get prioritized ready issues |
| `calculateScore(issue)` | Calculate priority score |
| `getCriticalPath()` | Get critical path through graph |
| `getBottlenecks(limit)` | Get issues blocking most work |

### Router

| Method | Description |
|--------|-------------|
| `getNextFor(agentId, options)` | Get next issue for agent |
| `getBestAgentFor(issueId)` | Find best agent for issue |
| `autoAssign(limit)` | Auto-assign issues to agents |
| `getWorkloadDistribution()` | Get workload per agent |

### Ethos

| Method | Description |
|--------|-------------|
| `assessHealth()` | Calculate health metrics |
| `checkViolations()` | Check thresholds |
| `respondToViolations(violations)` | Create remediation projects |
| `runCycle()` | Full monitoring cycle |
| `getHealthHistory(hours)` | Get historical metrics |
| `getHealthTrend()` | Get trend direction |

## License

MIT
