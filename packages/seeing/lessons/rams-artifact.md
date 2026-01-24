# Rams: The Question of Existence

## Level 2 of the Subtractive Triad

**Question**: "Does this earn its existence?"
**Action**: Remove

Named for [Dieter Rams](https://rams-foundation.org/homepage/), the legendary designer whose principle was:

**Weniger, aber besser** — Less, but better.

## The Rams Standard

Rams led design at Braun for over 30 years. Every button, every line, every element had to justify itself. If it didn't serve the essential purpose, it was removed.

His [Ten Principles of Good Design](https://rams-foundation.org/foundation/design-comprehension/theses/) include:

1. Good design is innovative
2. Good design makes a product useful
3. Good design is aesthetic
4. Good design makes a product understandable
5. Good design is unobtrusive
6. Good design is honest
7. Good design is long-lasting
8. Good design is thorough down to the last detail
9. Good design is environmentally friendly
10. **Good design is as little design as possible**

The tenth principle encapsulates the philosophy: concentrate on essential aspects, don't burden products with non-essentials, return to purity and simplicity.

This isn't minimalism for aesthetics. It's minimalism for function. Every element that doesn't earn its place actively harms the product by obscuring what matters.

## The Question in Practice

After you've checked for duplication (DRY), ask: **"Does this earn its existence?"**

This applies to:

### Features
Does this feature serve a real need, or an imagined one?
- "Users might want to..." → They haven't asked. Wait.
- "It would be cool if..." → Cool isn't useful. Remove.
- "Just in case..." → Cases that haven't happened don't need handling.

### Parameters
Does this parameter justify its complexity?
- Props with defaults that never change → Remove the prop
- Options that are always the same value → Make it a constant
- Flexibility that's never exercised → Simplify

### Code
Does this code earn its lines?
- Abstractions with one implementation → Inline them
- Helper functions used once → Inline them
- Comments that describe what code already says → Remove them

### Complexity
Does this complexity pay for itself?
- Clever solutions → Prefer obvious ones
- Optimizations without measurements → Premature
- Patterns without problems → Cargo cult

## The Existence Test

For anything you're about to add, ask:

1. **What happens if I don't add this?**
   - If the answer is "nothing much," don't add it.

2. **Who asked for this?**
   - If no one asked, why are you building it?

3. **When was this last needed?**
   - If you can't remember, it's probably not needed.

4. **What's the simplest version?**
   - Build that first. Add complexity only when forced.

## Seeing Excess

Train yourself to notice:

**Feature bloat**:
- Settings pages with options no one uses
- APIs with endpoints no one calls
- Components with props no one passes

**Defensive complexity**:
- Error handling for errors that never happen
- Validation for inputs that are always valid
- Edge cases for edges that don't exist

**Speculative generality**:
- Abstractions built for hypothetical futures
- Flexibility for requirements that haven't come
- "Platform thinking" before having users

## The Removal Decision

When something doesn't earn existence, you have choices:

1. **Remove entirely**: It serves no purpose
2. **Defer**: It might be needed, but not now
3. **Simplify**: It's needed, but not in this form
4. **Question**: Maybe you're missing something—investigate

The hardest choice is removal. We're attached to what we build. But attachment to excess obscures the essential.

## The Risk of Over-Removal

Rams isn't nihilism. Some warnings:

**Don't remove what's actually used**: Check before deleting. Dead code analysis helps.

**Don't remove what you don't understand**: Sometimes things exist for reasons that aren't obvious. Investigate first.

**Don't optimize for today only**: Some investment in flexibility is justified. The question is degree.

## Practice

Look at something you've built recently. Ask:

1. Is there a feature no one uses?
2. Is there a parameter that's always the default?
3. Is there complexity that doesn't pay for itself?

Imagine removing it. What would happen?

---

## Reflection

The Rams question challenges our instinct to add. Building feels productive. Removing feels like giving up.

But removal is creation. Every feature you don't build is time for features that matter. Every line you don't write is clarity for lines that remain.

**What would you remove from your current project if you had to justify every feature's existence?**

---

## Resources

- **Rams Foundation**: [rams-foundation.org](https://rams-foundation.org/homepage/) — Official foundation preserving Rams' design legacy

- **Ten Principles**: [The Theses](https://rams-foundation.org/foundation/design-comprehension/theses/) — Original articulation of the principles

- **Design Museum Overview**: [What Is Good Design?](https://designmuseum.org/discover-design/all-stories/what-is-good-design-a-quick-look-at-dieter-rams-ten-principles) — Accessible introduction to Rams' principles

- **Digital Influence**: Jonathan Ive, Apple's former Chief Design Officer, translated Rams' principles into digital products. The iPhone calculator is a direct homage to Rams' Braun designs.

## Next Steps

Continue to [Heidegger: The Question of the Whole](/seeing/heidegger-system) to learn the third level of the Triad.
