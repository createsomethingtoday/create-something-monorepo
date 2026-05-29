---
description: Classify a system component into Three-Tier Framework tiers (Database, Automation, Judgment)
argument-hint: "<component description>"
---

Load the three-tier-framework skill first, then classify the following component:

**Component**: $@

For each of the three tiers (Database, Automation, Judgment), assign a confidence score (0-100%) and explain why.

Identify any cross-cutting concerns (Touchpoints, Artifacts, Orchestration, Insight).

Output format:

```
## Classification: [component]

| Tier | Confidence | Rationale |
|------|-----------|-----------|
| Database | X% | ... |
| Automation | X% | ... |
| Judgment | X% | ... |

### Cross-Cutting Concerns
- ...

### Primary Tier: [tier] ([confidence]%)
```
