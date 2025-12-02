# Canon Maintenance

Maintain and enforce CREATE SOMETHING's design canon based on the Subtractive Triad.

## Philosophy

**"Weniger, aber besser"** — Less, but better.

Creation is the discipline of removing what obscures. This skill operationalizes the full Subtractive Triad—not just Rams, but all three levels.

## The Subtractive Triad

Every audit applies three questions in order:

| Level | Discipline | Question | Action | Failure Mode |
|-------|------------|----------|--------|--------------|
| **Implementation** | DRY | "Have I built this before?" | Unify | Duplication |
| **Artifact** | Rams | "Does this earn its existence?" | Remove | Decoration |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect | Disconnection |

**Order matters**: DRY before Rams before Heidegger. You cannot reconnect what hasn't been pruned.

## Rams' 10 Principles (Artifact Level)

When evaluating whether something "earns its existence":

1. **Innovative** — Does it advance the solution?
2. **Useful** — Does it solve a real problem?
3. **Aesthetic** — Is form a consequence of function?
4. **Understandable** — Is purpose self-evident?
5. **Unobtrusive** — Does the tool recede?
6. **Honest** — Does it promise only what it delivers?
7. **Long-lasting** — Will this age well?
8. **Thorough** — Is every detail considered?
9. **Environmentally conscious** — Is it resource-efficient?
10. **As little design as possible** — Can anything be removed?

**The capstone**: Principle 10 subsumes the others. If you can remove it without losing function, remove it.

## The Hermeneutic Test (System Level)

Before any artifact ships, it must answer:

1. **Does this part reveal the whole?**
   - Can someone read this and understand what CREATE SOMETHING stands for?
   - Does it embody "less, but better"?

2. **Does the whole explain this part?**
   - Can you trace this decision to a canonical principle?
   - Does it connect to .ltd standards?

3. **Does this strengthen the circle?**
   - Does it feed back to validate or evolve the canon?
   - Does it make the ecosystem more coherent?

## Property-Specific Standards

### .ltd (Canon)
- Every element must justify its existence
- Purpose immediately clear without explanation
- Metrics accurate, claims verifiable, failures documented
- Build for years, not quarters

### .io (Research)
- Every paper must be **useful** (not interesting, not novel—useful)
- Findings reproducible, methodology transparent
- Writing serves the reader: clarity over cleverness
- Connect theory to the lineage (cite .ltd principles)

### .space (Practice)
- Every experiment must teach a **principle**, not just a technique
- Interfaces minimal: zero decoration, only essential feedback
- Success is completion, not clicks
- Link to .io for depth, to .ltd for philosophy

### .agency (Services)
- Delivered work meets canonical standards—no shortcuts
- Solutions solve problems, not features for features' sake
- Documentation complete, code readable
- Future maintainers are users too

## Patterns to Embrace

1. **Constraint as Liberation** — Limitation breeds creativity
2. **Functional Transparency** — How it works should be evident
3. **Iterative Reduction** — Start complex, remove relentlessly
4. **Universal Utility** — "The best for the most for the least" (Eames)
5. **Timeless Materials** — Choose what ages well
6. **Negative Space** — What you don't build matters
7. **Tool Complementarity** — Tools should not compete for same ontological space
8. **Dwelling in Tools** — Build habits that make tools transparent (Zuhandenheit)
9. **Principled Defaults** — Every configuration value traces to a principle
10. **Subtractive Triad Audit** — Apply DRY → Rams → Heidegger

## Anti-Patterns to Remove

- **Feature Creep** — Adding because you can
- **Decorative Complexity** — Ornamentation serving ego
- **Trend Chasing** — Adopting because popular
- **Premature Abstraction** — Building for hypothetical futures
- **Metric Vanity** — Optimizing engagement over utility
- **Dishonest Documentation** — Hiding limitations
- **Tool Redundancy** — Multiple tools for same task

## Audit Workflow

### 1. DRY Pass (Implementation)

```bash
# Run duplication detection
pnpm --filter=triad-audit exec npm run audit -- --collectors=dry
```

Questions:
- Are there duplicated patterns that should be unified?
- Is there copy-paste code that should be abstracted?
- Are shared utilities in the right place (packages/components)?

### 2. Rams Pass (Artifact)

```bash
# Run dead code and unused dependency detection
pnpm --filter=triad-audit exec npm run audit -- --collectors=rams
```

Questions for each element:
- Does this earn its existence?
- Can I remove it without losing function?
- Is this decoration or function?

### 3. Heidegger Pass (System)

```bash
# Run circular dependency and orphan detection
pnpm --filter=triad-audit exec npm run audit -- --collectors=heidegger
```

Questions:
- Does this serve the whole ecosystem?
- Is it connected to the hermeneutic circle?
- Does it strengthen or weaken property relationships?

## Masters to Cite

When justifying decisions, trace to canonical sources:

| Master | Principle | Domain |
|--------|-----------|--------|
| **Dieter Rams** | 10 Principles, "Less, but better" | Industrial Design |
| **Mies van der Rohe** | "Less is more", "God is in the details" | Architecture |
| **Charles & Ray Eames** | "The best for the most for the least" | Furniture/Film |
| **Edward Tufte** | "Above all else show the data" | Information Design |
| **Heidegger** | Zuhandenheit, Hermeneutic Circle | Philosophy |

## Evaluation Checklist

Before shipping:

- [ ] Can I remove anything without losing function?
- [ ] Will this be clear to someone unfamiliar?
- [ ] Are the metrics honest and verifiable?
- [ ] Will this still be useful in 5 years?
- [ ] Does it align with at least one canonical principle?
- [ ] Can I trace every decision to a master's wisdom?

## When to Use

- **Before shipping** any user-facing work
- **During review** of PRs and implementations
- **When auditing** existing code for improvement
- **When defining** new standards or patterns
- **When questioning** whether something belongs

## Integration

This skill connects to:
- `voice-validator` — Validates content against voice guidelines
- `subtractive-review` — Applies triad as code review
- `triad-audit` package — Automated analysis tooling

## Reference

- `.ltd/ethos` — Full philosophical foundation
- `.ltd/voice` — Communication principles
- `.ltd/standards` — Property-specific criteria
- `.ltd/patterns` — Implementation patterns
