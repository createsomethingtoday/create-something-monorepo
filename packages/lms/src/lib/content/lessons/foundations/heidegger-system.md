# Heidegger: System Level

## The Question

**"Does this serve the whole?"**

DRY unified your implementation. Rams judged your artifact. Now Heidegger asks: how does this artifact relate to everything else?

This is the third level of the Subtractive Triad: **the discipline of reconnecting**.

At the system level, we trace connections. Services that don't compose create duplication. Features that don't integrate create fragmentation. Properties that don't connect create silos.

**The system wants to be whole. Our job is removing what disconnects it.**

## Martin Heidegger: Being and Tools

Heidegger, 20th-century philosopher, asked: "What is Being?" His answer reshaped how we think about tools, systems, and understanding itself.

Two key concepts matter for us:

### 1. Zuhandenheit vs. Vorhandenheit

**Zuhandenheit** (ready-to-hand): The hammer disappears when you're hammering. The tool recedes into transparent use.

**Vorhandenheit** (present-at-hand): The hammer breaks. Suddenly you're aware of it—its weight, its handle, its absence of function.

**Good systems are Zuhanden.** They disappear into capability. You think about your work, not your tools.

**Fragmented systems are Vorhanden.** They constantly remind you they exist—configuration, workarounds, manual integration.

### 2. The Hermeneutic Circle

Understanding isn't linear. You can't understand the whole without understanding the parts, and you can't understand the parts without understanding the whole.

**The hermeneutic circle**: You spiral between part and whole, each informing the other, until understanding emerges.

```
     ┌─────────────┐
     │   System    │
     │   (whole)   │
     └──────┬──────┘
            │
    ┌───────▼───────┐
    │               │
    │  Understand   │
    │     Part      │
    │               │
    └───────┬───────┘
            │
    ┌───────▼───────┐
    │               │
    │  Understand   │
    │     Whole     │
    │   (deeper)    │
    └───────┬───────┘
            │
           ...
```

You read a function. That understanding informs how you see the module. That informs how you see the system. That informs how you re-read the function. The spiral continues until truth emerges.

**This is how systems want to be understood—and how they want to be built.**

## Why Disconnection Obscures

When parts don't serve the whole, the system fragments:

- **Service duplication** → Auth logic in three microservices
- **Data silos** → User state in five different databases
- **Workflow breaks** → Manual steps between automated systems
- **Cognitive gaps** → Developers can't trace how features connect

**The problem isn't complexity. The problem is incoherence.**

### Example: Fragmented Authentication

```
System (Before)
───────────────
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Web App   │      │ Mobile App   │      │   API        │
│             │      │              │      │              │
│ Auth: JWT   │      │ Auth: OAuth  │      │ Auth: Basic  │
│ Session: DB │      │ Session: KV  │      │ Session: N/A │
└─────────────┘      └──────────────┘      └──────────────┘

Problem: User state is fragmented
- Log in on web → Not logged in on mobile
- Password reset doesn't sync
- Each system has its own user table
```

The parts work. But they don't serve the whole. Users experience three different products.

**After reconnecting:**

```
System (After)
──────────────
                    ┌──────────────────┐
                    │ Identity Service │
                    │                  │
                    │ Auth: OAuth      │
                    │ Session: KV      │
                    │ Single source    │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐     ┌────▼──────┐     ┌────▼─────┐
    │  Web App   │     │ Mobile    │     │   API    │
    │            │     │           │     │          │
    │ Uses       │     │ Uses      │     │ Uses     │
    │ Identity   │     │ Identity  │     │ Identity │
    └────────────┘     └───────────┘     └──────────┘

Solution: One source of truth
- Log in anywhere → Logged in everywhere
- One user table, one session store
- Parts serve the whole
```

## The Discipline of Reconnecting

Heidegger requires **tracing threads**. You can't reconnect what you haven't mapped.

### The Mapping Practice

For any system, ask:

1. **What is the whole?** (The user experience, the business capability)
2. **What are the parts?** (Services, databases, features)
3. **How do parts connect?** (APIs, shared state, events)
4. **Where are the gaps?** (Manual steps, duplicated logic, isolated data)

**Draw it.** Literally. Boxes and arrows reveal disconnections immediately.

### Example: Notification System Audit

Let's trace how notifications work:

```
Current Flow
────────────
User action → API server → Database write
                              ↓
                    (Background job polls DB)
                              ↓
                    Email service sends email
                              ↓
                    Log to separate logging DB

Gaps found:
- Background job adds latency (polling every minute)
- Email service doesn't know about push notifications
- Logging is disconnected from the notification
- No way to trace "did this user get this notification?"
```

**After reconnecting:**

```
Improved Flow
─────────────
User action → API server → Event bus
                              ↓
                        ┌─────┴─────┐
                        │           │
                   Email Worker   Push Worker
                        │           │
                   Send email   Send push
                        │           │
                        └─────┬─────┘
                              ↓
                    Notification Log (unified)
                              ↓
                    "User X received notification Y via email,push"
```

**What changed:**
- Event bus connects services (no polling)
- Workers compose (both listen to same events)
- Logging is integrated (automatic trail)
- System is traceable (query notification log)

## The Hermeneutic Circle in Practice

You can't design the perfect system upfront. Understanding emerges through the spiral:

1. **Build a part** → Implement email notifications
2. **See the whole** → Users want push too
3. **Revise the part** → Abstract to "notification worker"
4. **See the whole better** → Logging should be unified
5. **Revise the part again** → Add logging to worker base class
6. Continue until coherence emerges

**This isn't failure—it's the method.** The system reveals itself through iteration.

### Example: The CREATE SOMETHING Circle

CREATE SOMETHING operates as four properties:

```
.ltd (Philosophy) → provides criteria for →
.io (Research)    → validates →
.space (Practice) → applies to →
.agency (Services) → tests and evolves →
.ltd (Philosophy)
```

Each property serves the whole:

- **.ltd** defines what good design means (Subtractive Triad)
- **.io** researches and documents patterns
- **.space** builds learning experiences
- **.agency** delivers client work

**The hermeneutic circle:**
- Client work reveals edge cases → New patterns emerge
- New patterns get documented on .io → Philosophy deepens on .ltd
- Deepened philosophy → Better learning experiences on .space
- Better learning → Better client work

**No property makes sense in isolation.** Each serves the whole.

## When NOT to Reconnect

Heidegger is about serving the whole, not forcing unification.

**Don't reconnect:**
- **Intentionally independent systems** → Payments and analytics don't need to share state
- **Different lifecycles** → The blog and the checkout flow can deploy independently
- **Clear boundaries** → Microservices with well-defined contracts

**Do reconnect:**
- **Duplicated logic** → Same business rules in multiple services
- **Fragmented state** → User data scattered across databases
- **Broken workflows** → Manual steps between automated systems

**The test**: If disconnection creates duplication or fragmentation, reconnect. If connection would couple unrelated concerns, keep separate.

## Code-Level Hermeneutic Circle

The hermeneutic circle appears in code understanding:

```typescript
// You read this function
function processOrder(order: Order) {
  validateOrder(order);  // What does this do?
  chargeCustomer(order.payment);  // And this?
  scheduleShipment(order.items);  // And this?
  notifyCustomer(order.email);  // And this?
}

// You read validateOrder to understand processOrder
function validateOrder(order: Order) {
  if (!order.items.length) throw new Error('Empty order');
  if (!order.payment) throw new Error('No payment');
  // Now you understand processOrder better
}

// You return to processOrder with new understanding
// Now you see the flow: validate → charge → ship → notify
// This informs how you'd modify it

// You read chargeCustomer to understand payment flow
// That understanding circles back to processOrder
// Each spiral deepens your understanding of the whole
```

**You can't shortcut this.** Understanding emerges through the spiral.

## The Practice

Developing Heidegger sight requires:

1. **Map the system** → Draw boxes and arrows
2. **Trace threads** → Follow data and control flow
3. **Find gaps** → Where are manual steps? Duplicated logic?
4. **Reconnect** → Shared services, event buses, unified state

**The habit**: Before building a new service, ask "What already does this?" and "How will this connect?"

## Common Disconnection Patterns

### Service Duplication
Three services implement authentication → One identity service

### Data Silos
User state in five databases → One user service, others reference it

### Manual Integration
Export CSV, import to analytics tool → Event stream to analytics

### Isolated Features
Search doesn't know about recently viewed → Search uses browse history

## Heidegger in Practice

The discipline becomes automatic:

1. Plan a new feature
2. Map where it connects to existing parts
3. Identify shared concerns (auth, logging, state)
4. Build connection points before building the feature
5. Test that it serves the whole, not just itself

**The goal isn't one monolith.** The goal is **coherent composition**.

## The Complete Triad

Now you've seen all three levels:

- **DRY** (Implementation) → Unify duplicated logic
- **Rams** (Artifact) → Remove what doesn't earn existence
- **Heidegger** (System) → Reconnect to serve the whole

**They're not separate.** They're one discipline (subtractive revelation) at three scales.

In the final lesson, you'll learn to apply all three together.

---

## Reflection

Before the praxis exercise:

1. Draw a system you work with. Box-and-arrow style. What are the parts?
2. Trace one user action through the system. Where does it break? Where is it manual?
3. What services duplicate logic? What data is siloed?

**Praxis**: You'll map a real system, find disconnections, and propose reconnections.
