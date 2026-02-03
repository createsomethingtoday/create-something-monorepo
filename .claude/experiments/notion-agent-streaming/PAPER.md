# Streaming Agent Execution: Transparency as Perceived Performance

**Project:** Notion Agent Demo
**Date:** January 29, 2026
**Author:** CREATE SOMETHING

---

## Abstract

We built a Notion automation agent that takes ~20 seconds to execute. Initial user testing revealed significant dissatisfaction despite correct functionality. Adding real-time streaming of execution steps—with no change to actual performance—transformed user perception from "slow and broken" to "fast and trustworthy."

This paper documents the implementation and argues that **transparency is a form of performance optimization**.

---

## I. The Problem

### 1.1 Initial Implementation

Our Notion agent allows users to automate database operations through natural language:

```
Prompt: "Find all tasks titled 'This is a task' and mark them as Done"
```

The agent:
1. Queries the Notion API for database schema
2. Searches for matching pages
3. Updates each page's status property
4. Returns a summary

Total execution time: **15-25 seconds** (depending on LLM inference and Notion API latency).

### 1.2 User Feedback

Initial UX: Click "Run" → loading spinner → result after 20 seconds.

User reactions:
- "Is it stuck?"
- "Did something break?"
- "Why is this taking so long?"
- "I don't trust it's actually doing anything"

The agent worked correctly. Users didn't believe it.

### 1.3 The Perception Gap

A 20-second wait with no feedback creates uncertainty. Users don't know if:
- The request was received
- Processing has started
- Progress is being made
- An error has occurred

This uncertainty compounds with each passing second. By 10 seconds, users assume failure.

---

## II. The Solution: Streaming Execution

### 2.1 Server-Sent Events

We implemented SSE (Server-Sent Events) to stream agent execution steps in real-time:

```typescript
// Server endpoint
const stream = new ReadableStream({
  async start(controller) {
    const sendEvent = (event: string, data: unknown) => {
      controller.enqueue(encoder.encode(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      ));
    };

    // Execute with callbacks
    await executeAgentWithStreaming(ai, context, (step) => {
      sendEvent('step', step);
    });
  }
});

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

```typescript
// Client consumption
const eventSource = new EventSource(`/api/execute/stream?agent_id=${id}`);

eventSource.addEventListener('step', (event) => {
  const step = JSON.parse(event.data);
  steps = [...steps, step];
});
```

### 2.2 Step Granularity

We emit steps at meaningful boundaries:

| Step Type | Example Content |
|-----------|-----------------|
| `thinking` | "Loading database schemas..." |
| `thinking` | "Thinking... (step 2)" |
| `tool_call` | "query_database: finding pages with title..." |
| `tool_result` | "Found 2 matching pages" |
| `response` | "Complete: updated 2 pages" |

Each step represents a discrete, understandable action.

### 2.3 UI Implementation

Following Tufte principles, we display steps as a numbered list:

```
Activity                    8 steps
────────────────────────────────────
 1. Loading database schemas...
 2. Starting agent "Status Change"
 3. query_database: finding pages
 4. Found 2 matching pages
 5. update_page: page abc123
 6. Updated successfully
 7. update_page: page def456
 8. Complete
```

No emojis. No animations. Pure information density.

---

## III. Pre-fetching: Eliminating Visible Errors

### 3.1 The Schema Problem

Initial runs often showed errors:

```
3. query_database: finding pages with title "This is a task"
4. Error: Could not find property "Name"
5. get_database_schema: getting correct property names
6. Schema shows property is "Title", not "Name"
7. query_database: retrying with correct property
```

The agent recovered correctly—but users saw the error and lost confidence.

### 3.2 The Fix: Schema Pre-fetching

We pre-fetch database schemas before the agent runs:

```typescript
async function prefetchSchemas(client: NotionClient, dbIds: string[]) {
  const schemas = [];
  for (const dbId of dbIds) {
    const db = await client.getDatabase(dbId);
    schemas.push(formatSchema(db));
  }
  return schemas.join('\n');
}

// Include in user message
const userMessage = prompt + '\n\n## Database Schemas\n' + schemas;
```

Now the agent knows property names upfront. No visible errors. No recovery steps.

### 3.3 Trade-off

Pre-fetching adds ~1-2 seconds of latency before the agent starts. But users see:

```
1. Loading database schemas...
2. Starting agent "Status Change"
3. query_database: finding pages...
```

The extra step is visible and purposeful. Users understand "it's loading data" better than "it made a mistake."

---

## IV. Results

### 4.1 Quantitative

| Metric | Before | After |
|--------|--------|-------|
| Execution time | 18-22s | 19-24s |
| Visible errors | 60% of runs | 5% of runs |
| Steps shown to user | 0 (just result) | 6-12 |

Execution time slightly increased due to pre-fetching. Error visibility dramatically decreased.

### 4.2 Qualitative

User feedback shifted from:
- "Is it stuck?" → "I can see it working"
- "Why so slow?" → "It's doing a lot of steps"
- "Did it fail?" → "I see exactly what happened"

The same 20-second operation feels faster because users can track progress.

### 4.3 Debugging Benefits

When errors occur, users can now report:

> "It failed on step 5 when trying to update the Status property"

Instead of:

> "It didn't work"

This transforms support from "reproduce the issue" to "fix the specific step."

---

## V. Principles Extracted

### 5.1 Transparency Reduces Perceived Latency

A 20-second wait with progress feels shorter than a 20-second wait with nothing.

This isn't psychological trickery—it's information design. Users processing new information don't experience time as "waiting." They experience it as "learning."

### 5.2 Visible Work Builds Trust

Users trust what they can verify. An agent that shows its reasoning is trustworthy even when slow. An agent that hides its work is suspicious even when fast.

### 5.3 Pre-compute to Prevent Visible Errors

Errors that users see—even recovered errors—damage confidence. If you can prevent an error by doing work upfront, do it.

The cost: slightly more latency.
The benefit: dramatically fewer visible failures.

### 5.4 Tufte Applies to Agent UX

Edward Tufte's principles for data visualization apply directly:

| Tufte Principle | Agent UX Application |
|-----------------|---------------------|
| Maximize data-ink ratio | Every displayed step is meaningful |
| Remove chartjunk | No decorative spinners or animations |
| Show causality | Steps follow logical sequence |
| Enable comparisons | Numbered list enables progress tracking |

---

## VI. Implementation Details

### 6.1 Stack

- **Frontend**: SvelteKit with `EventSource` for SSE consumption
- **Backend**: Cloudflare Workers with `ReadableStream` for SSE
- **LLM**: Cloudflare Workers AI (Llama 3.1 70B)
- **API**: Notion API v2022-06-28

### 6.2 Key Code Patterns

**Executor with callback:**

```typescript
export async function executeAgentWithStreaming(
  ai: Ai,
  context: AgentContext,
  onStep: (step: AgentStep) => void
): Promise<AgentExecutionResult> {
  const emitStep = (step: AgentStep) => {
    steps.push(step);
    onStep(step); // Stream to client
  };
  
  // ... execution loop calls emitStep() at each boundary
}
```

**SSE endpoint:**

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    const send = (event: string, data: unknown) => {
      controller.enqueue(encoder.encode(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      ));
    };
    
    await executeAgentWithStreaming(ai, ctx, (step) => send('step', step));
    controller.close();
  }
});
```

**Client consumption:**

```svelte
async function runAgent(agentId: string) {
  const eventSource = new EventSource(`/api/execute/stream?agent_id=${agentId}`);
  
  eventSource.addEventListener('step', (e) => {
    streamingSteps = [...streamingSteps, JSON.parse(e.data)];
  });
  
  eventSource.addEventListener('complete', (e) => {
    result = JSON.parse(e.data);
    eventSource.close();
  });
}
```

---

## VII. Conclusion

We didn't make our agent faster. We made it **transparent**.

The same 20-second operation now feels purposeful instead of broken. Users watch the agent work instead of wondering if it's stuck.

This is the core insight: **perceived performance is a function of information, not just speed**.

When you can't make something faster, make it visible.

---

## Appendix: The Subtractive Triad Applied

| Level | Question | This Work |
|-------|----------|-----------|
| **DRY** | "Have I built this before?" | SSE pattern reusable across agents |
| **Rams** | "Does this earn its existence?" | Every step shown is meaningful |
| **Heidegger** | "Does this serve the whole?" | Streaming serves user trust |

The streaming implementation follows the Subtractive Triad by adding only what's necessary (numbered steps), removing decoration (no emojis, no animations), and serving the system's purpose (building user trust in AI automation).

---

*Developed as part of CREATE SOMETHING's research into human-AI interaction design.*
