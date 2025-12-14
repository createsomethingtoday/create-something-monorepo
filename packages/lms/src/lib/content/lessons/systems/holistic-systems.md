# Holistic Systems

## The Principle

**The hermeneutic circle of interconnected properties.**

CREATE SOMETHING is not a collection of websites. It's a system where each property serves the whole, and the whole gives meaning to each property.

## The Hermeneutic System

```
                    ┌─────────────┐
                    │    .ltd     │
                    │ (Philosophy)│
                    └──────┬──────┘
                           │ criteria
                           ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   .space    │←───│    .io      │←───│   .agency   │
│ (Practice)  │    │ (Research)  │    │  (Services) │
└──────┬──────┘    └─────────────┘    └──────┬──────┘
       │                                      │
       └──────────── tests & evolves ─────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    .ltd     │
                    │ (evolved)   │
                    └─────────────┘
```

Each property has a role:
- **.ltd**: Defines the philosophical foundation (What we believe)
- **.io**: Publishes research and documentation (What we've learned)
- **.space**: Provides practice environments (How to learn)
- **.agency**: Delivers client services (How we apply)

**The circle is not static—it evolves through use.**

## System Coherence

### Shared Foundation

All properties share:

```typescript
// packages/components/
// Shared UI components that embody Canon
import { Navigation, Footer, Card } from '@create-something/components';

// packages/cloudflare-sdk/
// Shared infrastructure patterns
import { cf } from '@create-something/cloudflare-sdk';

// Shared design tokens (Canon CSS)
// Applied consistently across all properties
```

### Distinct Expression

Each property expresses the foundation differently:

```markdown
.ltd → Philosophical, authoritative, sparse
- Minimal navigation
- Long-form content
- No interactivity

.io → Research, documentation, reference
- Structured navigation
- Papers and experiments
- Interactive examples

.space → Learning, practice, experimentation
- Progressive disclosure
- Praxis exercises
- Personal progress

.agency → Professional, service-oriented, action-focused
- Clear CTAs
- Case studies
- Contact pathways
```

## Cross-Property Navigation

Users move between properties based on needs:

```
User Intent              →  Property  →  Next Step

"What do they believe?"  →  .ltd      →  .io (deep dive)
"How does this work?"    →  .io       →  .space (practice)
"Can I learn this?"      →  .space    →  .agency (apply professionally)
"Can they help me?"      →  .agency   →  .ltd (verify alignment)
```

### The Mode Indicator

```svelte
<!-- All properties show current mode -->
<ModeIndicator
  currentMode="learn"
  modes={[
    { id: 'create', label: 'create', url: 'https://createsomething.space' },
    { id: 'research', label: 'research', url: 'https://createsomething.io' },
    { id: 'learn', label: 'learn', url: 'https://learn.createsomething.space' },
    { id: 'canon', label: 'canon', url: 'https://createsomething.ltd' },
    { id: 'work', label: 'work', url: 'https://createsomething.agency' },
  ]}
/>
```

### Cross-Property Links

```svelte
<!-- Reference from .space to .ltd canon -->
<CrossPropertyLink
  property="ltd"
  path="/principles/subtractive-revelation"
  label="Subtractive Revelation"
/>

<!-- Reference from .agency to .io research -->
<CrossPropertyLink
  property="io"
  path="/papers/hermeneutic-spiral-ux"
  label="Hermeneutic Spiral UX"
/>
```

## Data Flow Across Properties

### Shared Data

Some data spans properties:

```typescript
// User identity (if logged in)
interface User {
  id: string;
  email: string;
  properties: {
    space?: { progress: Progress };
    agency?: { projects: Project[] };
  };
}

// Analytics flow to central collection
await analytics.track({
  event: 'page_view',
  property: 'space',
  path: '/praxis/triad-audit'
});
```

### Property Isolation

Most data stays within properties:

```
.space D1 (createsomething-space-db)
├── learner_progress
├── praxis_submissions
└── content_metadata

.io D1 (createsomething-io-db)
├── papers
├── experiments
└── subscriber_list

.agency D1 (createsomething-agency-db)
├── leads
├── projects
└── contact_submissions
```

**Share identity. Isolate domain data.**

## Content Flow

Content moves through the system:

```
Research            →  Publish    →  Teach      →  Apply
(Internal work)        (.io)         (.space)      (.agency)

Example flow:
1. Develop automation pattern (internal)
2. Document in paper (io/papers/automation-patterns)
3. Create lesson (space/systems/automation-patterns)
4. Apply to client work (agency engagement)
5. Learn from application → improve pattern (cycle)
```

### Content Types by Property

```markdown
.ltd: Principles, patterns, standards
- Eternal truths
- Rarely updated
- Authoritative voice

.io: Papers, experiments, documentation
- Research findings
- Experiment results
- Technical references

.space: Lessons, praxis, exercises
- Learning content
- Interactive exercises
- Progressive difficulty

.agency: Case studies, services, work examples
- Client outcomes
- Service descriptions
- Professional portfolio
```

## System Health

### Property Health Checks

```typescript
// Each property reports its health
interface PropertyHealth {
  property: string;
  status: 'healthy' | 'degraded' | 'down';
  checks: {
    database: HealthStatus;
    cache: HealthStatus;
    deployment: HealthStatus;
  };
  lastUpdated: Date;
}

// Central dashboard aggregates
async function getSystemHealth(): Promise<SystemHealth> {
  const properties = ['ltd', 'io', 'space', 'agency'];

  const health = await Promise.all(
    properties.map(p => fetchPropertyHealth(p))
  );

  return {
    overall: deriveOverallStatus(health),
    properties: health,
    crossConnections: checkCrossPropertyLinks()
  };
}
```

### Cross-Property Monitoring

```typescript
// Verify links between properties work
async function checkCrossPropertyLinks(): Promise<LinkHealth[]> {
  const links = [
    { from: 'space', to: 'ltd', path: '/principles/subtractive-revelation' },
    { from: 'agency', to: 'io', path: '/papers/hermeneutic-spiral-ux' },
    // ... more links
  ];

  return Promise.all(
    links.map(async link => ({
      ...link,
      status: await checkLink(link)
    }))
  );
}
```

## Evolution Patterns

### Adding a New Property

When the system needs expansion:

```markdown
1. Identify the gap
   - What user need isn't being served?
   - Does it justify a new property or fit existing?

2. Define the role
   - What's its relationship to existing properties?
   - How does it participate in the hermeneutic circle?

3. Build incrementally
   - Shared infrastructure first
   - Minimal viable property
   - Connect to existing properties

4. Validate through use
   - Does it serve its intended purpose?
   - Does it strengthen the whole?
```

### Evolving Existing Properties

```markdown
Signals that a property needs evolution:
- Users bounce between properties to complete a task
- Content doesn't fit cleanly in any property
- Navigation patterns show confusion

Evolution process:
1. Map current user journeys
2. Identify friction points
3. Propose structural changes
4. Validate against Subtractive Triad
5. Implement incrementally
```

## The Meta-System

CREATE SOMETHING itself is managed by CREATE SOMETHING:

```markdown
.ltd defines → how we think about the system
.io documents → how the system works
.space teaches → how to work with the system
.agency applies → the system to client work

The system builds the system.
```

### Agent Coordination

Agents work across the system:

```typescript
// Agent task might span properties
const task = {
  id: 'update-canon-tokens',
  steps: [
    { property: 'components', action: 'Update token definitions' },
    { property: 'ltd', action: 'Document changes' },
    { property: 'space', action: 'Update lessons' },
    { property: 'io', action: 'Publish paper on evolution' }
  ]
};
```

### Continuous Integration

Changes flow through the system:

```yaml
# GitHub Actions workflow
on:
  push:
    paths:
      - 'packages/components/**'

jobs:
  propagate:
    steps:
      - name: Build components
        run: pnpm --filter=components build

      - name: Test all properties
        run: pnpm test

      - name: Deploy affected properties
        run: |
          pnpm --filter=ltd deploy
          pnpm --filter=io deploy
          pnpm --filter=space deploy
          pnpm --filter=agency deploy
```

## System Integrity

### Integrity Checks

```typescript
// Verify system coherence
async function auditSystemIntegrity(): Promise<IntegrityReport> {
  return {
    // All properties use same component versions
    componentVersions: await checkComponentVersions(),

    // Canon tokens are consistent
    tokenConsistency: await checkTokenConsistency(),

    // Cross-links resolve
    linkIntegrity: await checkCrossPropertyLinks(),

    // Content references are valid
    contentReferences: await checkContentReferences(),

    // User journey completion
    journeyCompleteness: await checkUserJourneys()
  };
}
```

### Principle Alignment

Every system change should be validated:

```markdown
Change: Add newsletter to .space

DRY Check:
- Does .io already have newsletter? Yes
- Can we share the implementation? Yes → use shared component

Rams Check:
- Does newsletter earn existence on .space?
- Is it for learning updates (yes) or marketing (no)?
- Decision: Only if opt-in is part of learning journey

Heidegger Check:
- How does this serve the whole system?
- Does it strengthen the connection between properties?
- Does it serve the user's journey?
```

---

## Reflection

Before completing this path:

1. How do the properties you build relate to each other?
2. What would it mean for your systems to form a hermeneutic circle?
3. How would you know if your system is coherent or fragmented?

**A system is more than its parts. It's the relationships between them.**

---

## Cross-Property References

> **Canon Reference**: The hermeneutic circle of properties embodies the [Ethos](https://createsomething.ltd/ethos)—the complete philosophical foundation of CREATE SOMETHING.
>
> **Canon Reference**: System integrity reflects [Subtractive Triad Audit](https://createsomething.ltd/patterns/subtractive-triad-audit)—applying DRY → Rams → Heidegger to every change.
>
> **Research Depth**: Study the [CREATE SOMETHING architecture](packages/UNDERSTANDING.md) for how the monorepo properties relate to each other.
