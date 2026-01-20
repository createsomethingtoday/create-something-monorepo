# Subtractive Triad Audit

A Claude Code skill for systematic code reduction using the Subtractive Triad framework.

## When to Use This Skill

Use this skill when you want to:
- Audit a codebase for bloat, duplication, and disconnection
- Review a PR through a philosophical lens
- Evaluate whether code "earns its existence"
- Systematically reduce complexity

## The Framework

The Subtractive Triad applies three levels of scrutiny, in order:

### Level 1: DRY (Implementation)
**Question**: "Have I built this before?"

Look for:
- Duplicate code across files
- Repeated patterns that should be abstracted
- Copy-paste with minor variations
- Utility functions reimplemented multiple times

**Action**: Unify

### Level 2: Rams (Artifact)
**Question**: "Does this earn its existence?"

Named after Dieter Rams' principle: *Weniger, aber besser* (Less, but better).

Look for:
- Unused imports and exports
- Dead code paths
- Over-engineered abstractions
- Features nobody uses
- Props/parameters that could be defaults
- Comments that explain "what" instead of "why"

**Action**: Remove

### Level 3: Heidegger (System)
**Question**: "Does this serve the whole?"

Based on the hermeneutic circle: parts must serve the whole, and the whole gives meaning to parts.

Look for:
- Orphaned modules (nothing imports them)
- Inconsistent naming conventions
- Poor cohesion (things that should be together, aren't)
- Tight coupling (things that should be separate, aren't)
- Missing documentation for public APIs
- Files in wrong directories

**Action**: Reconnect

## How to Run an Audit

### Full Codebase Audit

Ask Claude:
```
Run a Subtractive Triad audit on [scope].

Scope: [directory or file pattern]
Focus: [optional - specific concern like "UI components" or "API routes"]
```

### PR Review

Ask Claude:
```
Review this PR through the Subtractive Triad.

PR: [number or URL]
```

### Single File Deep Dive

Ask Claude:
```
Apply the Subtractive Triad to [file path].

I want to know if every line earns its existence.
```

## Output Format

The audit produces a structured report:

```markdown
# Subtractive Triad Audit: [Scope]

## Summary
- **DRY Score**: X/10
- **Rams Score**: X/10  
- **Heidegger Score**: X/10
- **Overall Health**: X/10

## Level 1: DRY Findings

### Duplications Found
| Location A | Location B | Pattern | Recommendation |
|------------|------------|---------|----------------|
| `file:line` | `file:line` | [description] | [unify how] |

## Level 2: Rams Findings

### Code That Doesn't Earn Existence
| File | Line | Issue | Confidence |
|------|------|-------|------------|
| `path` | N | [what & why] | High/Medium/Low |

## Level 3: Heidegger Findings

### Disconnection Issues
| File/Module | Issue | Recommendation |
|-------------|-------|----------------|
| `path` | [disconnection type] | [how to reconnect] |

## Recommendations

### Must Fix (P0)
1. [Critical issue]

### Should Fix (P1)
1. [Important issue]

### Could Fix (P2)
1. [Nice-to-have]

## Metrics
- Files analyzed: N
- Lines analyzed: N
- Issues found: N
- Estimated reduction: X%
```

## Scoring Guidelines

Each level is scored 0-10:

| Score | Meaning |
|-------|---------|
| 9-10 | Excellent - minimal issues |
| 7-8 | Good - minor issues only |
| 5-6 | Acceptable - some work needed |
| 3-4 | Poor - significant issues |
| 0-2 | Critical - major refactoring needed |

**Overall Health** = (DRY + Rams + Heidegger) / 3

## Philosophy

> "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."
> — Antoine de Saint-Exupéry

The Subtractive Triad operationalizes this principle into actionable code review criteria. It shifts the question from "does this work?" to "does this *need* to exist?"

## Case Study

The framework was developed during the Kickstand audit, which reduced 155 scripts to 13 (92% reduction) while improving functionality. See: https://createsomething.io/papers/kickstand-triad-audit

## Installation

Copy this skill directory to your project:

```bash
mkdir -p .claude/skills
cp -r triad-audit .claude/skills/
```

Or clone from GitHub:

```bash
git clone https://github.com/create-something/triad-audit-skill .claude/skills/triad-audit
```

---

*From CREATE SOMETHING — The canon for "less, but better."*
