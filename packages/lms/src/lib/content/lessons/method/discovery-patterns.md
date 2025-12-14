# Discovery Patterns

## The Principle

**Understanding client needs through the hermeneutic lens.**

Discovery is not requirements gathering. It's the process of understanding the client's world deeply enough to serve it well.

## The Hermeneutic Approach

The hermeneutic circle applies to client discovery:

```
Understand the Part → Revise Understanding of Whole
         ↑                      ↓
         └────── Iterate ───────┘
```

You can't understand a feature request without understanding the business. You can't understand the business without understanding specific problems. Understanding deepens through iteration.

## Before Discovery: Preparation

### Research the Domain
- Industry trends and challenges
- Common problems and solutions
- Regulatory environment
- Competitive landscape

### Research the Client
- Company history and trajectory
- Public information (funding, news, social)
- Current technology stack (if visible)
- Key stakeholders

### Prepare Questions
Not a script—a framework:
- Open questions for exploration
- Probing questions for depth
- Clarifying questions for precision
- Challenging questions for assumptions

**Come informed, leave more informed.**

## The Discovery Session

### Opening: Set the Frame

```markdown
"We're here to understand your situation deeply before proposing anything.
We might ask questions that seem obvious—we want to understand from your perspective.
Everything shared stays confidential. Honest answers help us serve you better."
```

### Phase 1: Current State (What Is)

Understand the present before imagining the future:

**Questions:**
- "Walk me through a typical day/week for your team"
- "What systems do you use? How do they connect?"
- "What works well that we should preserve?"
- "What causes the most friction?"

**Listen for:**
- Pain points (explicit frustrations)
- Workarounds (adaptations that reveal gaps)
- Dependencies (connections that constrain change)
- Expertise (knowledge that should be leveraged)

### Phase 2: Desired State (What Should Be)

Understand success, not solutions:

**Questions:**
- "If this project succeeds, what changes?"
- "How would you know it worked?"
- "What does success look like in 6 months? 2 years?"
- "What would you measure?"

**Listen for:**
- Outcomes (real goals, not feature requests)
- Constraints (time, budget, technology, culture)
- Priorities (what matters most when trade-offs arise)
- Fears (what could go wrong)

### Phase 3: Constraints (What's Fixed)

Understand the immovable:

**Questions:**
- "What can't change, even if we wanted it to?"
- "What's been decided already?"
- "Who needs to approve decisions?"
- "What timeline is driven by external factors?"

**Listen for:**
- Hard constraints (regulatory, contractual, technical)
- Soft constraints (preferences, habits, politics)
- Decision-makers (who actually decides)
- Risks (what could derail the project)

### Phase 4: History (What Was Tried)

Learn from the past:

**Questions:**
- "What have you tried before?"
- "What worked? What didn't?"
- "Why didn't previous attempts succeed?"
- "What would you do differently?"

**Listen for:**
- Patterns (recurring themes)
- Learnings (hard-won wisdom)
- Skepticism (burned before)
- Openness (ready for new approaches)

### Closing: Summarize and Align

```markdown
"Here's what I heard:
- Your core challenge is X
- Success looks like Y
- Key constraints are Z
- Previous attempts faced A, B, C

Did I understand correctly? What did I miss?"
```

**Never leave without confirming understanding.**

## Discovery Artifacts

### Problem Statement

Clear, concise articulation of the core problem:

```markdown
**Problem Statement**

[Client name] needs to [core capability] because [business reason].

Currently, [current state/pain]. This causes [impact].

Success means [measurable outcome].

Key constraints: [top 3 constraints]
```

### Stakeholder Map

Who matters and how:

```
                Decision Maker
                     │
         ┌───────────┼───────────┐
         │           │           │
    Influencer  Influencer  Influencer
         │           │           │
    ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
    User User User User User User User
```

Include:
- Name and role
- Level of influence
- Concerns and priorities
- Communication preference

### Current State Diagram

Visual representation of existing systems:

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Website │───→│   CRM   │───→│  Email  │
└─────────┘    └─────────┘    └─────────┘
     ↑              ↓
     │         ┌─────────┐
     └─────────│  Sales  │ (manual)
               └─────────┘
```

Include:
- Systems and tools
- Data flows
- Manual processes (often hidden)
- Integration points

### Desired State Diagram

What success looks like:

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Website │───→│   CRM   │───→│  Email  │
└─────────┘    └─────────┘    └─────────┘
                    ↓
              ┌─────────┐
              │  Sales  │ (automated)
              └─────────┘
```

## Discovery Anti-Patterns

### The Requirements Checklist

```markdown
❌ "Do you need feature A?"
   "What about feature B?"
   "How many users?"
   "What's your budget?"
```

This produces feature lists, not understanding.

### The Solution Pitch

```markdown
❌ "We use React/Vue/Angular which is the best because..."
   "Let me show you what we did for another client..."
   "Our platform can do X, Y, Z..."
```

This sells before understanding.

### The Yes-Man

```markdown
❌ "Sure, we can do that"
   "No problem, we'll add it"
   "Whatever you need"
```

This creates unrealistic expectations.

### The Expert

```markdown
❌ "That won't work because..."
   "You should do X instead"
   "In my experience, this is wrong"
```

This shuts down information flow.

## The Discovery Mindset

### Genuine Curiosity

Assume you don't understand. Ask why repeatedly:

```markdown
"We need faster reporting"
→ "Why is speed important?"
"Because decisions are delayed"
→ "What decisions?"
"Marketing budget allocation"
→ "How often do you reallocate?"
"Monthly"
→ "So if reports were ready by the 1st, that would work?"
"Actually, yes"

(The real need was predictable timing, not raw speed)
```

### Comfortable Silence

After asking, wait. Resist filling silence:

```markdown
"What's the biggest challenge?"
...
(silence)
...
"Well, there's the technical debt, but honestly, it's that
marketing and engineering don't talk. We build things they
never asked for."

(Real answer comes after the pause)
```

### Productive Challenge

Challenge assumptions respectfully:

```markdown
"We need a mobile app"
→ "Help me understand—what would users do in the app?"
"Check their account balance"
→ "Is there a reason the mobile website doesn't work for that?"
"It's too slow"
→ "What if we made the mobile web fast? Would you still need an app?"
"...maybe not"
```

## Multi-Stakeholder Discovery

When there are multiple stakeholders:

### Individual Sessions First

Different stakeholders have different:
- Concerns
- Information
- Candor levels

Meet separately before bringing together.

### Synthesis Session

After individual sessions, bring alignment:

```markdown
"We've spoken with [list]. Here's what we heard:

Common themes:
- Everyone agrees on X
- Everyone wants Y

Different perspectives:
- Some prioritize A, others B
- Timeline expectations vary

Let's discuss the differences..."
```

### Decision Maker Last

Get the full picture before meeting the decision maker:
- Present synthesized understanding
- Highlight trade-offs clearly
- Enable informed decisions

---

## Reflection

Before the praxis:

1. When was the last time a client's stated need differed from their real need?
2. How might your next discovery session change with a hermeneutic approach?
3. What questions do you avoid asking that you should?

**Praxis**: Conduct a discovery session using the hermeneutic framework.

---

## Cross-Property References

> **Canon Reference**: See [Hermeneutic Spiral](https://createsomething.ltd/patterns/hermeneutic-spiral) for the philosophical foundation of iterative understanding.
>
> **Research Depth**: Read [Hermeneutic Spiral in UX](https://createsomething.io/papers/hermeneutic-spiral-ux) for how this pattern applies to user experience research.
>
> **Practice**: The Service Delivery Patterns skill applies these discovery principles in actual client engagements.
