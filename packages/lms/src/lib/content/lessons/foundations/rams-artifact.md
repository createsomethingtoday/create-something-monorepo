# Rams: Artifact Level

## The Question

**"Does this earn its existence?"**

DRY unified your implementation. Now Rams asks: should that implementation exist at all?

This is the second level of the Subtractive Triad: **the discipline of removing excess**.

At the artifact level, we judge what stays and what goes. Features, UI elements, configuration options—anything that presents itself to users must earn its place.

## Dieter Rams: Weniger, aber besser

Dieter Rams, industrial designer at Braun, distilled a lifetime of work into ten principles. His ethos:

**"Weniger, aber besser"** → Less, but better.

This isn't minimalism for aesthetics. It's subtraction in service of truth. Every element that doesn't serve the user's need obscures what does.

### The Ten Principles (Condensed)

1. **Good design is innovative** → But innovation serves function, not novelty
2. **Good design makes a product useful** → Utility is the measure
3. **Good design is aesthetic** → Beauty emerges from rightness
4. **Good design makes a product understandable** → The interface explains itself
5. **Good design is unobtrusive** → Tools recede into use
6. **Good design is honest** → No false promises
7. **Good design is long-lasting** → Timeless, not trendy
8. **Good design is thorough** → Down to the last detail
9. **Good design is environmentally friendly** → Sustainable, not wasteful
10. **Good design is as little design as possible** → Back to purity, back to simplicity

These aren't ten separate ideas. They're **one idea from ten angles**: Remove what doesn't serve.

## Why Excess Obscures

Every element in an interface demands attention. Every configuration option requires a decision. Every feature adds complexity to mental models.

**The problem isn't clutter. The problem is cognitive load.**

### Example: A Settings Screen

```
Settings (Before)
─────────────────
✓ Enable notifications
✓ Enable email notifications
✓ Enable push notifications
✓ Enable SMS notifications
  Notification sound: [Chime ▾]
  Notification frequency: [Immediate ▾]
  Quiet hours start: [10:00 PM ▾]
  Quiet hours end: [7:00 AM ▾]
✓ Show notification badge
✓ Vibrate on notification
  Theme: [System ▾]
  Font size: [Medium ▾]
✓ Reduce animations
✓ High contrast mode
  Language: [English ▾]
  Date format: [MM/DD/YYYY ▾]
  Time format: [12-hour ▾]
```

Fifteen options. Most users want one thing: **reasonable defaults they never have to think about**.

**After applying Rams:**

```
Settings (After)
────────────────
Notifications
  Notify me: [Email + Push ▾]
  Quiet hours: [10 PM – 7 AM ▾]

Appearance
  Theme: [Auto ▾]

─────────────────
Advanced Settings →
```

Five options. Everything else has a smart default or lives in Advanced Settings (where 95% of users never go).

**What we removed:**
- Redundant controls (three notification toggles → one selector)
- Unnecessary choices (notification sound, vibration—use system defaults)
- Premature optimization (font size, contrast—use system accessibility)

**What we revealed:**
- The core question: "How do you want to be notified?"
- Respect for user time: "We chose good defaults"

## The Discipline of Judging

Rams requires criteria. You can't judge what earns its existence without knowing what "earning" means.

### The Earning Test

For every element, ask three questions:

1. **Does it serve a user need?** (Not a hypothetical need—a real one)
2. **Can that need be served with less?** (Defaults, smart behavior, removal)
3. **Does it make the essential harder to see?** (Cognitive cost vs. value)

If it fails any test, it's excess.

### Example: Feature Audit

Let's audit a form builder:

```
Feature: Custom validation messages
Need: Users want helpful error messages
Serves need? Yes
Can we do less? Yes → Use clear field labels and browser defaults
Makes essential harder? Yes → Adds configuration UI
Verdict: Remove. Better labels > custom messages.

Feature: Field dependencies (show field B if field A is checked)
Need: Complex forms need conditional logic
Serves need? Yes
Can we do less? No → This is the minimal implementation of dependencies
Makes essential harder? No → Only appears when needed
Verdict: Keep.

Feature: 47 pre-built themes
Need: Forms should match brand
Serves need? Questionable → Custom CSS serves this better
Can we do less? Yes → Provide 3 themes (light, dark, brand-neutral)
Makes essential harder? Yes → Theme picker is overwhelming
Verdict: Reduce to 3. Let advanced users use CSS.
```

**The pattern**: Most features can be removed or reduced. The few that remain become clearer.

## Code-Level Rams

Rams applies to APIs and code interfaces too.

### Example: API Design

```typescript
// Before: Every option exposed
interface CreateUserOptions {
  name: string;
  email: string;
  password: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  visibility?: 'public' | 'private';
  allowMessages?: boolean;
  allowComments?: boolean;
  showEmail?: boolean;
  showLocation?: boolean;
}

// After: Essential only, smart defaults for the rest
interface CreateUserOptions {
  name: string;
  email: string;
  password: string;
}

// User can modify later in settings, but creation is simple
// Defaults:
// - Notifications: email only (can add push/sms later)
// - Theme: system
// - Visibility: private (can make public later)
// - Profile: minimal (can add bio/website later)
```

**What we removed:**
- 12 optional parameters from the creation flow
- Cognitive load on developers using this API
- The false assumption that users know their preferences before using the product

**What we revealed:**
- The essential act: creating an account
- A clear upgrade path: settings screen for everything else

## When NOT to Apply Rams

Rams is about removing **excess**, not **complexity**.

**Don't remove:**
- **Necessary complexity** → Tax software is complex because taxes are complex
- **Power-user features** → Advanced settings can coexist with simple defaults
- **Accessibility** → Options that serve disabled users aren't excess

**Do remove:**
- **False choices** → Options that don't meaningfully change behavior
- **Premature features** → "We might need this someday"
- **Redundant paths** → Three ways to do the same thing

**The test**: If removing it would make the product worse for actual users (not hypothetical users), keep it.

## Aesthetic Judgment

Rams connects utility to beauty. When something is right—when it serves exactly what it should serve—it becomes beautiful.

**Example: The Cube**

The CREATE SOMETHING cube logo is one shape:
- No gradients
- No shadows
- No texture
- One color

It's beautiful because it's **exactly what it needs to be and nothing more**. Adding a gradient wouldn't make it better—it would obscure the form.

Code works the same way:

```typescript
// Excess: Premature abstraction
class UserManager {
  private cache: Map<string, User>;
  private observers: Array<(user: User) => void>;

  constructor() {
    this.cache = new Map();
    this.observers = [];
  }

  addObserver(fn: (user: User) => void) {
    this.observers.push(fn);
  }

  async getUser(id: string): Promise<User> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    const user = await fetchUser(id);
    this.cache.set(id, user);
    this.observers.forEach(fn => fn(user));
    return user;
  }
}

// Essential: Just what's needed
async function getUser(id: string): Promise<User> {
  return fetchUser(id);
}

// Add caching when you need it, observers when you need them
// Don't build the airplane before you need to fly
```

The second version is beautiful because it's honest. It does exactly one thing.

## The Practice

Developing Rams sight requires:

1. **Audit existing artifacts** → List every element, ask the earning test
2. **Start with less** → Build the minimum, add only when needed
3. **Remove one thing** → Daily practice: find one thing to delete

**The habit**: Before adding a feature, ask "What could I remove instead?"

## Common Excess Patterns

### Configuration Hell
Too many options → Smart defaults + one "mode" selector

### Feature Redundancy
Three ways to do X → One excellent way to do X

### Premature Generalization
"Users might want to customize Y" → Wait until they ask

### Checkbox Fatigue
✓ 12 different settings → 2 settings that matter, rest auto-configured

## Rams in Practice

The discipline becomes automatic:

1. Propose a feature
2. Ask: "What user need does this serve?"
3. Ask: "Can we serve that need with less?"
4. Ask: "Does this make the essential harder to see?"
5. If yes to #2 or #3: Remove or reduce

**The goal isn't minimalism.** The goal is **nothing unnecessary remains**.

## Next Level

Rams judges artifacts. But artifacts exist within systems.

A perfectly minimal feature might still be wrong if it doesn't serve the whole. What if the feature duplicates something another service already does? What if it fragments the user experience?

That's where Heidegger comes in: **Does this serve the whole?**

---

## Cross-Property References

> **Canon Reference**: See [The Masters — Dieter Rams](https://createsomething.ltd/masters/dieter-rams) for his complete design principles and influence on CREATE SOMETHING.
>
> **Canon Reference**: Read [Negative Space Pattern](https://createsomething.ltd/patterns/negative-space) for how absence creates presence in design.
>
> **Research Depth**: Read [Subtractive Form Design](https://createsomething.io/papers/subtractive-form-design) for research on reduction in interface design.

---

## Reflection

Before the praxis exercise:

1. Open your most recent project. List five features or UI elements.
2. For each, ask: "Does this earn its existence?" Be honest.
3. What would you remove if you could?

---

## Praxis: Audit an Artifact

**Exercise ID**: `audit-artifact`
**Duration**: 20 minutes
**Difficulty**: Beginner

You'll audit a real component or page and apply the earning test to every element.

### Objectives

1. Apply "Does this earn its existence?" to each element
2. Identify decorative vs. functional elements
3. Propose removals with justification

### Claude Code Prompt

Copy this into Claude Code to begin:

```
Help me audit [COMPONENT_OR_PAGE] using Rams' "Weniger, aber besser" principle.

I'm defining MY standard for what "earns its existence." For each element, ask:

1. **Does this element serve a function?** (If not, it's decorative)
2. **Is the function essential?** (Could the user accomplish their goal without it?)
3. **Is this the simplest way to serve that function?**

Analyze [COMPONENT_OR_PAGE] and create a table:
| Element | Function | Essential? | Simplest? | Verdict |
|---------|----------|------------|-----------|---------|

For elements that fail: propose removal or simplification.

End with MY Rams principle: a one-sentence test I'll apply to every element I create.

The artifact I want to audit: [YOUR_COMPONENT_OR_PAGE]
```

### Success Criteria

By the end, you should have:
- A table auditing every visible element in your artifact
- A list of elements to remove or simplify
- Written YOUR Rams principle—a one-sentence test for future elements
