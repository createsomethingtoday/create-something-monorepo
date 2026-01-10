# Applying the Triad

## The Three Questions in Order

You've learned the three levels. Now you learn to use them together.

**The Subtractive Triad is a decision framework.** For any technical choice, ask three questions in sequence:

1. **DRY** (Implementation) → "Have I built this before?"
2. **Rams** (Artifact) → "Does this earn its existence?"
3. **Heidegger** (System) → "Does this serve the whole?"

**Why this order?**

DRY is fastest—you either have the code or you don't. Rams requires judgment—you must evaluate need vs. excess. Heidegger is deepest—you must understand the whole system.

**Start shallow, spiral deeper.**

## Decision Pattern: New Feature Request

Let's walk through a real example.

**Scenario**: Product manager requests "Add a dark mode toggle to user profiles."

### Level 1: DRY (Have I built this before?)

**Ask**: Do we already have dark mode anywhere?

**Investigation**:
```bash
# Search the codebase
grep -r "dark.*mode" src/
grep -r "theme.*toggle" src/
```

**Result**: Yes! We have a theme switcher in the settings page. It controls a global theme state.

**DRY Decision**: Don't rebuild theme toggling. Reuse the existing `ThemeProvider` and `useTheme()` hook.

```typescript
// Don't duplicate
function ProfileThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // ... reimplemented theme logic
}

// Reuse existing
import { useTheme } from '@/lib/theme';

function ProfileThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button onclick={toggleTheme}>Toggle theme</button>;
}
```

**What we removed**: Duplication of theme state management.

### Level 2: Rams (Does this earn its existence?)

**Ask**: Should we have a theme toggle on profiles?

**Investigation**:
- Where is the existing theme toggle? (Settings page)
- Do users expect theme controls on profiles? (Check analytics, user research)
- What problem does profile-level toggling solve?

**Result**: The existing theme toggle is in settings. Users already know to go there for preferences. Adding a second toggle doesn't serve a distinct need—it just adds another place to do the same thing.

**Rams Decision**: This feature doesn't earn its existence. The settings toggle already serves the need.

**Recommendation to PM**: "We already have theme toggling in settings. Adding it to profiles would create redundancy. Instead, we could make the settings toggle more discoverable (e.g., keyboard shortcut, menu item)."

**What we removed**: An unnecessary feature.

**End of decision.** We didn't need to reach Heidegger—Rams already eliminated the feature.

## Decision Pattern: Microservice Extraction

**Scenario**: "Our monolith is getting large. Should we extract notifications into a separate service?"

### Level 1: DRY (Have I built this before?)

**Ask**: Is there duplication that extraction would eliminate?

**Investigation**:
- Does notification logic appear in multiple places?
- Would a service create a single source of truth?

**Result**: Yes. Email sending code is duplicated across:
- User registration flow
- Password reset flow
- Order confirmation flow
- Newsletter system

**DRY Decision**: Unifying notification logic into a service would eliminate duplication.

```typescript
// Before: Duplicated in four places
async function sendWelcomeEmail(user: User) {
  await emailClient.send({
    to: user.email,
    subject: 'Welcome!',
    html: renderTemplate('welcome', user),
  });
  await logEmailSent(user.id, 'welcome');
}

// After: One service
await notificationService.send({
  type: 'email',
  template: 'welcome',
  recipient: user.email,
  data: user,
});
```

**DRY passes.** Extraction would unify.

### Level 2: Rams (Does this earn its existence?)

**Ask**: Does a separate service earn its existence, or could we unify within the monolith?

**Investigation**:
- What's the benefit of a separate service vs. a shared module?
- Separate service pros: Independent deployment, language choice, scaling
- Separate service cons: Network latency, operational complexity, distributed state

**Result**: We don't need independent deployment (notifications deploy with the app). We don't need language choice (TypeScript works). We don't need independent scaling (notifications aren't the bottleneck).

**Rams Decision**: A separate *service* doesn't earn its existence. But a shared *module* does.

```typescript
// Weniger, aber besser: Module, not microservice
// src/lib/notifications/index.ts
export async function sendNotification(params: NotificationParams) {
  // Unified notification logic
}

// All flows import this
import { sendNotification } from '@/lib/notifications';
```

**What we removed**: Unnecessary service boundary and operational complexity.

**Recommendation**: "Extract notification logic into a shared module. We get unification without microservice overhead. If we later need independent scaling, we can extract then."

**End of decision.** Rams said no to the microservice, yes to the module.

## Decision Pattern: System Integration

**Scenario**: "We want to add real-time collaboration. Should we build it or use a SaaS provider?"

This requires all three levels.

### Level 1: DRY (Have I built this before?)

**Ask**: Do we already have real-time infrastructure?

**Investigation**:
- Do we have WebSocket handling?
- Do we have operational transform or CRDTs?
- Do we have presence tracking?

**Result**: No. We've never built real-time collaboration.

**DRY Decision**: We can't reuse what we don't have. DRY doesn't eliminate the decision—it tells us we're building something new.

**DRY passes.** Move to Rams.

### Level 2: Rams (Does this earn its existence?)

**Ask**: Does real-time collaboration earn its existence in our product?

**Investigation**:
- What user need does it serve?
- Can we serve that need with less?
- Does it make the essential harder to see?

**Result**: Our product is a project management tool. Users work in teams. Real-time collaboration (seeing others' cursors, live updates) reduces coordination overhead—no more "who's editing this?" questions.

**Rams Decision**: Yes, this earns its existence. It directly serves the core user need.

**Rams passes.** Move to Heidegger.

### Level 3: Heidegger (Does this serve the whole?)

**Ask**: How does this connect to the rest of the system? Build or buy?

**Investigation**:
- If we build:
  - Pros: Control, integration, no external dependency
  - Cons: Complexity, maintenance, expertise required
- If we buy (e.g., Liveblocks, PartyKit):
  - Pros: Proven tech, maintained externally, faster shipping
  - Cons: Cost, vendor lock-in, integration complexity

**Map the connections:**
```
Current System
──────────────
┌──────────────┐
│   Database   │  ← Stores state
└──────┬───────┘
       │
┌──────▼───────┐
│  API Server  │  ← Handles requests
└──────┬───────┘
       │
┌──────▼───────┐
│  Web Client  │  ← Renders UI
└──────────────┘

With Real-time (Build)
──────────────────────
┌──────────────┐
│   Database   │
└──────┬───────┘
       │
┌──────▼───────┐     ┌─────────────────┐
│  API Server  │────→│ WebSocket Server│  ← New service
└──────┬───────┘     └────────┬────────┘
       │                      │
       │          ┌───────────┘
       │          │
┌──────▼──────────▼──┐
│    Web Client      │
└────────────────────┘

Complexity added:
- WebSocket server (deploy, monitor, scale)
- State sync between DB and WebSocket
- Conflict resolution (CRDTs or OT)
- Presence tracking
- Connection handling

With Real-time (Buy - PartyKit)
───────────────────────────────
┌──────────────┐
│   Database   │
└──────┬───────┘
       │
┌──────▼───────┐
│  API Server  │
└──────┬───────┘
       │
       │     PartyKit (external)
       │     ┌──────────────┐
       │     │  Rooms, sync │
       │     └──────┬───────┘
       │            │
┌──────▼────────────▼──┐
│    Web Client        │
└──────────────────────┘

Complexity added:
- PartyKit integration
- API for syncing critical state to DB
- Cost consideration

Tradeoff: Less infrastructure, more vendor dependency
```

**Heidegger Decision**: For real-time collaboration, buying serves the whole better than building.

**Why?**
- Our core expertise is project management, not real-time infrastructure
- PartyKit integrates via small API surface (doesn't fragment system)
- We can focus on product features instead of WebSocket edge cases
- If we later need to migrate, the integration layer makes it manageable

**Final Recommendation**: Use PartyKit. Build an abstraction layer so we could swap later if needed.

**What we removed**: Years of infrastructure complexity that doesn't serve our core value.

## The Questions in Real Time

As you build, the triad becomes automatic:

### Coding a Function
```typescript
// ❶ DRY: Have I built this before?
function formatCurrency(amount: number): string {
  // Search: Do we have formatCurrency elsewhere?
  // Result: Yes, in utils/
  // Action: Use existing function
}

// ❷ Rams: Does this earn its existence?
function formatCurrencyWithSymbolAndLocale(
  amount: number,
  symbol: string,
  locale: string
): string {
  // Question: Do we need all three params?
  // Result: Symbol and locale can be inferred from user settings
  // Action: Simplify to formatCurrency(amount)
}

// ❸ Heidegger: Does this serve the whole?
// Where is this used? Checkout, invoices, reports
// Should this live in shared utils? Yes
// Does it integrate with our i18n system? It should
// Action: Place in shared utils, connect to i18n
```

### Designing a UI
```
❶ DRY: Have I built this before?
   → Search component library for similar patterns
   → Found: DatePicker component
   → Action: Reuse or extend existing

❷ Rams: Does this earn its existence?
   → Question: Do users need date range or single date?
   → Data: 80% of uses are single date
   → Action: Default to single date, add range as opt-in

❸ Heidegger: Does this serve the whole?
   → Question: How does this fit the design system?
   → Answer: Must use Canon tokens, follow spacing conventions
   → Action: Build with design system primitives
```

### Architecting a System
```
❱ DRY: Have I built this before?
   → Yes, similar auth in previous project
   → Action: Adapt existing pattern

❷ Rams: Does this earn its existence?
   → Custom auth vs. Auth0?
   → Custom only if we need unusual flows
   → We don't → Action: Use Auth0

❸ Heidegger: Does this serve the whole?
   → Auth0 must integrate with existing user DB
   → Session state must work with our KV store
   → Action: Build integration layer that connects Auth0 to our system
```

## Common Pitfalls

### Skipping Levels
**Mistake**: Jump straight to Heidegger without checking DRY.

**Result**: You build a beautiful system integration for something you already have.

**Fix**: Always start with DRY. Fastest filter.

### Applying Wrong Level
**Mistake**: Use Rams (artifact) logic for system decisions.

**Result**: "This microservice doesn't earn its existence" → You miss that it would unify duplicated logic (a DRY concern).

**Fix**: DRY is about implementation, Rams is about features/artifacts, Heidegger is about system coherence. Match the level to the scale.

### Stopping Too Early
**Mistake**: DRY says reuse existing code. You stop there.

**Result**: You reuse code that shouldn't exist (fails Rams).

**Fix**: DRY doesn't mean "keep everything." If the thing you'd reuse shouldn't exist, Rams can delete it.

## The Spiral in Practice

The triad isn't linear—it spirals:

```
You write a function (implementation)
↓
DRY: Is this duplicated?
↓
No → Continue
↓
You finish the feature (artifact)
↓
Rams: Does this feature earn its existence?
↓
Yes → Continue
↓
You deploy the feature (system)
↓
Heidegger: Does this serve the whole?
↓
Wait—it duplicates functionality in another service
↓
BACK TO DRY: The duplication was at system level, not code level
↓
Unify the services
↓
Rams: Does the unified service earn its existence?
↓
Yes, but it's doing three things
↓
Split into focused services that compose
↓
Heidegger: Does this serve the whole?
↓
Yes—coherent, composable, unified
```

**The triad isn't checklist. It's a lens that sharpens through iteration.**

## Mastery

You've mastered the triad when:

1. **You ask the questions unconsciously** → They become how you see
2. **You catch issues before release** → The questions surface problems during design
3. **You spiral naturally** → You move between levels as understanding deepens

**The work is training your perception.** The more you practice, the faster you see.

## Final Practice

This lesson's praxis is the culmination: **Full Triad Audit**.

You'll take a real feature or system and run it through all three levels. Document your findings. Propose changes.

This is the practice that develops subtractive sight.

---

## Reflection

You've completed the Foundations path. You now understand:

- **Creation as subtraction** → Revealing truth by removing what obscures
- **DRY** → Unifying duplicated implementation
- **Rams** → Removing artifacts that don't earn existence
- **Heidegger** → Reconnecting systems to serve the whole

**What changes now?**

You see differently. When you look at code, you see duplication. When you look at features, you see excess. When you look at systems, you see disconnection.

**And you know what to do**: Remove what obscures.

This is the foundation. Everything you build on CREATE SOMETHING—craft, infrastructure, agents, method, systems—applies this discipline.

**Weniger, aber besser.** Less, but better.

**Welcome to the practice.**

---

## Cross-Property References

> **Canon Reference**: See the [Ethos page](https://createsomething.ltd/ethos) for the complete philosophical foundation of the Subtractive Triad.
>
> **Canon Reference**: The [Subtractive Triad Audit](https://createsomething.ltd/patterns/subtractive-triad-audit) pattern provides a practical framework for applying these questions.
>
> **Practice**: Try the [Workway Canon Audit](https://createsomething.space/experiments/workway-canon-audit) experiment to see the Triad applied to real code.
