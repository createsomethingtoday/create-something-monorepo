# DRY: The Question of Duplication

## Level 1 of the Subtractive Triad

**Question**: "Have I built this before?"
**Action**: Unify

This is the first question because it's the fastest filter. Either the code exists or it doesn't. Either you're duplicating or you're not.

## What DRY Really Means

DRY stands for "Don't Repeat Yourself." The principle was formally introduced in [*The Pragmatic Programmer*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) by Andy Hunt and David Thomas (1999).

**DRY is not**: "Never write similar code twice."
**DRY is**: "Every piece of knowledge must have a single, unambiguous, authoritative representation in a system."

The difference matters.

### Bad DRY

```typescript
// Someone read "DRY" and made this:
const BUTTON_COLOR = '#3b82f6';
const LINK_COLOR = '#3b82f6';  
const HEADER_COLOR = '#3b82f6';

// "They're all blue, so DRY says make one constant!"
const PRIMARY_COLOR = '#3b82f6';
```

This is wrong. These aren't duplicated knowledge. They're three different concepts that happen to have the same value. If button color changes, link color might not.

### Good DRY

```typescript
// The design system defines blue:
const colors = { blue: { 500: '#3b82f6' } };

// Components use the token:
const buttonStyles = { bg: colors.blue[500] };
const linkStyles = { color: colors.blue[500] };
```

Now there's one authoritative representation of "blue-500". If it changes, it changes everywhere. That's DRY.

## The Question in Practice

When you're about to write code, ask: **"Have I built this before?"**

This question has layers:

### Layer 1: Exact Match
Have I literally written this function before? Is there a `formatDate()` somewhere?

**How to check**: Search the codebase. Look at imports. Ask yourself.

### Layer 2: Conceptual Match
Have I built something that serves the same purpose? Different name, same concept?

**How to check**: Think about what you're trying to do, not what you're trying to write. Search for the concept, not the code.

### Layer 3: Library Match
Has someone else built this? Is there a well-tested solution?

**How to check**: Consider standard libraries, established packages, language built-ins.

## When Duplication Is OK

Not all repetition is duplication. Sometimes similar code serves different purposes:

**Acceptable repetition**:
- Two handlers that look similar but will evolve differently
- Test setup that could be shared but is clearer inline
- Validation rules that coincidentally match but serve different domains

**The test**: If one changes, must the other change? If yes, unify. If no, leave separate.

## Seeing Duplication

Train yourself to notice:

**Structural duplication**:
- Functions with the same shape but different values
- Components that are variations of each other
- Error handling patterns repeated across files

**Conceptual duplication**:
- "User" defined in three different places
- Date formatting done five different ways
- The same validation logic scattered around

**Hidden duplication**:
- Copy-pasted code that diverged slightly
- Two abstractions that do the same thing
- Config that duplicates instead of references

## The Unification Decision

When you find duplication, you have choices:

1. **Extract a function**: Same logic, different inputs
2. **Create a component**: Same structure, different data
3. **Define a type**: Same shape, multiple instances
4. **Establish a pattern**: Same approach, different contexts

The right choice depends on what's duplicated. Duplicated logic suggests a function. Duplicated structure suggests a type. Duplicated approach suggests a pattern.

## The Risk of Over-Unification

DRY can be taken too far. Two warnings:

**Premature abstraction**: Don't unify things that might diverge. Wait until you see the pattern clearly.

**False duplication**: Don't unify things that look similar but aren't conceptually the same. Same code doesn't mean same knowledge.

## Practice

Look at code you've written recently. Ask:

1. Is there anything I built that already existed?
2. Is there anything repeated that represents the same knowledge?
3. Is there a concept that's expressed in multiple places?

Don't fix anything yet. Just see.

---

## Reflection

The DRY question becomes instinct when you ask it before writing, not after.

**What would change if you asked "Have I built this before?" every time you started typing?**

---

## Resources

- **Original Source**: [*The Pragmatic Programmer: 20th Anniversary Edition*](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Andy Hunt and David Thomas

- **Key Insight**: "Duplication is far cheaper than the wrong abstraction" — Sandi Metz. This nuance is critical: don't unify prematurely.

- **The Test**: Code duplication ≠ knowledge duplication. Two functions with identical code that serve different purposes and will evolve differently are *not* DRY violations.

## Next Steps

Continue to [Rams: The Question of Existence](/seeing/rams-artifact) to learn the second level of the Triad.
