# Community MCP Server

Agent-managed community presence. The agent watches, drafts, and waits. You review for 5 minutes. The community grows.

## Philosophy

> "The tool recedes into use." — Zuhandenheit

Community building is essential for growth. But it conflicts with deep work. This MCP server resolves that tension:

- **Agent watches** — Monitors platforms for mentions, questions, opportunities
- **Agent drafts** — Prepares responses using CREATE SOMETHING methodology
- **Human reviews** — 5-minute daily review: approve, edit, or dismiss
- **Relationships warm** — Engagement patterns tracked automatically

You stay in flow. The community grows around the methodology, not around your availability.

## Tools

### Observation

| Tool | Description |
|------|-------------|
| `community_review` | Daily review summary — start here |
| `community_signals` | View inbound signals (mentions, questions, opportunities) |
| `community_relationships` | View relationship heat map |
| `community_queue` | View pending responses |

### Action

| Tool | Description |
|------|-------------|
| `community_record_signal` | Record a new signal from monitoring |
| `community_draft` | Get context for drafting a response |
| `community_queue_response` | Queue a drafted response for review |
| `community_dismiss` | Dismiss a signal as not worth responding |
| `community_batch_review` | Process multiple review actions |

### Management

| Tool | Description |
|------|-------------|
| `community_update_relationship` | Add notes, tags, adjust lead potential |

## Installation

```bash
cd packages/community-mcp
pnpm install
pnpm build
```

## Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "community": {
      "command": "node",
      "args": ["packages/community-mcp/dist/index.js"],
      "env": {
        "COMMUNITY_API_URL": "https://createsomething.agency/api/community"
      }
    }
  }
}
```

## Daily Review Workflow

The intended workflow for the human:

```
1. Morning (5 min)
   └── community_review
       ├── Review urgent signals
       ├── Approve/edit/reject drafted responses  
       └── Note any hot relationships

2. Throughout day (agent works)
   └── Agent monitors platforms
       ├── Records signals
       ├── Drafts responses
       └── Updates relationships

3. Evening (optional, 2 min)
   └── community_review
       └── Quick check on anything new
```

## Agent Monitoring Workflow

For an agent monitoring platforms:

```typescript
// 1. Check what's new
const review = await community_review();

// 2. When you find something interesting
await community_record_signal({
  platform: 'linkedin',
  signal_type: 'question',
  content: 'How do you handle dark mode in your templates?',
  source_url: 'https://linkedin.com/...',
  author_name: 'Jane Smith',
  author_handle: 'janesmith',
  author_followers: 5000,
  relevance_score: 0.8,
  urgency: 'medium'
});

// 3. Get context for drafting
const context = await community_draft({
  signal_id: 'sig_123',
  tone: 'helpful'
});

// 4. Queue your drafted response
await community_queue_response({
  signal_id: 'sig_123',
  draft_content: 'Great question! Our templates use CSS custom properties...',
  draft_reasoning: 'Direct technical question, helpful response appropriate',
  action_type: 'reply',
  platform: 'linkedin',
  target_url: 'https://linkedin.com/...',
  priority: 7
});
```

## Signal Types

| Type | Description | Typical Response |
|------|-------------|------------------|
| `mention` | Someone mentioned CREATE SOMETHING | Acknowledgment, engagement |
| `question` | Direct question about our work | Helpful answer |
| `opportunity` | Potential collaboration, speaking, etc. | Interest + next step |
| `praise` | Positive feedback | Genuine thanks |
| `reply` | Response to our content | Continue conversation |

## Tone Guidelines

| Tone | When to Use | Voice |
|------|-------------|-------|
| `methodology` | Default. Speaking from the Canon | Thoughtful, substantive, never salesy |
| `helpful` | Direct practical questions | Clear, useful, generous |
| `appreciative` | Acknowledging good work | Genuine, specific |
| `promotional` | Sharing our work | Let work speak, context over hype |

## Relationship Tracking

Relationships automatically warm based on:
- Interaction frequency
- Their responses to us
- Engagement quality

Lead potential auto-upgrades:
- `unknown` → `cold` at 0.1 warmth
- `cold` → `warm` at 0.3 warmth
- `warm` → `hot` at 0.7 warmth

Human can override with `community_update_relationship`.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Agent (MCP)    │────▶│  Agency API      │────▶│  D1 Database    │
│                 │     │  /api/community  │     │                 │
│  - Monitor      │     │  - signals       │     │  - signals      │
│  - Draft        │     │  - queue         │     │  - queue        │
│  - Queue        │     │  - relationships │     │  - relationships│
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                │
         │                                                │
         ▼                                                ▼
┌─────────────────┐                              ┌─────────────────┐
│  Human (Admin)  │                              │  Admin Dashboard│
│                 │◀─────────────────────────────│  /admin/community│
│  - Review       │                              │  - Daily review │
│  - Approve      │                              │  - Batch actions│
│  - Deep work    │                              │  - Relationships│
└─────────────────┘                              └─────────────────┘
```

## The Methodology Voice

When drafting responses, the agent should embody CREATE SOMETHING's philosophy:

- **Less, but better** — Substantive over verbose
- **Understanding precedes creation** — Ask clarifying questions when appropriate
- **The whole determines the parts** — Connect specific answers to broader principles
- **Never salesy** — Share insight, not pitch

The community grows because the methodology is genuinely useful, not because we're "good at community."
