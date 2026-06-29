# Dify vs n8n Content Brief

> Owner: CREATE SOMETHING
> Status: ready for canonical publication
> Tracker: CRE-374
> Public surface: `/dify/n8n-vs-dify`
> Parent plan: `docs/DIFY_AFFILIATE_CONTENT_CHANNEL_PLAN.md`

## Purpose

Publish a fair comparison piece for operators searching for `n8n vs Dify`,
`Dify vs n8n`, and `AI workflow automation vs agent app`.

The piece should explain why CREATE SOMETHING moved from n8n-style workflow
automation, to Cloudflare-native workflow infrastructure, to Dify-first client
agent systems.

## Thesis

n8n, Cloudflare, and Dify solve different layers.

- n8n is strongest when the job is internal workflow automation: triggers,
  integrations, data movement, and deterministic app-to-app steps.
- Cloudflare is strongest when the workflow becomes production infrastructure:
  auth, queues, D1 state, tenant boundaries, route ownership, and deployable
  recovery paths.
- Dify is strongest when the job becomes client-facing agent access: chat and
  workflow apps, MCP tools, app publishing, DSL export, and Service API eval
  coverage.

The public claim should not be "Dify is better than n8n." The public claim is
"the job changed."

## Research Notes

Checked on 2026-05-18:

- n8n remains a workflow automation platform with integrations, trigger nodes,
  action nodes, credential support, and a fallback HTTP Request node for services
  without standalone nodes.
- n8n now has real AI and MCP surfaces. Its MCP Server Trigger can expose tools
  and workflows to MCP clients. Instance-level MCP access can let clients search,
  run, test, create, and edit enabled workflows.
- n8n Chat Hub gives an internal chat interface, personal agents, and workflow
  agents, but workflow agents currently depend on Chat Trigger plus streaming AI
  Agent node requirements.
- Dify is positioned for agentic app building. Published apps can be accessed
  via API, web, or as an MCP server, and Dify recommends Workflow or Chatflow app
  types for most new apps.
- Dify workflows and chatflows use a visual canvas for models, tools, code, and
  branching. Chatflow adds the conversation layer.
- Dify MCP tools are added as server cards, then show up in agents, workflows,
  and agent nodes. Dify app exports preserve app configuration, workflow
  orchestration, node settings, model parameters, prompt templates, and knowledge
  base connections while excluding third-party API keys.

Source URLs:

- `https://docs.n8n.io/integrations/`
- `https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/`
- `https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/`
- `https://docs.n8n.io/advanced-ai/chat-hub/`
- `https://docs.dify.ai/en/use-dify/getting-started/key-concepts`
- `https://docs.dify.ai/en/use-dify/build/workflow-chatflow`
- `https://docs.dify.ai/en/use-dify/build/mcp`
- `https://docs.dify.ai/en/use-dify/workspace/app-management`

## Audience

Primary audience:

- Operators and founders who have used n8n or Zapier-style automation and now
  need agent access for clients or internal users.

Secondary audience:

- Agencies and builders deciding whether to package workflows as n8n
  automations, Dify apps, custom Cloudflare routes, or MCP-backed agent surfaces.

## Recommended Angle

Use first-party narrative:

1. "We used n8n when the job was quick workflow automation."
2. "We moved to Cloudflare when workflows needed production runtime ownership."
3. "We made Dify first-class when clients needed a usable agent UI with MCP
   access."
4. "The durable stack is Dify for agent surfaces, Cloudflare for runtime, MCP
   for tool boundaries, and Policy OS for governance."

Avoid:

- Calling n8n a dead end.
- Claiming Dify is universally better.
- Overstating Dify partner or affiliate status before approval.
- Pretending Cloudflare replaced all workflow tools.

## Canonical Structure

1. Short answer.
2. The timeline: n8n, Cloudflare, Dify.
3. Where n8n still wins.
4. Where Dify wins.
5. Why Cloudflare entered the stack.
6. Decision table.
7. Migration checklist.
8. Final recommendation and CTA.

## Decision Table

| Need                                                         | Best Fit                 |
| ------------------------------------------------------------ | ------------------------ |
| Internal app-to-app automation                               | n8n                      |
| Scheduled syncs, routing, notifications                      | n8n or Cloudflare        |
| Production auth, queues, tenant boundaries, custom endpoints | Cloudflare               |
| Client-facing agent/chat UI                                  | Dify                     |
| Agent with governed MCP tool access                          | Dify + MCP               |
| Portable policy, eval, and release evidence                  | Repo + Policy OS         |
| Public or partner-ready agent package                        | Dify + repo-backed proof |

## Substack Dispatch

Subject options:

- `Dify vs n8n: the job changed`
- `Why we moved from workflow automation to agent apps`
- `n8n, Cloudflare, Dify: where each belongs`

Dispatch shape:

1. Open with the migration story in 3 sentences.
2. Name the distinction: automation workflow vs client-facing agent surface.
3. Link to `/dify/n8n-vs-dify`.
4. Ask readers which workflow they are trying to expose to users.

## CTA

Primary CTA: `Book Mapping Session`

Secondary CTA: `/dify/mcp-control-plane`

Affiliate posture: direct Dify links only until Dify accepts the affiliate
application and the surface is registered with disclosure.
