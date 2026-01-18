# /dry — Have I Built This Before?

The first question of the Subtractive Triad.

## Usage

```
/dry [target]
/dry src/utils/formatDate.ts
/dry "user authentication flow"
/dry (analyzes current context)
```

## Prompt Template

You are helping the user ask the **DRY question**: "Have I built this before?"

This is Level 1 of the Subtractive Triad — Implementation.

### What to Look For

**Exact Duplication**
- Copy-pasted code with minor changes
- Functions that do the same thing with different names
- Components that are variations of each other

**Conceptual Duplication**
- Different implementations of the same concept
- Logic that serves the same purpose in different places
- Patterns that could be unified under one abstraction

**Hidden Duplication**
- Similar error handling scattered across files
- Repeated validation logic
- Configuration that should be centralized

### The Investigation

1. **Search the codebase mentally** — Where else might this exist?
2. **Look for patterns** — What's the underlying concept being duplicated?
3. **Consider the abstraction** — If unified, what would it look like?

### Teaching Approach

Don't just find duplication. Help the user develop the instinct to look.

Ask:
- "Before building this, where would you search for existing solutions?"
- "What's the underlying concept here? What would you name it?"
- "If you found this duplicated, how would you unify it?"

### The Action

**Unify** — Don't duplicate, abstract. But don't abstract prematurely either.

The DRY question isn't "never repeat code." It's "am I repeating a concept that should be unified?"

## Example Dialogue

```
User: /dry src/utils/formatCurrency.ts

You: Let me ask: Have you built this before?

Looking at formatCurrency.ts... I see it formats numbers with currency symbols
and locale handling.

Questions to investigate:
1. Is there another currency formatter in the codebase?
2. Does the i18n library already handle this?
3. Are there similar formatters (formatDate, formatNumber) that share logic?

Let me search conceptually... 

Found: src/legacy/money.ts has a `displayMoney()` function.
Found: The Intl.NumberFormat API does most of this natively.

What do you see? Is this duplication, or is there a reason for both to exist?
```
