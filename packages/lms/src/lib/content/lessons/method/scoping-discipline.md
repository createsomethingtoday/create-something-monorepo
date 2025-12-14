# Scoping Discipline

## The Principle

**Subtractive scoping—less, but better.**

Scoping is the most important phase of any project. Get it wrong, and no amount of execution excellence will save you. Get it right, and the project almost runs itself.

## The Scoping Paradox

Traditional scoping is additive:
- "What else might they need?"
- "What if we add X for extra value?"
- "Let's include Y just in case"
- "Z would be nice to have"

Result: Bloated scope, unclear priorities, inevitable overrun.

**WORKWAY scoping is subtractive:**
- "What can we remove?"
- "What's the smallest intervention with the most impact?"
- "What can wait until we learn more?"
- "What solves the problem, not the wish list?"

## The Minimum Valuable Scope

Every project has a minimum scope that:
1. Solves the core problem
2. Delivers measurable value
3. Can be executed with confidence
4. Provides learning for next phase

```
                    Maximum Scope
         ┌─────────────────────────────────────┐
         │   Nice to have                      │
         │     ┌─────────────────────────────┐ │
         │     │   Should have               │ │
         │     │     ┌─────────────────────┐ │ │
         │     │     │   Must have         │ │ │
         │     │     │     ┌─────────────┐ │ │ │
         │     │     │     │  CORE NEED  │ │ │ │ ← Start here
         │     │     │     └─────────────┘ │ │ │
         │     │     └─────────────────────┘ │ │
         │     └─────────────────────────────┘ │
         └─────────────────────────────────────┘
```

**Start with the core. Expand only with evidence.**

## The Scoping Process

### Step 1: List Everything

Write down everything that could be in scope:
- Client requests
- Discovered needs
- Dependencies
- Nice-to-haves

No filtering yet—capture completely.

### Step 2: Categorize

Apply the MoSCoW framework with discipline:

| Category | Meaning | WORKWAY Interpretation |
|----------|---------|----------------------|
| **Must** | Project fails without | Include |
| **Should** | Significantly improves value | Evaluate carefully |
| **Could** | Nice but not critical | Defer |
| **Won't** | Out of scope for this phase | Explicitly exclude |

**Be honest. Most "musts" are actually "shoulds."**

### Step 3: Challenge Each Must

For each "must," ask:

1. **"Why must we do this?"**
   If the answer is "because the client asked," dig deeper.

2. **"What happens if we don't?"**
   If the answer is "inconvenience" not "failure," it's a should.

3. **"Is there a simpler way?"**
   Configuration vs. custom. Existing vs. built.

4. **"Can we defer this?"**
   Will we learn something that changes the approach?

### Step 4: Define Success Criteria

Each item needs measurable success:

```markdown
**Item**: User authentication
**Success**: Users can log in within 3 seconds
**Measurement**: Page load time in production

**Item**: Report generation
**Success**: Reports available by 9am daily
**Measurement**: Automated monitoring

**Item**: Mobile responsiveness
**Success**: Full functionality on phones
**Measurement**: Cross-device testing matrix
```

### Step 5: Identify Dependencies

Map what blocks what:

```
Authentication ───→ User Dashboard ───→ Report Access
                           ↓
                    User Management
```

Dependencies reveal critical path and risk.

### Step 6: Write the Scope Document

Clear, concise, shared understanding:

```markdown
# Project Scope: [Name]

## Problem Statement
[One paragraph describing the core problem]

## In Scope
1. [Item] - [Success Criteria]
2. [Item] - [Success Criteria]
3. [Item] - [Success Criteria]

## Explicitly Out of Scope
1. [Item] - [Reason]
2. [Item] - [Reason]

## Assumptions
- [Assumption that affects scope]
- [Assumption that affects scope]

## Dependencies
- [External dependency]
- [Internal dependency]

## Risks
- [Risk] - [Mitigation]

## Timeline
- Phase 1: [Description] - [Duration]
- Phase 2: [Description] - [Duration]
```

## Scope Change Management

Scope will want to change. Manage it:

### The Change Request Process

```markdown
**Request**: [What the client wants to add]
**Reason**: [Why they want it]

**Impact Assessment**:
- Timeline: +X days
- Cost: +$Y
- Risk: [New risks introduced]
- Trade-off: [What gets deprioritized]

**Recommendation**: [Accept/Defer/Reject with reasoning]
```

### The Trade-off Conversation

```markdown
Client: "Can we add feature X?"

WORKWAY: "Yes—here's the trade-off:
- Adding X means we either delay by 2 weeks, or
- We deprioritize Y (which you said was important for launch)

Which would you prefer?"
```

**Never say "no"—present trade-offs.**

### Scope Creep Signals

Watch for:
- "While we're at it..."
- "Could we also..."
- "I thought we agreed..."
- "This should be easy..."

When you hear these, document and address formally.

## Anti-Patterns

### The Kitchen Sink

```markdown
❌ "Let's include everything we might need"

Result: 3x budget, 4x timeline, 0.5x quality
```

### The Vague Scope

```markdown
❌ "Build a modern, user-friendly platform"

Result: Endless debates about what "modern" means
```

### The Fixed Everything

```markdown
❌ Fixed scope + Fixed timeline + Fixed budget

Result: One of these will break (usually quality)
```

### The Handshake Agreement

```markdown
❌ "We trust each other, no need for documents"

Result: Different memories of what was agreed
```

## Phased Scoping

Break large projects into phases:

### Phase 1: Prove Value
- Smallest viable intervention
- Learn what works
- Build trust

### Phase 2: Expand
- Apply learnings
- Add scope based on evidence
- Increase investment

### Phase 3: Optimize
- Refine based on usage
- Remove what doesn't work
- Polish what does

**Each phase can proceed or stop based on value delivered.**

## Pricing from Scope

Scope drives pricing:

```markdown
Scope: 3 must-haves, 2 should-haves

Estimate:
- Must-haves: 40 hours (high confidence)
- Should-haves: 20 hours (medium confidence)
- Buffer: 15 hours (for unknowns)
- Total: 75 hours

Value Assessment:
- Problem costs client $50,000/year
- Solution reduces to $10,000/year
- Annual value: $40,000

Price: $30,000 (75% of first-year value)
```

**Scope enables confident pricing. Vague scope means risky pricing.**

## The Subtractive Mindset

Before finalizing scope, ask:

1. **What can we remove and still succeed?**
2. **What are we assuming that might be wrong?**
3. **What would make this scope simpler?**
4. **What are we afraid to say no to?**

**The discipline is saying no to good ideas to focus on great ones.**

---

## Reflection

Before moving on:

1. Think of a project that went over scope. What should have been cut?
2. What's the smallest project you could do that would still deliver real value?
3. How do you handle scope change requests today?

**Great projects are defined as much by what they exclude as what they include.**

---

## Cross-Property References

> **Canon Reference**: See [Iterative Reduction](https://createsomething.ltd/patterns/iterative-reduction) for the philosophical basis of subtractive scoping.
>
> **Canon Reference**: The [Subtractive Triad Audit](https://createsomething.ltd/patterns/subtractive-triad-audit) pattern applies DRY → Rams → Heidegger to scope decisions.
>
> **Research Depth**: Read [Subtractive Form Design](https://createsomething.io/papers/subtractive-form-design) for how removal creates clarity in all design domains.
