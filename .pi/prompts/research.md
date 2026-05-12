---
description: Multi-turn research session for a createsomething.io paper
argument-hint: "<topic>"
---

# Research: $@

Conduct a structured research session on "$@" for a createsomething.io paper.

## Research Philosophy

CREATE SOMETHING publishes research at the intersection of:
- Phenomenology (Heidegger, Merleau-Ponty)
- Design philosophy (Dieter Rams, Christopher Alexander)
- Software craft (DRY, SOLID, functional programming)

## The Five Steps

### Step 1: Initial Exploration
1. What is the core phenomenon?
2. What existing literature/work exists? (Use `context7_query` for technical topics)
3. What's the CREATE SOMETHING angle?
4. What tensions or questions emerge?

### Step 2: Concept Mapping
1. Define 3-5 core concepts
2. Identify relationships between them
3. Note philosophical foundations (Heidegger, Rams, etc.)
4. Flag areas needing deeper investigation

### Step 3: CREATE SOMETHING Integration
1. Check `packages/io/src/routes/papers/` for related papers
2. Check `packages/ltd/src/routes/patterns/` for related patterns
3. Identify how this extends or challenges existing work

### Step 4: Original Insights
1. What new understanding emerges?
2. What practical implications exist?
3. What's the "less, but better" takeaway?
4. How does this serve the whole system?

### Step 5: Paper Outline
```
1. Title (compelling, precise)
2. Abstract (2-3 sentences)
3. Introduction (phenomenon + question)
4. Background (philosophical grounding)
5. Analysis (original contribution)
6. Practical Applications
7. Conclusion (the insight)
```

## Output

Produce a complete paper outline with section content notes. When ready, use `/paper <slug>` to scaffold the route.
