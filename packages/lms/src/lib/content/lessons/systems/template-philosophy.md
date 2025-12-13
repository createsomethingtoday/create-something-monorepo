# Template Philosophy

## The Principle

**Templates as compressed understanding.**

A template is not a starting point. It's compressed knowledge—every decision, every pattern, every constraint made visible and reusable.

## What Templates Are Not

### Not Boilerplate

Boilerplate is code you copy and modify:
- No embedded wisdom
- No constraints
- No learning transfer
- Just "something to start with"

### Not Themes

Themes are aesthetic choices:
- Colors and fonts
- Layout options
- Visual variations
- Surface without structure

### Not Frameworks

Frameworks are abstractions:
- Generic solutions
- Many configuration options
- Flexibility over opinion
- Complexity as feature

## What Templates Are

Templates are **captured decisions**:

```
Problem Space              →    Template    →    Deployed Solution
(client needs)                  (encoded         (configured
                                wisdom)          instance)
```

Every template encodes:
- **Why** certain patterns work for this vertical
- **What** elements are essential vs. optional
- **How** components should compose
- **When** constraints should apply

**A template is a conversation with the practitioner who created it.**

## The Subtractive Triad for Templates

### DRY: Have We Built This Before?

Most client work falls into patterns:
- Professional services sites share structure
- E-commerce has common flows
- Dashboards repeat layouts
- Marketing pages follow conventions

Templates unify this repeated work:

```markdown
Without templates:
- Client A: Build portfolio from scratch (40 hours)
- Client B: Build portfolio from scratch (40 hours)
- Client C: Build portfolio from scratch (40 hours)
Total: 120 hours, three implementations to maintain

With templates:
- Template: Build once, encode patterns (60 hours)
- Client A: Configure template (4 hours)
- Client B: Configure template (4 hours)
- Client C: Configure template (4 hours)
Total: 72 hours, one implementation to maintain
```

**Templates eliminate duplication across engagements.**

### Rams: Does Each Element Earn Its Existence?

Templates force artifact-level discipline:

```markdown
Template review:
- Hero section? Yes—establishes identity
- About section? Yes—builds trust
- Services grid? Yes—communicates offering
- Blog? No—most clients won't maintain it
- Newsletter popup? No—degrades experience
- Animated background? No—distraction

Result: 3 core sections, not 10 optional ones
```

**If it doesn't earn its place in the template, it doesn't exist.**

### Heidegger: Does This Serve the Whole?

Templates must connect to the larger system:

```markdown
Questions:
- Does this template teach CREATE SOMETHING principles?
- Will deployed instances maintain the ethos?
- Does configuration enable or constrain expression?
- How does this template relate to other templates?
```

**Templates are not standalone—they're nodes in the knowledge system.**

## Template Anatomy

A well-designed template has layers:

### 1. Structure (Unchangeable)

Core architecture that defines the template:
- Route structure
- Data flow patterns
- Component relationships
- Security boundaries

**Structure is NOT configurable. Change structure = different template.**

### 2. Configuration (Declarative)

What clients can customize through data:
- Company name and tagline
- Color accents
- Content blocks
- Feature toggles

**Configuration is declarative—no code required.**

### 3. Extension (Code-Level)

What developers can add:
- New page types
- Custom components
- Integration hooks
- Advanced features

**Extension requires code but follows template patterns.**

```
┌─────────────────────────────────────────────────────┐
│                    Structure                        │
│                  (unchangeable)                     │
│  ┌─────────────────────────────────────────────┐   │
│  │               Configuration                  │   │
│  │               (declarative)                  │   │
│  │  ┌───────────────────────────────────────┐  │   │
│  │  │             Extension                  │  │   │
│  │  │            (code-level)                │  │   │
│  │  └───────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Configuration as Constraint

Good templates constrain wisely:

### Bad Constraint (Arbitrary)

```typescript
// Why 4? What if client has 5 services?
config: {
  services: { max: 4 }
}
```

### Good Constraint (Principled)

```typescript
// Grid works in 2x2. More than 4 = different pattern
config: {
  services: {
    max: 4,
    reason: "Grid layout optimized for 4. More requires list view."
  }
}
```

### Liberating Constraint

```typescript
// Constrain format, not content
config: {
  heroImage: {
    aspectRatio: "16:9",
    minWidth: 1920,
    reason: "Consistent visual rhythm across all deployments"
  }
}
```

**Constraints should teach, not restrict.**

## Template Evolution

Templates evolve through use:

### Version 1: Initial Patterns

Built from first client engagement:
- Core structure
- Basic configuration
- Essential components

### Version 2: Learning Integration

After 3-5 deployments:
- Edge cases handled
- Configuration refined
- Common customizations built-in

### Version 3: Wisdom Encoding

After 10+ deployments:
- Patterns are proven
- Constraints are battle-tested
- Extensions are documented

**Every deployment teaches the template something.**

## The Template Platform Concept

Templates become a platform when:

1. **Deployment is Self-Serve**
   - Non-technical users can deploy
   - Configuration through forms
   - Preview before publish

2. **Updates Flow Downstream**
   - Template improvements reach deployed instances
   - Security patches apply automatically
   - Breaking changes are opt-in

3. **Knowledge Accumulates**
   - Usage patterns inform development
   - Common requests become features
   - The platform learns from its users

```
Template Development → Template Platform → Client Deployments
        ↑                                          │
        └──────────── Learning Loop ───────────────┘
```

## Anti-Patterns

### The Everything Template

```markdown
❌ "Our template supports any use case"

Result: Complex configuration, no constraints, no wisdom
```

### The Locked Template

```markdown
❌ "Our template cannot be modified"

Result: Clients fork, updates don't flow, template dies
```

### The Orphan Template

```markdown
❌ "We built the template and moved on"

Result: No evolution, no learning, stagnation
```

### The Themeable Template

```markdown
❌ "Choose from 50 color schemes and 20 layouts"

Result: Configuration as overhead, decision fatigue
```

## Template as Teacher

The best templates teach:

```markdown
Configuration with context:
{
  "heroSection": {
    "type": "minimal",
    "options": ["minimal", "image", "video"],
    "recommendation": "minimal",
    "rationale": "Minimal heroes convert 23% better in professional services"
  }
}
```

Every configuration option explains *why* it exists and what the recommended choice is.

**Templates should make clients smarter about their own decisions.**

---

## Reflection

Before moving on:

1. What patterns repeat across your recent projects?
2. What constraints would make those patterns better?
3. How would you encode your wisdom into a template?

**Templates are not shortcuts—they're crystallized expertise.**
