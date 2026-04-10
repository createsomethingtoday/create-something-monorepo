# @create-something/delivery-os

Reusable delivery operating system for CREATE SOMETHING engagements.

This package does three jobs:

1. Defines a shared native schema for `site`, `platform`, and `product` delivery.
2. Defines the Notion engagement hub structure for client-facing docs.
3. Provides an OpenAI-native agent scaffold for chat against delivery docs and operational state.

## Why this exists

Repeatable client work now spans:

- public sites and landing pages
- authenticated platforms and operator workflows
- MCP and agent products with runtime policy boundaries

Notion is still useful for authored, client-readable docs. It is not enough as the sole system of record for milestone state, integrations, approvals, invoices, access, and MCP inventory.

The intended architecture is:

- native database = structured truth
- Notion = presentation and collaboration layer
- OpenAI agent = query layer across both

## Package contents

- [src/schema.ts](./src/schema.ts): canonical D1 and Postgres schema
- [migrations/0001_initial.sql](./migrations/0001_initial.sql): D1 migration
- [src/notion.ts](./src/notion.ts): Notion database and page blueprint
- [src/prompt.ts](./src/prompt.ts): delivery agent instructions
- [src/tools.ts](./src/tools.ts): read-only function tools for operational state
- [src/retrieval.ts](./src/retrieval.ts): vector-store ingestion helpers for delivery artifacts
- [src/agent.ts](./src/agent.ts): OpenAI Agents SDK scaffold with site/platform/product handoffs

## Core model

The commercial/project container is `engagement`.

Every engagement can contain multiple `delivery_components`:

- `site`
- `platform`
- `product`

This lets one engagement represent:

- a marketing site
- a workflow app
- an MCP or agent product

without splitting them into disconnected systems.

## OpenAI-native agent pattern

The default agent stack is:

1. `Delivery OS Director`
2. `Site Delivery Specialist`
3. `Platform Delivery Specialist`
4. `Product Delivery Specialist`

The director can hand off to the specialists when the question is primarily about:

- site launch, analytics, forms, domains, ads
- platform roles, workflows, support, user journeys
- MCP tools, auth, approvals, integrations, runtime boundaries

### Tooling model

- Function tools query native structured state.
- `file_search` queries authored docs from a vector store.
- Optional hosted MCP tools can connect live operator systems.

This keeps the source priority explicit:

1. native structured state for current operational truth
2. retrieved artifacts for authored scope and client-readable narrative

## Quick start

```ts
import OpenAI from 'openai';
import { createDeliveryOsAgent, uploadArtifactsToVectorStore } from '@create-something/delivery-os';

const store = {
  async listEngagements() { return []; },
  async getEngagement() { return null; },
  async listComponents() { return []; },
  async listArtifacts() { return []; },
  async listMilestones() { return []; },
  async listIntegrations() { return []; },
  async listRisks() { return []; },
  async listAccessItems() { return []; },
  async getCommercialSnapshot() { return null; }
};

const agent = createDeliveryOsAgent({
  store,
  model: 'gpt-5.1',
  vectorStoreIds: ['vs_123']
});
```

### Optional artifact sync

```ts
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

await uploadArtifactsToVectorStore(client, 'vs_123', [
  {
    artifactId: 'prd-abundance',
    clientId: 'client-abundance',
    engagementId: 'eng-abundance',
    componentId: 'platform-abundance',
    artifactType: 'prd',
    title: 'PRD — Abundance build and onboarding',
    body: '# Scope\n...',
    sourceUrl: 'https://www.notion.so/...'
  }
]);
```

## Notion hub recommendation

Use one client-facing engagement hub plus shared databases for:

- Clients
- Engagements
- Delivery components
- Artifacts
- Milestones
- Integrations
- Commercials
- Operations

See [src/notion.ts](./src/notion.ts) and the mirrored `.agency` templates:

- [delivery-os-notion-structure.md](../../agency/content/templates/delivery/delivery-os-notion-structure.md)
- [delivery-os-engagement-hub.md](../../agency/content/templates/delivery/delivery-os-engagement-hub.md)

## Validation

```bash
pnpm --filter @create-something/delivery-os check
pnpm --filter @create-something/delivery-os build
```
