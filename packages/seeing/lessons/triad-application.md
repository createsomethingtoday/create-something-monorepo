# Applying the Triad

## The Three Questions Together

You've learned the three levels separately. Now you use them together.

**The Subtractive Triad is a decision framework.** For any technical choice, ask three questions in sequence:

1. **DRY** (Implementation) → "Have I built this before?"
2. **Rams** (Artifact) → "Does this earn its existence?"
3. **Heidegger** (System) → "Does this serve the whole?"

## Why This Order?

**DRY is fastest** — You either have the code or you don't. Quick to check.

**Rams requires judgment** — You must evaluate need vs. excess. Slower.

**Heidegger is deepest** — You must understand the whole system. Slowest.

Start shallow, spiral deeper. If DRY eliminates the decision, you don't need Rams. If Rams eliminates the feature, you don't need Heidegger.

## A Complete Example

**Scenario**: "Add a dark mode toggle to user profiles."

### Level 1: DRY

**Ask**: Have I built this before?

**Investigation**: Search for existing theme handling.

**Finding**: Yes! There's a theme switcher in settings that controls a global theme state.

**DRY Decision**: Don't rebuild theme toggling. Reuse the existing `ThemeProvider` and `useTheme()` hook.

**What we removed**: Duplication of theme state management.

### Level 2: Rams

**Ask**: Does a profile-level toggle earn its existence?

**Investigation**: 
- Where is the existing toggle? (Settings page)
- Do users need it on profiles specifically?
- What problem does profile-level toggling solve?

**Finding**: The settings toggle already serves the need. Adding a second toggle doesn't serve a distinct purpose.

**Rams Decision**: This feature doesn't earn its existence.

**Recommendation**: "We already have theme toggling in settings. Adding it to profiles creates redundancy. Instead, make the settings toggle more discoverable."

**What we removed**: An unnecessary feature.

**The decision ends here.** Rams eliminated the feature. No need to continue to Heidegger.

## Another Example

**Scenario**: "Extract notifications into a separate microservice."

### Level 1: DRY

**Ask**: Is there duplication that extraction would eliminate?

**Finding**: Yes. Email sending code is duplicated across:
- User registration
- Password reset
- Order confirmation
- Newsletter

**DRY Decision**: Unifying notification logic would eliminate duplication.

**DRY passes.** Move to Rams.

### Level 2: Rams

**Ask**: Does a separate *service* earn its existence?

**Investigation**:
- What's the benefit of a service vs. a shared module?
- Do we need independent deployment? (No)
- Do we need independent scaling? (No)
- Do we need a different language? (No)

**Rams Decision**: A separate service doesn't earn its existence. But a shared module does.

**What we removed**: Unnecessary service boundary and operational complexity.

**Recommendation**: "Extract notification logic into a shared module. We get unification without microservice overhead."

**The decision ends here.** Rams shaped the solution. Heidegger would confirm the module placement.

## The Questions in Real Time

As you work, the triad becomes automatic:

### Writing a Function

```
❶ DRY: Have I built this before?
   → Search: Do we have formatCurrency elsewhere?
   → Found: Yes, in utils/
   → Action: Use existing function

❷ Rams: Does my new version earn its existence?
   → Question: Why am I writing a new one?
   → Answer: Existing one lacks feature X
   → Counter: Does feature X earn its existence?
   
❸ Heidegger: Does this serve the whole?
   → If adding feature X: Where should it live?
   → Answer: Extend existing function, don't duplicate
```

### Reviewing a PR

```
❶ DRY: Is anything here duplicated?
   → Look for: Similar code elsewhere, reimplemented logic

❷ Rams: Does everything here earn existence?
   → Look for: Unused props, speculative features, unnecessary complexity

❸ Heidegger: Does this serve the whole?
   → Look for: Boundary violations, naming mismatches, wrong placement
```

### Designing a Feature

```
❶ DRY: What already exists that we can use?
   → Before designing new, inventory existing

❷ Rams: What's the minimum that serves the need?
   → Before adding features, question each one

❸ Heidegger: How does this fit the system?
   → Before building, map the connections
```

## The Spiral

The triad isn't linear. It spirals:

```
Write a function (implementation)
↓
DRY: Is this duplicated? → No, continue
↓
Finish the feature (artifact)
↓
Rams: Does this earn existence? → Yes, continue
↓
Deploy the feature (system)
↓
Heidegger: Does this serve the whole?
↓
Wait—it duplicates functionality in another service!
↓
BACK TO DRY: The duplication was at system level
↓
Unify the services
↓
Continue the spiral...
```

You'll revisit levels as understanding deepens. That's the hermeneutic circle in action.

## Mastery

You've mastered the triad when:

1. **The questions are unconscious** — You ask them without thinking about asking
2. **You catch issues early** — Problems surface during design, not after release
3. **You spiral naturally** — Moving between levels feels fluid, not forced

## The Journey Ahead

You've completed the Seeing curriculum.

You now have:
- The meta-principle: creation as subtraction
- Three questions: DRY, Rams, Heidegger
- A framework: the Subtractive Triad
- Practice: exercises that developed your perception

What comes next?

**Keep seeing.** Use the triad on real work. Let the questions become instinct.

**Record reflections.** Notice when you catch yourself. Document what you learn.

**Consider Dwelling.** When the questions are automatic, you're ready for tools that execute what you now perceive.

---

## Final Reflection

The Triad is a lens, not a checklist.

The goal isn't to ask the questions forever. It's to internalize them until they become perception, not process.

When you look at code and automatically see duplication, excess, and disconnection—when removal feels as creative as addition—when the questions ask themselves:

**You've learned to see.**

And then you're ready to dwell.
