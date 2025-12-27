# Agent Orchestration: Multi-Agent Patterns

## The Question

**"When should one agent become many?"**

Multi-agent systems are not about parallelism. They're about **decomposing complex intent into specialized capabilities**—each agent a tool that recedes, the swarm a transparent whole.

## The Swarm Principle

A single carpenter can build a house, but a crew is more efficient. Not because each person works faster—because each person specializes.

**Claude Code follows this principle.**

One agent handles everything → becomes visible (context overload, slow responses)
Many agents, each specialized → recede into use (fast, focused, composable)

## When One Agent Isn't Enough

### Context Window Limits

A single agent has finite context. When you're working on:
- Large codebases (> 100 files)
- Long-running tasks (multi-hour refactors)
- Parallel workstreams (backend + frontend + infrastructure)

You hit context walls:
```
Claude: "I've lost track of the earlier changes. Can you remind me?"
```

**The tool has become visible.**

### Cognitive Overload

Even with infinite context, specialization matters:

```
User: "Refactor the auth system, update the docs, and deploy"

Single agent: Must track all three contexts simultaneously
Result: Confusion, half-finished work, mistakes

Multi-agent:
Agent A: Refactors auth (deep context on codebase)
Agent B: Updates docs (focused on documentation)
Agent C: Deploys (infrastructure expertise)

Result: Parallel execution, specialized context, clean handoffs
```

## Multi-Agent Architectures

### Pattern 1: Hierarchical (Conductor)

```
         ┌──────────────┐
         │  Coordinator │  (Breaks down intent)
         └──────────────┘
               ↓
      ┌────────┴────────┐
      ↓                 ↓
┌──────────┐      ┌──────────┐
│ Agent A  │      │ Agent B  │  (Execute tasks)
│ (Backend)│      │ (Frontend│
└──────────┘      └──────────┘
      ↓                 ↓
   Results          Results
      └────────┬────────┘
               ↓
         ┌──────────────┐
         │  Coordinator │  (Integrates results)
         └──────────────┘
```

**When to use**: Complex tasks with clear subtask boundaries.

**Example**:
```
User: "Build a user authentication system"

Coordinator:
1. Decomposes into: DB schema, API endpoints, UI components
2. Assigns to specialized agents
3. Integrates results
4. Validates complete system
```

### Pattern 2: Pipeline (Chain)

```
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│ Agent  │ → │ Agent  │ → │ Agent  │ → │ Agent  │
│   1    │   │   2    │   │   3    │   │   4    │
│(Fetch) │   │(Parse) │   │(Transform│   │(Store) │
└────────┘    └────────┘    └────────┘    └────────┘
```

**When to use**: Sequential workflows where each stage depends on the previous.

**Example**:
```
User: "Migrate user data from old schema to new"

Pipeline:
Agent 1: Fetches old data
Agent 2: Validates and cleans
Agent 3: Transforms to new schema
Agent 4: Writes to new database
```

### Pattern 3: Collaborative (Peer)

```
┌────────┐     ┌────────┐     ┌────────┐
│ Agent  │ ←→ │ Agent  │ ←→ │ Agent  │
│   A    │     │   B    │     │   C    │
│(Review)│     │(Code)  │     │(Test)  │
└────────┘     └────────┘     └────────┘
     ↓              ↓              ↓
  Feedback      Changes       Coverage
     └──────────────┴──────────────┘
                    ↓
              Final Result
```

**When to use**: Tasks requiring iteration and feedback between agents.

**Example**:
```
User: "Implement a new feature with tests"

Collaboration:
Agent A (Code): Writes implementation
Agent B (Test): Writes tests, finds edge cases
Agent A: Fixes bugs found by tests
Agent C (Review): Suggests improvements
Agent A: Refines code
Agents converge on final implementation
```

### Pattern 4: Competitive (Selection)

```
┌────────┐     ┌────────┐     ┌────────┐
│ Agent  │     │ Agent  │     │ Agent  │
│   A    │     │   B    │     │   C    │
│(Approach│     │(Approach│     │(Approach│
│   1)   │     │   2)   │     │   3)   │
└────────┘     └────────┘     └────────┘
     ↓              ↓              ↓
  Option 1      Option 2      Option 3
     └──────────────┴──────────────┘
                    ↓
            ┌───────────────┐
            │   Evaluator   │  (Selects best)
            └───────────────┘
```

**When to use**: Optimization problems with multiple valid approaches.

**Example**:
```
User: "Optimize this database query"

Competition:
Agent A: Rewrites with better indexes
Agent B: Denormalizes for read performance
Agent C: Adds caching layer

Evaluator: Benchmarks all three, selects best approach
```

## Implementation Patterns

### Coordinator Agent (Hierarchical)

```typescript
// coordinator-agent.ts
interface Task {
  description: string;
  agent: string;
  dependencies: string[];
  status: 'pending' | 'in-progress' | 'complete';
  result?: unknown;
}

class CoordinatorAgent {
  private tasks: Map<string, Task> = new Map();
  private agents: Map<string, Agent> = new Map();

  async orchestrate(userIntent: string): Promise<Result> {
    // 1. Decompose intent into tasks
    const tasks = await this.decompose(userIntent);

    // 2. Build dependency graph
    const graph = this.buildGraph(tasks);

    // 3. Execute tasks in topological order
    const results = await this.executeTasks(graph);

    // 4. Integrate results
    return this.integrate(results);
  }

  private async decompose(intent: string): Promise<Task[]> {
    // Use Claude to break down complex intent
    const response = await claude({
      system: `You are a task decomposition specialist.
               Break complex intents into discrete, executable tasks.
               Consider dependencies and optimal ordering.`,
      messages: [
        {
          role: 'user',
          content: `Decompose this intent: ${intent}`,
        },
      ],
    });

    return parseTasksFromResponse(response);
  }

  private async executeTasks(graph: TaskGraph): Promise<Map<string, unknown>> {
    const results = new Map();

    while (graph.hasUnfinishedTasks()) {
      // Find tasks with satisfied dependencies
      const ready = graph.getReadyTasks();

      // Execute in parallel
      await Promise.all(
        ready.map(async (task) => {
          const agent = this.agents.get(task.agent)!;
          const result = await agent.execute(task, results);
          results.set(task.id, result);
          graph.markComplete(task.id);
        })
      );
    }

    return results;
  }
}
```

### Pipeline Agent (Chain)

```typescript
// pipeline-agent.ts
interface PipelineStage {
  name: string;
  agent: Agent;
  transform: (input: unknown) => Promise<unknown>;
}

class PipelineOrchestrator {
  private stages: PipelineStage[] = [];

  async execute(initialInput: unknown): Promise<unknown> {
    let data = initialInput;

    for (const stage of this.stages) {
      console.log(`Stage: ${stage.name}`);

      // Agent processes current data
      data = await stage.agent.execute({
        instruction: `Process this data for ${stage.name}`,
        context: data,
      });

      // Optional transform
      if (stage.transform) {
        data = await stage.transform(data);
      }
    }

    return data;
  }

  addStage(stage: PipelineStage) {
    this.stages.push(stage);
  }
}

// Usage
const migrationPipeline = new PipelineOrchestrator();

migrationPipeline.addStage({
  name: 'fetch',
  agent: fetchAgent,
  transform: (data) => validateSchema(data),
});

migrationPipeline.addStage({
  name: 'clean',
  agent: cleanAgent,
  transform: (data) => removeInvalid(data),
});

migrationPipeline.addStage({
  name: 'transform',
  agent: transformAgent,
  transform: (data) => applyNewSchema(data),
});

const result = await migrationPipeline.execute({ source: 'old_db' });
```

### Collaborative Agent (Peer)

```typescript
// collaborative-agents.ts
interface Message {
  from: string;
  to: string;
  content: string;
  type: 'request' | 'response' | 'feedback';
}

class CollaborativeSwarm {
  private agents: Map<string, Agent> = new Map();
  private messages: Message[] = [];
  private sharedContext: Map<string, unknown> = new Map();

  async collaborate(task: string): Promise<unknown> {
    // Initialize: all agents see the task
    this.broadcast({
      type: 'request',
      content: task,
    });

    // Iterate until convergence
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const changes = await this.runIteration();

      if (this.hasConverged(changes)) {
        break;
      }

      iterations++;
    }

    return this.sharedContext.get('result');
  }

  private async runIteration(): Promise<Change[]> {
    const changes: Change[] = [];

    // Each agent acts based on current context
    for (const [name, agent] of this.agents) {
      const action = await agent.decide(this.sharedContext, this.messages);

      if (action.type === 'modify') {
        this.sharedContext.set(action.key, action.value);
        changes.push(action);
      } else if (action.type === 'message') {
        this.messages.push({
          from: name,
          to: action.recipient,
          content: action.content,
          type: 'feedback',
        });
      }
    }

    return changes;
  }

  private hasConverged(changes: Change[]): boolean {
    // Converged if no changes in last iteration
    return changes.length === 0;
  }
}

// Usage
const swarm = new CollaborativeSwarm();
swarm.addAgent('coder', new CodingAgent());
swarm.addAgent('tester', new TestingAgent());
swarm.addAgent('reviewer', new ReviewAgent());

const result = await swarm.collaborate('Implement user authentication');
```

## Communication Patterns

### Shared Memory

Agents read/write to shared context:

```typescript
interface SharedMemory {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  delete(key: string): void;
}

// Agent A writes
memory.set('user_schema', {
  name: 'string',
  email: 'string',
});

// Agent B reads
const schema = memory.get('user_schema');
```

**Pro**: Simple, fast
**Con**: Race conditions, no versioning

### Message Passing

Agents send structured messages:

```typescript
interface Message {
  id: string;
  from: string;
  to: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

// Agent A sends
messageQueue.send({
  from: 'coder',
  to: 'tester',
  type: 'code_ready',
  payload: { files: ['auth.ts'] },
});

// Agent B receives
const msg = await messageQueue.receive('tester');
if (msg.type === 'code_ready') {
  runTests(msg.payload.files);
}
```

**Pro**: Decoupled, traceable
**Con**: Complexity, latency

### Event Streams

Agents subscribe to event topics:

```typescript
// Agent A publishes
events.publish('code.changed', {
  file: 'auth.ts',
  changes: diff,
});

// Agent B subscribes
events.subscribe('code.changed', async (event) => {
  await runTests(event.file);
});
```

**Pro**: Flexible, scalable
**Con**: Ordering issues, debugging harder

## Coordination Mechanisms

### Locks (Prevent Conflicts)

```typescript
class ResourceLock {
  private locks: Map<string, string> = new Map();

  async acquire(resource: string, agentId: string): Promise<boolean> {
    if (this.locks.has(resource)) {
      return false; // Already locked
    }

    this.locks.set(resource, agentId);
    return true;
  }

  release(resource: string, agentId: string) {
    if (this.locks.get(resource) === agentId) {
      this.locks.delete(resource);
    }
  }
}

// Usage
if (await locks.acquire('user_schema', 'agent-1')) {
  try {
    // Modify schema
  } finally {
    locks.release('user_schema', 'agent-1');
  }
}
```

### Barriers (Synchronization)

```typescript
class Barrier {
  private waiting: Set<string> = new Set();
  private threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  async wait(agentId: string): Promise<void> {
    this.waiting.add(agentId);

    if (this.waiting.size >= this.threshold) {
      this.waiting.clear();
      return; // All agents ready
    }

    // Wait for others
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.waiting.size >= this.threshold) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
}

// Usage
await barrier.wait('agent-1');
// All agents synchronized, continue
```

### Transactions (Atomicity)

```typescript
class Transaction {
  private operations: Array<() => Promise<void>> = [];
  private rollbacks: Array<() => Promise<void>> = [];

  add(op: () => Promise<void>, rollback: () => Promise<void>) {
    this.operations.push(op);
    this.rollbacks.unshift(rollback); // LIFO for rollback
  }

  async commit(): Promise<void> {
    for (const op of this.operations) {
      try {
        await op();
      } catch (error) {
        // Rollback all previous operations
        for (const rollback of this.rollbacks) {
          await rollback();
        }
        throw error;
      }
    }
  }
}

// Usage
const txn = new Transaction();

txn.add(
  () => createTable('users'),
  () => dropTable('users')
);

txn.add(
  () => insertRows('users', data),
  () => deleteRows('users', data)
);

await txn.commit(); // All or nothing
```

## Agent Specialization

### Domain Specialists

```typescript
class BackendAgent extends Agent {
  systemPrompt = `You are a backend specialist.
    Expertise: APIs, databases, authentication, performance.
    Focus: Server-side logic, data modeling, security.`;

  async execute(task: Task): Promise<Result> {
    return this.claude({
      system: this.systemPrompt,
      messages: [{ role: 'user', content: task.description }],
    });
  }
}

class FrontendAgent extends Agent {
  systemPrompt = `You are a frontend specialist.
    Expertise: React, Svelte, UI/UX, accessibility.
    Focus: Components, state management, user experience.`;
}
```

### Role-Based

```typescript
class CoderAgent {
  async execute(task: CodeTask): Promise<Code> {
    // Write code
  }
}

class ReviewerAgent {
  async execute(code: Code): Promise<Review> {
    // Review code, suggest improvements
  }
}

class TesterAgent {
  async execute(code: Code): Promise<TestResults> {
    // Generate tests, run them
  }
}
```

### Capability-Based

```typescript
class ReadAgent {
  capabilities = ['file_read', 'grep', 'glob'];
}

class WriteAgent {
  capabilities = ['file_write', 'edit'];
}

class ExecuteAgent {
  capabilities = ['bash', 'npm', 'git'];
}

// Coordinator assigns tasks based on capabilities
if (task.requires('file_write')) {
  assignTo(writeAgent);
}
```

## Error Handling

### Retry with Backoff

```typescript
async function executeWithRetry(
  agent: Agent,
  task: Task,
  maxRetries = 3
): Promise<Result> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await agent.execute(task);
    } catch (error) {
      attempt++;

      if (attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```

### Fallback Agents

```typescript
class AgentWithFallback {
  constructor(
    private primary: Agent,
    private fallback: Agent
  ) {}

  async execute(task: Task): Promise<Result> {
    try {
      return await this.primary.execute(task);
    } catch (error) {
      console.warn('Primary failed, using fallback:', error);
      return await this.fallback.execute(task);
    }
  }
}
```

### Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private threshold = 5;

  async execute(fn: () => Promise<unknown>): Promise<unknown> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;

    if (this.failures >= this.threshold) {
      this.state = 'open';

      // Attempt to close after timeout
      setTimeout(() => {
        this.state = 'half-open';
      }, 30000);
    }
  }
}
```

## Real-World Example: CREATE SOMETHING Deployment

```typescript
// Multi-agent deployment orchestration

class DeploymentOrchestrator {
  private agents = {
    build: new BuildAgent(),
    test: new TestAgent(),
    migrate: new MigrationAgent(),
    deploy: new DeployAgent(),
    verify: new VerificationAgent(),
  };

  async deploy(package: string): Promise<DeploymentResult> {
    const coordinator = new CoordinatorAgent();

    // Define deployment pipeline
    const tasks = [
      {
        id: 'install',
        agent: 'build',
        description: `Install dependencies for ${package}`,
        dependencies: [],
      },
      {
        id: 'build',
        agent: 'build',
        description: `Build ${package}`,
        dependencies: ['install'],
      },
      {
        id: 'test',
        agent: 'test',
        description: `Run tests for ${package}`,
        dependencies: ['build'],
      },
      {
        id: 'migrate',
        agent: 'migrate',
        description: `Apply database migrations`,
        dependencies: ['test'],
      },
      {
        id: 'deploy',
        agent: 'deploy',
        description: `Deploy ${package} to Cloudflare Pages`,
        dependencies: ['migrate'],
      },
      {
        id: 'verify',
        agent: 'verify',
        description: `Verify deployment health`,
        dependencies: ['deploy'],
      },
    ];

    return coordinator.orchestrate(tasks);
  }
}

// Usage
const orchestrator = new DeploymentOrchestrator();
await orchestrator.deploy('packages/space');
```

## Practical Invocation

### Running Agents in Claude Code

When working with Claude Code, invoke the harness for orchestrated work:

```
run harness in the background: ultrathink
```

This pattern combines two capabilities:

| Capability | Purpose | Philosophical Grounding |
|------------|---------|------------------------|
| **Background** | Frees conversation, enables parallel work | Tool recedes from attention |
| **Ultrathink** | Extended reasoning, thorough analysis | Gelassenheit—dwelling rather than rushing |

### When to Use Each Mode

| Mode | Context | Example |
|------|---------|---------|
| Foreground (default) | Quick tasks, immediate feedback needed | "Fix this typo", "Add a console.log" |
| Background | Long-running work, parallel tasks | Feature implementation, refactors |
| Ultrathink | Complex decisions, architecture | Multi-file changes, system design |
| Background + Ultrathink | Non-trivial autonomous work | Full feature from spec, major refactor |

### Invocation Examples

```
# Simple foreground work
run harness on cs-abc123

# Complex feature work (recommended for non-trivial tasks)
run harness in the background: ultrathink

# From a spec file
run harness on specs/auth-feature.yaml

# Create issue and work immediately
run harness: create and work on "Add user settings page"
```

### The Dwelling Principle

**Ultrathink** isn't just "think longer"—it embodies Heidegger's **Gelassenheit** (releasement).

Normal thinking rushes toward answers. Extended thinking *dwells* with the problem:
- Considers more edge cases
- Explores alternative approaches
- Reasons about system-level impacts

The irony: by taking more time to think, the tool recedes more completely. Rushed work requires intervention; thorough work completes autonomously.

**Pattern**: Use ultrathink when you want the harness to handle complex work without interruption.

## The Discipline

### When NOT to Multi-Agent

Don't use multiple agents for:
- Simple, linear tasks (single agent is fine)
- Tasks requiring deep, unified context
- Rapid prototyping (coordination overhead too high)

**Anti-pattern**: Using 5 agents to write a 50-line function. The coordination cost exceeds the value.

### When TO Multi-Agent

Use multiple agents for:
- Parallel workstreams (backend + frontend)
- Long-running tasks (context window constraints)
- Specialized domains (security review + performance optimization)
- Iterative refinement (code → test → review → improve)

**Pattern**: "I wish I could work on X and Y simultaneously" → Multi-agent candidate.

## Heideggerian Reflection

Multi-agent systems risk becoming **Gestell** if they:
- Introduce complexity for its own sake
- Obscure rather than reveal the work
- Make the system harder to understand

They achieve **Zuhandenheit** when they:
- Decompose naturally along domain boundaries
- Enable work that was impossible before
- Recede when working correctly

**The test**: Can you explain what each agent does in one sentence? If not, you've over-engineered.

## Praxis Integration

This lesson pairs with:
- **Praxis**: Build a multi-agent system for a real task
- **Skill**: `agent-orchestration` — guides swarm creation
- **Paper**: Hierarchical Telos — philosophical grounding

---

## Reflection

Before the praxis exercise:

1. What tasks in your workflow are naturally parallel?
2. Where do you hit context limits with single-agent work?
3. What would you build if you had a team of specialized agents?

**The goal isn't parallelism—it's specialized transparency.**

When the swarm recedes, the creation reveals itself.

---

## Cross-Property References

> **Canon Reference**: See [Tool Complementarity](https://createsomething.ltd/patterns/tool-complementarity) for how agents should complement rather than replace human judgment.
>
> **Research Depth**: Read the [Hierarchical Telos paper](https://createsomething.io/papers/hierarchical-telos) for the theoretical foundation of multi-level agent coordination.
>
> **Practice**: The CREATE SOMETHING deployment system uses multi-agent patterns—study the [deployment workflow](https://github.com/create-something/create-something-monorepo/tree/main/.github/workflows) to see these patterns in practice.
