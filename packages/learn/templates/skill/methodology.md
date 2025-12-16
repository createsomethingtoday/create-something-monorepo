# Subtractive Triad Skill

This skill teaches Claude Code to apply the Subtractive Triad methodology to your code.

## Skill Definition

**Name**: `subtractive-triad`

**Description**: Apply DRY, Rams, and Heidegger principles to code decisions.

**Triggers**:
- When refactoring code
- When designing new features
- When reviewing architecture
- When making any code decision

## The Three Questions

### 1. DRY — "Have I built this before?"

**Implementation level**. Ask:
- What patterns are duplicated?
- Can I unify this at a higher abstraction?
- Is there a single source of truth?

**Action**: Unify duplication before proceeding.

### 2. Rams — "Does this earn its existence?"

**Artifact level**. Ask:
- What can be removed without losing function?
- Is each piece justified by the whole?
- Am I adding or revealing?

**Action**: Remove what does not earn its place.

### 3. Heidegger — "Does this serve the whole?"

**System level**. Ask:
- How does this part serve the whole?
- What connections am I strengthening or breaking?
- Is this change coherent with the system's purpose?

**Action**: Reconnect parts that don't serve the whole.

## Usage

When Claude Code encounters a code decision:

1. Apply the three questions in sequence
2. Take the corresponding action at each level
3. Reflect on what was removed and why

The Triad is not a checklist—it's a lens. The questions reveal what's already known.

## Examples

### Refactoring Components

```
DRY: These three components share 80% of their logic → Extract common abstraction
Rams: The abstraction has 5 optional props → Remove 3 that aren't used
Heidegger: The component serves the "user profile" domain → Rename to make purpose clear
```

### Designing an API

```
DRY: This endpoint mirrors two others → Unify into single parameterized route
Rams: We planned 8 query parameters → Remove 5, keep 3 essential ones
Heidegger: The API serves client-side data fetching → Design response shape for that use case
```

### Code Review

```
DRY: This PR introduces a new utility that duplicates existing one → Use existing
Rams: The feature adds 200 LOC for edge case handling → Is the edge case worth it?
Heidegger: The change touches three domains → Does it strengthen or fragment the system?
```

## Integration with Your Ethos

If you've defined personal principles via `learn_ethos`, Claude Code will:
1. Apply Triad questions first
2. Then apply your domain-specific principles
3. Suggest actions aligned with both

Your ethos makes the Triad concrete to your practice.

---

*The tool recedes; the methodology remains.*
