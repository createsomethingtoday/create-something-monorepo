# TEND

Tend to what matters.

## What it does

TEND connects to your existing tools and shows you one calm view of everything that needs attention. Automations handle the routine. Agents handle the thinking. You handle what only you can handle.

## How it works

**Automations** run continuously. They score, filter, and route incoming data. No AI, just rules you define. Fast and predictable.

**Agents** think when needed. They draft responses, analyze patterns, and make recommendations. You decide what they can do without asking.

## Two ways to use it

**Try it yourself.** The demo shows how it feels. Connect a few sources, see your data organized, watch automations run.

**Let us build it for you.** We'll connect your specific tools, configure your automations, train your agents, and hand you a working system.

## SDK

```typescript
import { defineAutomation, defineAgent } from '@create-something/tend/sdk';

// Automations: fast, rule-based
export const scoreEmails = defineAutomation({
  name: 'score-emails',
  source: 'gmail',
  score: (item, ctx) => ctx.vipSenders.includes(item.metadata.from) ? 0.9 : 0.5,
});

// Agents: thoughtful, supervised
export const analyzeInvoice = defineAgent({
  name: 'invoice-analyzer',
  trigger: (item) => item.sourceType === 'gmail' && item.title.includes('Invoice'),
  tools: ['search_similar', 'query_quickbooks'],
  task: 'Review this invoice. Flag anything unusual.',
  output: { requiresApproval: true },
});
```

## Run it locally

```bash
pnpm install
pnpm dev
```

## Deploy it

```bash
wrangler d1 create tend-db
pnpm db:migrate
pnpm deploy
```

## Built with

- SvelteKit on Cloudflare Pages
- D1 for storage
- Durable Objects for agent state
- Vectorize for search
