# Discovery Call Script

**Duration:** 30 minutes
**Goal:** Understand if we can help, and what "help" would look like.

---

## Before the Call (5 min prep)

Review any available context:
- [ ] Website/LinkedIn
- [ ] Referral source notes
- [ ] Any previous correspondence
- [ ] Their tech stack (if known)

**Mindset:** We're here to understand, not to sell. The goal is clarity for both parties.

---

## Opening (2 minutes)

> "Thanks for making time. Before we dive in—what prompted you to reach out?"

Listen. Don't fill silence. Their answer reveals priority.

**If referred:**
> "How do you know [referrer]? What did they tell you about what we do?"

---

## The Problem (10 minutes)

### Surface the Pain

> "Walk me through a typical week. What's taking more time or energy than it should?"

Follow-up questions:
- "When did this start becoming a problem?"
- "What have you tried so far?"
- "What happens if nothing changes?"

### Quantify the Impact

> "If you had to put a number on it—hours per week, cost per month, deals lost—what would you estimate?"

**Note:** People often underestimate. Gently probe: "Is that just you, or the whole team?"

### Desired State

> "If we fast-forward six months and this is solved—what does that look like? What are you doing instead?"

---

## The Triad Assessment (5 minutes)

Based on what they've shared, mentally map to the Subtractive Triad:

| Level | Question | Signal |
|-------|----------|--------|
| **Implementation (DRY)** | "Are you doing the same thing in multiple places?" | Repeated manual processes, copy-paste workflows |
| **Artifact (Rams)** | "What would you eliminate if you could?" | Features no one uses, reports no one reads |
| **System (Heidegger)** | "What's disconnected that should be connected?" | Data silos, decision bottlenecks, coordination overhead |

**Ask the diagnostic question:**

> "If I'm hearing you right, the core issue is [paraphrase]. Is that accurate, or am I missing something?"

Wait for confirmation. Adjust if needed.

---

## Fit Assessment (5 minutes)

### Our Side

Internally evaluate:
- Do we have a service that addresses this?
- Is the scope realistic for their timeline/budget?
- Are they decision-makers or do we need another call?

### Their Side

> "Have you worked with agencies or consultants before? What worked? What didn't?"

> "What's your timeline for making a decision on this?"

> "Besides yourself, who else needs to be involved in this decision?"

---

## Next Steps (5 minutes)

### If Good Fit

> "Based on what you've described, I think we can help. Here's what I'd suggest as next steps:
>
> 1. I'll send you a brief write-up of what I heard today
> 2. If that resonates, we'll put together a proposal
> 3. You review, we answer questions, and you decide
>
> Does that work for you?"

**Timeline commitment:**
> "I can have that write-up to you by [day]. What's the best email?"

### If Maybe

> "I want to be honest—I'm not 100% sure we're the right fit for this. Let me think on it and send you a note either way by [day]. Would that work?"

### If Not a Fit

> "I appreciate you sharing all of this. Based on what you've described, I don't think we're the right partner for this particular need. [Reason: scope, timeline, expertise mismatch].
>
> What I can do is [alternative: recommend someone else, point to a resource, suggest a different approach]."

**Graceful exit:** "Is there anything else I can help clarify before we wrap up?"

---

## After the Call (5 minutes)

1. **Send thank-you email** (within 2 hours)
2. **Log the call** in CRM/notes with:
   - Company, contact, role
   - Problem summary (1-2 sentences)
   - Triad level assessment
   - Estimated scope/budget range
   - Next step and deadline
3. **Create proposal input** if proceeding:
   ```bash
   # Use the proposal API
   curl -X POST https://createsomething.agency/api/proposals \
     -H "Content-Type: application/json" \
     -d '{ ... }'
   ```

---

## Email Templates

### Thank You (Same Day)

```
Subject: Following up from our call

[Name],

Thanks for the conversation today. Here's what I heard:

**The Problem:** [1-2 sentence summary]

**What We'd Remove:** [Triad-aligned framing]

**Next Step:** [What you committed to]

I'll have [deliverable] to you by [day]. Reply to this thread with any questions in the meantime.

Best,
Micah
```

### Proposal Follow-Up (When Ready)

```
Subject: Proposal: [Service] for [Company]

[Name],

Attached is the proposal we discussed. Key points:

- **Timeline:** [X] weeks
- **Investment:** [Price]
- **What We Remove:** [Top 2-3 items from triad assessment]

Take your time reviewing. Happy to hop on a quick call if questions come up.

Best,
Micah

P.S. The proposal is valid for 30 days. After that, we'd need to revisit scope/pricing.
```

### Not a Fit (Graceful Decline)

```
Subject: Thanks for considering us

[Name],

I've thought more about our conversation, and I don't think we're the right fit for this engagement. [Brief, honest reason].

A few thoughts that might help:
- [Alternative recommendation or resource]
- [Different approach they might consider]

If your needs evolve, feel free to reach back out. Happy to revisit.

Best,
Micah
```

---

## Red Flags

Watch for these during the call:

| Signal | Meaning | Response |
|--------|---------|----------|
| "We need this done ASAP" | Unrealistic timeline | "What's driving the urgency? Let's see if there's a phased approach." |
| "Can you give me a quote right now?" | Price shopping | "I'd rather give you an accurate number than a fast one. Let me think on scope." |
| "Our last agency was terrible" | Pattern or isolated? | "What specifically went wrong? I want to make sure we don't repeat that." |
| "I need to check with my boss" | Not the decision-maker | "Should we loop them in for the next conversation?" |
| "We don't really have a budget yet" | Not ready to buy | "When you do have clarity on budget, what range would be realistic?" |

---

## Subtractive Triad Reference

Use this to map their problem to our services:

| Triad Level | Question | Service Fit |
|-------------|----------|-------------|
| **Implementation** | "Have I built this before?" | Web Development, Canon CSS |
| **Artifact** | "Does this earn its existence?" | Automation, Automation Patterns |
| **System** | "Does this serve the whole?" | Agentic Systems, Partnership, Transformation |

**Philosophy:** We don't add features. We remove what obscures.

---

## Quick Reference

**Proposal API:**
```bash
curl https://createsomething.agency/api/proposals  # GET for docs
curl -X POST https://createsomething.agency/api/proposals -d '...'  # Generate
```

**Services:**
- `web-development` ($5,000+, 2-4 weeks)
- `automation` ($15,000+, 4-8 weeks)
- `agentic-systems` ($35,000+, 8-16 weeks)
- `partnership` ($5,000/mo, ongoing)
- `transformation` ($50,000+, 12-16 weeks)
- `advisory` ($10,000/mo, 6-month min)

**CTA:** createsomething.agency/discover
