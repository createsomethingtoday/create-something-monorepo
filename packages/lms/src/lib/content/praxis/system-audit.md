# System Audit

## Objective

Evaluate how a set of properties forms a coherent system using the Subtractive Triad.

## Context

You're auditing the CREATE SOMETHING ecosystem to assess its hermeneutic coherence. This is the capstone exercise—applying everything you've learned.

## The System

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREATE SOMETHING                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │    .ltd     │    │    .io      │    │   .space    │         │
│  │ Philosophy  │───►│  Research   │───►│  Practice   │         │
│  │ (Canon)     │    │  (Papers)   │    │ (Learning)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         │                  │                  │                 │
│         │           ┌──────┴──────┐           │                 │
│         │           │   .agency   │           │                 │
│         └──────────►│  Services   │◄──────────┘                 │
│                     │  (Clients)  │                             │
│                     └─────────────┘                             │
│                            │                                    │
│                            ▼                                    │
│                     ┌─────────────┐                             │
│                     │   Learn     │                             │
│                     │    (LMS)    │                             │
│                     └─────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Task

Conduct a complete system audit using all three levels of the Subtractive Triad.

---

## Level 1: DRY Audit (Implementation)

**Question**: "Is there duplication across properties?"

### Component Duplication

| Component | .ltd | .io | .space | .agency | .lms | Finding |
|-----------|------|-----|--------|---------|------|---------|
| Navigation | ? | ? | ? | ? | ? | |
| Footer | ? | ? | ? | ? | ? | |
| Card | ? | ? | ? | ? | ? | |
| Typography | ? | ? | ? | ? | ? | |
| Button | ? | ? | ? | ? | ? | |

**Assessment questions**:
1. Are shared components in `packages/components/`?
2. Are there property-specific copies that should be unified?
3. Is there justified divergence or accidental duplication?

### Pattern Duplication

| Pattern | Where Duplicated | Should Unify? |
|---------|-----------------|---------------|
| API error handling | | |
| Authentication | | |
| Data fetching | | |
| Form validation | | |
| Analytics tracking | | |

### DRY Verdict

**Duplication Score**: ___ / 10 (10 = no duplication)

**Top 3 Unification Opportunities**:
1.
2.
3.

---

## Level 2: Rams Audit (Artifact)

**Question**: "Does each property earn its existence?"

### Property Justification

| Property | Purpose | Unique Value | Earns Existence? |
|----------|---------|--------------|------------------|
| .ltd | Philosophy/Canon | | Yes / No / Partially |
| .io | Research/Papers | | Yes / No / Partially |
| .space | Practice/Learning | | Yes / No / Partially |
| .agency | Client Services | | Yes / No / Partially |
| Learn (LMS) | Education | | Yes / No / Partially |

**For each "Partially" or "No"**:
- What would need to change for it to earn existence?
- Could it be merged with another property?
- Is the separation justified by different audiences?

### Feature Justification

For each property, identify 3 features and evaluate:

**.ltd Features**:
| Feature | Purpose | Earns Existence? | Notes |
|---------|---------|------------------|-------|
| Principles page | | Yes / No | |
| Patterns page | | Yes / No | |
| Masters page | | Yes / No | |

**.io Features**:
| Feature | Purpose | Earns Existence? | Notes |
|---------|---------|------------------|-------|
| Papers | | Yes / No | |
| Experiments | | Yes / No | |
| Newsletter | | Yes / No | |

**.space Features**:
| Feature | Purpose | Earns Existence? | Notes |
|---------|---------|------------------|-------|
| Terminal | | Yes / No | |
| Praxis | | Yes / No | |
| Methodology | | Yes / No | |

### Rams Verdict

**Artifact Score**: ___ / 10 (10 = nothing excess)

**Elements to Remove or Simplify**:
1.
2.
3.

---

## Level 3: Heidegger Audit (System)

**Question**: "Does each part serve the whole?"

### Hermeneutic Circle Analysis

The circle should flow: `.ltd → .io → .space → .agency → .ltd`

| Transition | How It Works | Strength (1-5) |
|------------|--------------|----------------|
| .ltd → .io | Philosophy informs research | |
| .io → .space | Research becomes practice | |
| .space → .agency | Practice enables services | |
| .agency → .ltd | Services evolve philosophy | |
| Learn → All | Education supports all modes | |

**Gaps in the circle**:
-
-

### Cross-Property Navigation

| User Journey | Properties Involved | Friction Points |
|--------------|--------------------|-----------------|
| "Learn the principles" | ltd → space | |
| "See research in action" | io → agency | |
| "Apply learning to work" | space → agency | |
| "Understand the philosophy" | any → ltd | |

### System Coherence

| Aspect | Score (1-5) | Evidence |
|--------|-------------|----------|
| Visual consistency | | |
| Navigation clarity | | |
| Content organization | | |
| Cross-linking | | |
| Shared vocabulary | | |

### Heidegger Verdict

**System Score**: ___ / 10 (10 = perfect coherence)

**Reconnection Opportunities**:
1.
2.
3.

---

## Synthesis

### Overall System Health

| Level | Score | Priority Actions |
|-------|-------|------------------|
| DRY (Implementation) | /10 | |
| Rams (Artifact) | /10 | |
| Heidegger (System) | /10 | |
| **Total** | **/30** | |

### Top 5 Recommendations

Prioritize by impact and effort:

| # | Recommendation | Level | Impact | Effort |
|---|---------------|-------|--------|--------|
| 1 | | | High/Med/Low | High/Med/Low |
| 2 | | | High/Med/Low | High/Med/Low |
| 3 | | | High/Med/Low | High/Med/Low |
| 4 | | | High/Med/Low | High/Med/Low |
| 5 | | | High/Med/Low | High/Med/Low |

### Action Plan

**Immediate** (This week):
-

**Short-term** (This month):
-

**Long-term** (This quarter):
-

---

## Success Criteria

- [ ] All three Triad levels applied systematically
- [ ] Each property evaluated for existence justification
- [ ] Hermeneutic circle mapped with gap analysis
- [ ] Cross-property navigation friction identified
- [ ] Concrete, prioritized recommendations provided
- [ ] Action plan spans immediate to long-term

## Reflection

After completing this audit:
1. How does applying the Triad at the system level differ from component level?
2. What surprised you about the system's coherence (or lack thereof)?
3. How would you maintain system integrity as it evolves?

**A system is more than its parts—it's the relationships between them. Audit the relationships, not just the parts.**
