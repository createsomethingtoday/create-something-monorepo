# LinkedIn Posts: Notion Agent Demo

## Personal Post (Micah Johnson)

---

**The best UX improvement we made wasn't a design change. It was showing the work.**

We built a Notion agent demo this week. Initial version: click "Run," wait 20 seconds, see result.

Users hated it.

Not because it was slow—because they couldn't see anything happening. Twenty seconds of uncertainty feels like an eternity.

So we added streaming. Now users see:

```
1. Loading database schema...
2. Starting agent "Status Change"
3. query_database: finding pages with title "This is a task"
4. Found 2 matching pages
5. update_page: changing status to "Done"
6. Updated page abc123
7. Updated page def456
8. Complete: 2 pages updated
```

Same 20 seconds. Completely different experience.

The agent isn't faster. But users *perceive* it as faster because they can follow the reasoning. They know it's working, not stuck.

This is a general principle: **transparency reduces perceived latency.**

Your loading spinner says "trust me." A progress log says "watch me work."

One builds anxiety. The other builds trust.

---

**#AI #UX #ProductDevelopment #AgentDesign**

---

## Company Post (CREATE SOMETHING)

---

**We shipped a Notion agent in a week. Here's what we learned about building trust with AI.**

The technical challenge was straightforward: give users a way to automate their Notion databases with natural language prompts.

The UX challenge was harder: **how do you make users trust an AI agent that's modifying their data?**

Our answer: radical transparency.

We implemented Server-Sent Events to stream every step the agent takes:
- Schema discovery
- Database queries
- Page modifications
- Error recovery

Users watch the agent think. They see it make mistakes and correct itself. They understand *why* it succeeds or fails.

This isn't just better UX—it's better debugging. When something goes wrong, users can point to the exact step. No black boxes.

**Three principles we're taking forward:**

1. **Show the work.** Progress logs beat loading spinners.
2. **Fail visibly.** Errors with context are fixable. Silent failures aren't.
3. **Pre-fetch what you can.** We eliminated "property not found" errors by loading database schemas before the agent runs.

The agent runs on Cloudflare Workers. 20 seconds to complete a task. Users don't mind—because they can watch it happen.

Sometimes the best optimization isn't making things faster. It's making the wait meaningful.

---

Built with: SvelteKit, Cloudflare Workers AI, Notion API, Server-Sent Events

**#CloudflareWorkers #NotionAPI #AIAgents #AutomationInfrastructure**

---

## Short Version (Either)

---

We added streaming to our Notion agent demo.

Before: Click "Run." Wait 20 seconds. See result.

After: Click "Run." Watch 8 steps execute in real-time. See result.

Same duration. Users perceive it as 3x faster.

**Transparency reduces perceived latency.**

Show the work.

---
