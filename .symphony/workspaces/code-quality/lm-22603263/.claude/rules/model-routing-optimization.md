# Model Routing Optimization

## The Pattern: Plan → Execute → Review

Anthropic's intended workflow for Claude Code:

**Sonnet plans → Haiku executes → Opus reviews (when critical)**

## Core Insight

Haiku 4.5 achieves **90% of Sonnet's performance** on well-defined tasks while costing **~10x less**. The key enabler is **task decomposition quality**.

When Sonnet breaks work into clear, bounded subtasks, Haiku executes them reliably at dramatically lower cost.

## Decision Tree

```
Is this a planning/architecture task?
├─ Yes → Sonnet (or Opus if critical)
│         Examples: feature design, system architecture, API contracts
│
└─ No → Is this well-defined execution?
         ├─ Yes → Haiku (90% performance, 10x cheaper)
         │         Examples: file edits, CRUD scaffolding, test runs
         │
         └─ No → Is this security/complex review?
                  ├─ Yes → Opus
                  │         Examples: auth review, architecture audit
                  │
                  └─ No → Sonnet (default)
```

## Cost Analysis

| Workflow | Models Used | Estimated Cost | Use Case |
|----------|-------------|----------------|----------|
| **Current** | Sonnet throughout | $0.030 | Simple file edit |
| **Optimized** | Haiku execution | $0.003 | Same file edit |
| **Savings** | — | **90%** | Per simple task |

**Projected savings**: 18% → **35%+** across typical workloads when Haiku handles all well-defined execution.

## Model Capabilities

### Haiku 4.5 (Executor)

**Best for:**
- Single-file edits with clear instructions
- CRUD endpoint scaffolding
- Test file creation
- Linting and formatting fixes
- Component generation from templates
- Database migration scripts
- Simple refactors (rename, extract)

**Cost**: ~$0.001/task
**Performance**: 90% of Sonnet on bounded tasks

### Sonnet 4.5 (Planner)

**Best for:**
- Task decomposition and planning
- Multi-file feature implementation
- API design and contracts
- Complex logic (business rules, state machines)
- Integration work (connecting systems)

**Cost**: ~$0.01/task
**Performance**: Reference standard

### Opus 4.1 (Reviewer)

**Best for:**
- Security-critical review (auth, payments)
- Architecture audits
- Performance optimization
- Subtle bug detection (race conditions, memory leaks)
- Final review before production

**Cost**: ~$0.10/task
**Performance**: Highest reasoning capability

## Routing Strategies

### Strategy 1: Label-Based (Explicit)

Add model hints to Beads issues:

```bash
# Explicit model override
bd create "Fix typo in README" --label model:haiku
bd create "Rename getUserData function" --label model:haiku
bd create "Design new API architecture" --label model:opus

# Complexity labels (maps to models)
bd create "Add console.log" --label complexity:trivial      # → Haiku
bd create "Implement login form" --label complexity:simple   # → Haiku
bd create "Refactor auth system" --label complexity:complex  # → Opus
```

### Strategy 2: Pattern-Based (Automatic)

Detect patterns in issue title/description:

| Pattern | Model | Examples |
|---------|-------|----------|
| `rename`, `fix typo`, `update text` | Haiku | "Rename variable X to Y" |
| `add console.log`, `format`, `lint` | Haiku | "Fix linting errors" |
| `scaffold`, `CRUD`, `generate` | Haiku | "Generate User CRUD endpoints" |
| `design`, `architect`, `plan` | Sonnet | "Design payment flow" |
| `security`, `auth`, `review` | Opus | "Security audit of auth" |

### Strategy 3: File-Count Based

| Files Affected | Model | Rationale |
|----------------|-------|-----------|
| 1 file | Haiku | Single-file edits are well-bounded |
| 2-3 files | Sonnet | May require coordination |
| 4+ files | Sonnet planning → Haiku execution | Break into subtasks |

### Strategy 4: Pipeline (Advanced)

For complex work, use multi-phase execution:

```yaml
# Example: Multi-file feature
phases:
  1_planning:
    model: sonnet
    output: task_breakdown.md

  2_execution:
    model: haiku
    parallel: true
    tasks:
      - name: Create component
        file: src/lib/UserProfile.svelte
      - name: Create API endpoint
        file: src/routes/api/users/+server.ts
      - name: Add tests
        file: src/tests/users.test.ts

  3_review:
    model: opus
    trigger: label:security OR complexity:complex
```

## Implementation Patterns

### Harness Integration

Update `packages/harness/src/routing.ts`:

```typescript
function selectModel(issue: BeadsIssue): Model {
  // 1. Explicit label override
  if (issue.labels.includes('model:haiku')) return 'haiku';
  if (issue.labels.includes('model:opus')) return 'opus';

  // 2. Complexity mapping
  const complexity = issue.labels.find(l => l.startsWith('complexity:'));
  if (complexity === 'complexity:trivial') return 'haiku';
  if (complexity === 'complexity:complex') return 'opus';

  // 3. Pattern detection
  const patterns = {
    haiku: /\b(rename|fix typo|format|lint|scaffold|CRUD)\b/i,
    opus: /\b(architect|security|design system|review)\b/i,
  };

  if (patterns.haiku.test(issue.title)) return 'haiku';
  if (patterns.opus.test(issue.title)) return 'opus';

  // 4. Default to Sonnet
  return 'sonnet';
}
```

### Gastown Integration

Add swarm command for Haiku parallel execution:

```bash
# Create convoy
gt convoy create "User Management" cs-profile cs-settings cs-avatar

# Deploy Haiku swarm
gt swarm deploy convoy-abc --planner=sonnet --executor=haiku --reviewer=opus
```

What happens:
1. Sonnet analyzes convoy, breaks into subtasks
2. Spawns Haiku workers (one per subtask)
3. Workers execute in parallel
4. Opus reviews merged result (if critical)

### Smart Slinging Update

Enhance `gt-smart-sling` to prefer Haiku:

```bash
# Current: routes based on complexity label
gt-smart-sling cs-abc csm

# Enhanced: detects execution vs planning
gt-smart-sling cs-abc csm
# → Reads issue: "Add logout button to header"
# → Pattern match: simple execution task
# → Routes to: Haiku worker
# → Cost: $0.003 (vs $0.03 with Sonnet)
```

## Validation Framework

Track Haiku performance vs Sonnet baseline:

```typescript
interface RoutingExperiment {
  taskId: string;
  description: string;
  modelUsed: 'haiku' | 'sonnet' | 'opus';
  success: boolean;
  cost: number;
  timeToComplete: number;
  qualityScore: number;  // 1-5 subjective rating
  notes: string;
}
```

**Success criteria**: Haiku maintains ≥85% quality on execution tasks while delivering 10x cost savings.

## Migration Strategy

### Phase 1: Experiment (Week 1)

- [ ] Use Haiku for 10 simple file edits
- [ ] Track success rate vs Sonnet baseline
- [ ] Document failures and patterns

### Phase 2: Expand (Week 2-3)

- [ ] Add Haiku routing to smart-slinging
- [ ] Update harness to prefer Haiku for execution
- [ ] Train on pattern recognition (title → model)

### Phase 3: Optimize (Week 4+)

- [ ] Implement pipeline mode (plan → execute → review)
- [ ] Add Gastown swarm commands
- [ ] Automate model selection based on learned patterns

## Anti-Patterns

| Don't Do This | Why | Do This Instead |
|---------------|-----|-----------------|
| Use Haiku for architecture | Lacks deep reasoning | Sonnet or Opus |
| Use Opus for typo fixes | Wasteful ($0.10 vs $0.001) | Haiku |
| Use Sonnet for everything | Missing 90% cost savings | Route by task type |
| Skip planning phase | Haiku needs clear subtasks | Sonnet plans first |
| Over-engineer routing | Premature optimization | Start with labels |

## Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| Haiku success rate | ≥85% | Validates routing quality |
| Cost savings | 25-35% | ROI of optimization |
| Average task cost | <$0.02 | Efficiency indicator |
| Haiku usage % | 40-60% | Most tasks should be execution |
| Routing accuracy | ≥90% | Model selection is correct |

## Philosophical Grounding

### Zuhandenheit (Tool Recedes)

When routing is correct, you don't think about models—you think about tasks. The infrastructure disappears; only the work remains.

### Subtractive Triad

| Level | Principle | Application |
|-------|-----------|-------------|
| **DRY** | One routing logic | Don't duplicate model selection across tools |
| **Rams** | Minimal routing | Only complexity that earns cost savings |
| **Heidegger** | Serve the whole | Routing enables velocity, not just savings |

### Zero Framework Cognition

Don't route by framework ("always use Haiku for X"). Route by reasoning about the task. The decision emerges from the problem, not from hardcoded rules.

## Related Documentation

- [Harness Patterns](./harness-patterns.md) - Single-session orchestration
- [Gastown Patterns](./gastown-patterns.md) - Multi-agent coordination
- [Beads Patterns](./beads-patterns.md) - Issue labeling conventions
