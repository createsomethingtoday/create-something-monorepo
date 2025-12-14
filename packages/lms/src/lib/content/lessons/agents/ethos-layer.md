# The Ethos Layer

## The Principle

**Health monitoring and self-correction.**

Agents without guidance are dangerous. They optimize for local goals without understanding the whole. The ethos layer provides the values, constraints, and health checks that keep agents aligned.

## What is Ethos?

Ethos is the character or guiding beliefs of an organization. For agents, it's the configuration that answers:

- **What do we value?** (Principles)
- **What are our limits?** (Constraints)
- **How do we know we're healthy?** (Health checks)
- **What patterns should we follow?** (Norms)

## Ethos Structure

```typescript
interface Ethos {
  principles: Principle[];
  constraints: Constraint[];
  health_checks: HealthCheck[];
  norms: Norm[];
}

interface Principle {
  name: string;
  description: string;
  weight: number;  // Relative importance
}

interface Constraint {
  name: string;
  rule: string;           // What's not allowed
  consequence: string;    // What happens if violated
  severity: 'warning' | 'error' | 'fatal';
}

interface HealthCheck {
  name: string;
  query: string;          // How to measure
  threshold: number;
  direction: 'above' | 'below';
}

interface Norm {
  pattern: string;
  description: string;
  examples: string[];
}
```

## Example: CREATE SOMETHING Ethos

```yaml
# ethos.yaml

principles:
  - name: Subtractive Creation
    description: Remove what doesn't serve the whole
    weight: 1.0

  - name: Tool Transparency
    description: Tools should recede into use
    weight: 0.8

  - name: Honest Documentation
    description: Document what is, not what should be
    weight: 0.7

constraints:
  - name: No Magic Numbers
    rule: All numeric constants must have named references
    consequence: PR will be rejected
    severity: error

  - name: No Breaking Changes
    rule: Public APIs must be backwards compatible
    consequence: Major version bump required
    severity: error

  - name: No Secrets in Code
    rule: Credentials must use environment variables
    consequence: Immediate security review
    severity: fatal

health_checks:
  - name: Test Coverage
    query: SELECT coverage_percent FROM metrics ORDER BY date DESC LIMIT 1
    threshold: 80
    direction: above

  - name: Open Bug Count
    query: SELECT COUNT(*) FROM issues WHERE type='bug' AND status='open'
    threshold: 10
    direction: below

  - name: PR Review Time
    query: SELECT AVG(hours_to_review) FROM pull_requests WHERE merged_at > now() - interval '7 days'
    threshold: 24
    direction: below

norms:
  - pattern: Component Naming
    description: Components use PascalCase, files match component name
    examples:
      - Button.svelte exports Button
      - UserProfile.svelte exports UserProfile

  - pattern: Error Handling
    description: All async operations use try/catch with meaningful errors
    examples:
      - try { await fetch() } catch (err) { console.error('API failed:', err) }
```

## Health Monitoring

The ethos layer continuously monitors system health:

```typescript
async function checkHealth(ethos: Ethos): Promise<HealthReport> {
  const results: HealthResult[] = [];

  for (const check of ethos.health_checks) {
    const value = await runQuery(check.query);
    const healthy = check.direction === 'above'
      ? value >= check.threshold
      : value <= check.threshold;

    results.push({
      name: check.name,
      value,
      threshold: check.threshold,
      healthy,
      direction: check.direction
    });
  }

  return {
    timestamp: new Date(),
    overall: results.every(r => r.healthy),
    results
  };
}
```

### Health Dashboard

```bash
$ bd health

📊 System Health Report

✓ Test Coverage: 87% (threshold: 80%)
✓ Open Bug Count: 7 (threshold: 10)
⚠ PR Review Time: 28h (threshold: 24h)
  └ Consider reducing PR size or adding reviewers

Overall: HEALTHY (with warnings)
```

## Constraint Enforcement

Agents check constraints before actions:

```typescript
async function validateAction(action: Action, ethos: Ethos): Promise<ValidationResult> {
  const violations: Violation[] = [];

  for (const constraint of ethos.constraints) {
    if (await violates(action, constraint)) {
      violations.push({
        constraint: constraint.name,
        severity: constraint.severity,
        message: constraint.consequence
      });
    }
  }

  // Fatal violations stop immediately
  if (violations.some(v => v.severity === 'fatal')) {
    return { allowed: false, violations, action: 'halt' };
  }

  // Errors require human approval
  if (violations.some(v => v.severity === 'error')) {
    return { allowed: false, violations, action: 'request_approval' };
  }

  // Warnings are logged but allowed
  if (violations.some(v => v.severity === 'warning')) {
    return { allowed: true, violations, action: 'log_warning' };
  }

  return { allowed: true, violations: [], action: 'proceed' };
}
```

## Self-Correction

When health degrades, the ethos layer can trigger corrective actions:

```typescript
async function triggerCorrections(report: HealthReport, ethos: Ethos): Promise<void> {
  for (const result of report.results) {
    if (!result.healthy) {
      const correction = await determineCorrection(result, ethos);

      if (correction) {
        console.log(`Health issue: ${result.name}`);
        console.log(`Correction: ${correction.description}`);

        if (correction.automatic) {
          await executeCorrection(correction);
        } else {
          await createIssue({
            title: `Health: ${result.name} below threshold`,
            description: correction.description,
            priority: 1,
            type: 'task',
            labels: ['health', 'auto-created']
          });
        }
      }
    }
  }
}
```

### Correction Examples

| Health Issue | Automatic Correction |
|--------------|---------------------|
| Test coverage dropped | Create issue to add tests |
| Bug count increasing | Bump bug-fix priority |
| PR review slow | Notify reviewers, suggest PR splits |
| Build time increasing | Flag for optimization |

## Ethos in Agent Decisions

Agents consult ethos for guidance:

```typescript
async function makeDecision(options: Option[], ethos: Ethos): Promise<Option> {
  // Score options against principles
  const scored = options.map(option => {
    let score = option.baseScore;

    for (const principle of ethos.principles) {
      const alignment = assessAlignment(option, principle);
      score += alignment * principle.weight;
    }

    return { option, score };
  });

  // Filter by constraints
  const valid = scored.filter(s =>
    ethos.constraints.every(c => !violates(s.option, c))
  );

  // Return highest-scoring valid option
  return valid.sort((a, b) => b.score - a.score)[0]?.option;
}
```

## Ethos Evolution

Ethos isn't static—it evolves:

```typescript
interface EthosChange {
  type: 'add' | 'modify' | 'remove';
  category: 'principle' | 'constraint' | 'health_check' | 'norm';
  before?: any;
  after?: any;
  rationale: string;
  approved_by: string;
  approved_at: Date;
}

// All ethos changes are tracked
async function proposeEthosChange(change: EthosChange): Promise<void> {
  // Changes require human approval
  await createIssue({
    title: `Ethos: ${change.type} ${change.category}`,
    description: `
Rationale: ${change.rationale}

Before:
${JSON.stringify(change.before, null, 2)}

After:
${JSON.stringify(change.after, null, 2)}
    `,
    type: 'epic',
    labels: ['ethos-change', 'needs-approval']
  });
}
```

## Ethos for CREATE SOMETHING

The CREATE SOMETHING ethos includes:

### Principles
1. **Subtractive Creation** → Remove what doesn't serve
2. **Tool Transparency** → Tools should recede
3. **Honest Documentation** → Document reality
4. **Hermeneutic Spiral** → Understanding through iteration

### Constraints
1. **Canon for Aesthetics** → Design tokens, not Tailwind colors
2. **No New Dependencies** → Without explicit approval
3. **Session Boundaries** → Commit and sync before close

### Health Checks
1. **Triad Audit Score** → Must pass DRY/Rams/Heidegger
2. **Documentation Freshness** → Updated within 30 days
3. **Test Coverage** → Above 80%

### Norms
1. **Naming Conventions** → Canon-aligned patterns
2. **File Structure** → SvelteKit conventions
3. **Commit Messages** → Action-oriented, scoped

## The Ethical Dimension

Ethos isn't just configuration—it's ethics:

- **Principles** encode values
- **Constraints** prevent harm
- **Health checks** measure alignment
- **Norms** embody culture

Agents without ethos are optimizers without conscience. The ethos layer makes agents trustworthy.

**Ethos is how organizations scale their values.**

---

## Reflection

Before the praxis:

1. What values would you encode in an ethos layer?
2. What constraints would prevent the most harm?
3. How would you measure organizational health?

**Praxis**: Configure an ethos layer for your project.

---

## Cross-Property References

> **Canon Reference**: The ethos layer operationalizes [The Ethos](https://createsomething.ltd/ethos)—embedding organizational values into agent behavior.
>
> **Canon Reference**: Health constraints reflect [Constraint as Liberation](https://createsomething.ltd/patterns/constraint-as-liberation)—boundaries that protect rather than restrict.
>
> **Practice**: Study the Canon Maintenance skill (`.claude/skills/canon-maintenance.md`) for how values manifest in agent guidance.
