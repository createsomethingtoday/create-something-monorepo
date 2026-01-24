# Automotive Translation

## Objective

Translate technical automation explanations into automotive language that clients can understand and remember.

## Context

The automotive framework provides a shared vocabulary for explaining automation infrastructure. When clients understand workflows as "vehicles," they can reason about costs, failures, and capabilities without technical knowledge.

**The automation layer = the automotive layer.**

## The Parts Mapping Reference

Use this mapping throughout the exercise:

| Vehicle Part | Cloudflare Product | Function |
|--------------|-------------------|----------|
| **Engine** | Workers | Where execution happens |
| **Transmission** | Durable Objects | State coordination |
| **Fuel Tank** | D1 | Data persistence |
| **Turbocharger** | Workers AI | Intelligence boost |
| **Ignition** | Triggers | What starts the engine |
| **Dashboard** | Analytics/Logs | What the driver sees |
| **Fuel Lines** | Queues | Message passing |
| **Trunk** | R2 | Bulk storage |

---

## Exercise 1: Translate Technical Descriptions

### Scenario A: Workflow Architecture

**Technical description** (what an engineer might say):

> "This workflow uses Cloudflare Workers for serverless execution, triggered by Stripe webhooks. State is coordinated through Durable Objects, with persistence in D1. For email parsing, we leverage Workers AI. The workflow outputs to Notion via their API."

**Your translation** (using automotive language):

```markdown
[Write your translation here]

Hints:
- What's the ignition? (webhook)
- What's the engine? (Workers)
- What's the turbocharger? (Workers AI)
- What's the destination? (Notion)
```

### Scenario B: Error Explanation

**Technical description**:

> "The workflow failed due to a rate limit on the Notion API. The Durable Object state shows 47 pending writes that couldn't complete. We need to implement exponential backoff with jitter."

**Your translation** (what to tell the client):

```markdown
[Write your translation here]

Hints:
- Traffic jam metaphor (rate limit)
- Transmission backed up (pending state)
- Solution: smoother acceleration (backoff)
```

### Scenario C: Cost Explanation

**Technical description**:

> "Monthly costs: Workers invocations ($4.50), D1 reads ($1.20), D1 writes ($0.80), R2 storage ($2.30), Workers AI tokens ($8.40). Total: $17.20."

**Your translation** (for the invoice):

```markdown
[Write your translation here]

Hints:
- Fuel efficiency (compute costs)
- Trunk space (storage)
- Turbo boost (AI)
```

---

## Exercise 2: Apply the Outcome Test

For each description, mark whether it **passes** or **fails** the outcome test. Users describe destinations, not mechanics.

| Description | Pass/Fail | Why |
|-------------|-----------|-----|
| "Your meetings now document themselves in Notion" | | |
| "The Workers function processes webhook payloads" | | |
| "Follow-ups happen automatically after calls" | | |
| "D1 stores the meeting metadata for lookup" | | |
| "Your CRM updates without manual entry" | | |
| "The Durable Object coordinates transcript fetching" | | |

---

## Exercise 3: Write a Client Proposal

You're proposing a meeting intelligence workflow. Write the **What You Get** section using automotive language.

### Technical Specification (for reference)

- **Trigger**: Zoom `recording.completed` webhook
- **Processing**: Workers fetches transcript, Workers AI summarizes
- **Storage**: D1 for metadata, R2 for audio files
- **Output**: Notion page with summary, Slack notification

### Your Proposal Section

Write a client-facing description (100-150 words) that:
1. Uses automotive language
2. Focuses on outcomes, not mechanics
3. Passes the outcome test
4. Includes at most one automotive metaphor per concept

```markdown
## What You Get

[Write your proposal section here]
```

---

## Exercise 4: Failure Communication

A client's workflow failed. Write the notification message using automotive language.

### Technical Error Log

```json
{
  "error": "DURABLE_OBJECT_STORAGE_LIMIT",
  "message": "Storage limit exceeded for Durable Object: meeting-state",
  "context": {
    "currentSize": "1.2GB",
    "maxSize": "1GB",
    "meetingsProcessed": 847
  }
}
```

### Your Client Message

Write a Slack notification that:
1. Explains what happened (using automotive terms)
2. Explains the impact on their workflow
3. Proposes a fix
4. Doesn't use technical jargon

```markdown
[Write your notification here]
```

---

## Exercise 5: Audit Your Past Work

Review a technical document, proposal, or client message you've written.

### Step 1: Identify Technical Jargon

List every technical term:
1.
2.
3.
4.
5.

### Step 2: Map to Automotive

For each term, identify the automotive equivalent:

| Technical Term | Automotive Term |
|----------------|-----------------|
| | |
| | |
| | |

### Step 3: Rewrite

Rewrite the document using automotive language.

### Step 4: Apply the Outcome Test

Does your new version focus on destinations or mechanics?

---

## Success Criteria

- [ ] All technical descriptions translated to automotive language
- [ ] Outcome test correctly applied (6/6)
- [ ] Proposal section passes the outcome test
- [ ] Failure notification is clear without jargon
- [ ] Past work audited and translated

## Tone Check

Before submitting, verify your translations:

**German engineering tone** (correct):
> "The engine runs across 300+ locations. Your meeting ends, the ignition fires, and notes arrive in Notion automatically."

**American marketing tone** (avoid):
> "TURBOCHARGED meeting notes! 🚀 BLAZING FAST automation! Your productivity SUPERCAR!"

---

## Reflection

After completing this exercise:

1. Which translation was hardest? Why?
2. How does automotive language change client conversations?
3. What happens when you overuse the metaphor?

**The best automotive language is invisible—it clarifies without calling attention to itself.**
