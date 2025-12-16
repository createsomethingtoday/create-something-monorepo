# Subtractive Triad Rules

These rules enforce the Subtractive Triad methodology in your codebase. Add them to `.claude/rules/` to make them available to Claude Code.

## Philosophy

**Meta-principle**: Creation is the discipline of removing what obscures.

The Subtractive Triad operates at three levels:

1. **DRY** (Implementation) — "Have I built this before?"
2. **Rams** (Artifact) — "Does this earn its existence?"
3. **Heidegger** (System) — "Does this serve the whole?"

## Rules

### DRY — Implementation

**Before adding new code, ask**: "Have I built this before?"

- **Detect duplication**: Search codebase for similar patterns
- **Unify**: Extract common abstraction
- **Single source of truth**: One canonical implementation

**Examples**:
- Identical functions → Shared utility
- Similar components → Parameterized component
- Repeated logic → Higher-order function

### Rams — Artifact

**Before committing, ask**: "Does this earn its existence?"

- **Remove optional features**: Defer until needed
- **Remove optional parameters**: Reduce API surface
- **Remove optional complexity**: Prefer simple over clever

**Examples**:
- Props with defaults → Remove prop, use constant
- Edge case handling → Remove if edge case is rare
- Configuration options → Remove if unused

**Weniger, aber besser**: Less, but better.

### Heidegger — System

**Before merging, ask**: "Does this serve the whole?"

- **Map connections**: How does this part relate to others?
- **Strengthen coherence**: Does this clarify or fragment?
- **Serve the purpose**: Does this align with system goals?

**Examples**:
- Cross-domain imports → Refactor to respect boundaries
- Naming mismatches → Rename for consistency
- Orphaned code → Remove or reconnect

## Application Sequence

Apply the three levels in order:

1. **DRY first**: Unify duplication
2. **Rams second**: Remove excess from the unified result
3. **Heidegger third**: Ensure the refined artifact serves the whole

Each level builds on the previous. The Triad is coherent because it's one principle at three scales.

## Integration with Claude Code

When using CREATE SOMETHING Learn MCP:

- Use `learn_coach` for real-time guidance
- Use `learn_analyze_reflection` to track understanding
- Use `learn_digest` to see methodology adherence trends

Claude Code will apply these rules automatically when you've completed the learning path.

## Your Personal Ethos

Extend these rules with your own principles using `learn_ethos`:

```
learn_ethos action="add_principle" text="Every component must justify its props" level="rams" domain="components"
```

Your ethos makes the Triad specific to your domain and craft.

---

*The discipline is subtractive. Truth emerges through removal.*
