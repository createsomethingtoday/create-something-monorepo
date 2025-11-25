# PM Agent for CREATE SOMETHING

**Experiment #3:** Can an AI agent handle PM duties while maintaining brand voice?

## Quick Start

### 1. Trigger Triage (Process All New Submissions)

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "triage"}'
```

This will:
- Query all contact submissions with `status='new'`
- For each: get voice guidelines, search context, draft or escalate
- Return summary of actions taken

### 2. Process Specific Contact

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "process", "contact_id": 123}'
```

This will:
- Get contact #123 details
- Research relevant experiments/canon
- Draft response OR escalate with reasoning
- Store result in KV for human review

### 3. Review Drafts (Admin UI)

Visit: `https://createsomething.io/admin/agent-drafts`

You can:
- See all pending drafts and escalations
- Read agent's reasoning for each decision
- Approve drafts (then manually send email)
- Reject drafts (handle manually)
- View performance metrics

### 4. Get Contact Status

```bash
curl "https://createsomething.io/api/agent?contact_id=123"
```

Returns:
- Contact submission details
- Draft (if exists)
- Escalation (if exists)
- Current status

### 5. Approve/Reject Draft

```bash
# Approve
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_draft",
    "contact_id": 123,
    "approved": true
  }'

# Reject
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_draft",
    "contact_id": 123,
    "approved": false
  }'
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│ PM Agent (Llama 3.1 8B)                 │
│ Temperature: 0.2                        │
│ Max Tokens: 2000                        │
├─────────────────────────────────────────┤
│ Tools:                                  │
│ 1. query_contact_submissions            │
│ 2. get_voice_guidelines                 │
│ 3. search_experiments                   │
│ 4. get_canon_context                    │
│ 5. draft_response                       │
│ 6. escalate_to_human                    │
└─────────────────────────────────────────┘
```

---

## Tools

### 1. query_contact_submissions

**Purpose:** Retrieve contact form submissions from D1

**Parameters:**
- `status` (optional): 'new', 'in_progress', 'responded', 'escalated'
- `limit` (optional): Number of submissions to return (default: 10)

**Returns:**
```json
{
  "success": true,
  "submissions": [
    {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "message": "I need help building...",
      "submitted_at": "2025-11-24T10:00:00Z",
      "status": "new"
    }
  ],
  "count": 1
}
```

### 2. get_voice_guidelines

**Purpose:** Get CREATE SOMETHING voice principles

**Parameters:** None

**Returns:**
```json
{
  "success": true,
  "voice": {
    "core_principles": [
      "Clarity Over Cleverness - Direct, simple language",
      "Specificity Over Generality - Metrics, not vague claims",
      ...
    ],
    "forbidden_patterns": [
      "Marketing jargon: leverage, synergy, solutions",
      ...
    ],
    "when_to_escalate": [
      "Pricing discussions",
      "Strategic decisions",
      ...
    ]
  }
}
```

### 3. search_experiments

**Purpose:** Search CREATE SOMETHING experiments (.io) for relevant work

**Parameters:**
- `keywords` (required): Search terms

**Returns:**
```json
{
  "success": true,
  "experiments": [
    {
      "title": "Experiment #1: AI-Native Design Analysis",
      "url": "https://createsomething.io/experiments/canva-design-implementation",
      "excerpt": "88% time savings...",
      "category": "development"
    }
  ],
  "count": 1
}
```

### 4. get_canon_context

**Purpose:** Get context from CREATE SOMETHING canon (.ltd) - masters, principles

**Parameters:**
- `topic` (required): Topic to search (e.g., "design principles", "Tufte")

**Returns:**
```json
{
  "success": true,
  "masters": [
    {
      "name": "Edward Tufte",
      "url": "https://createsomething.ltd/masters/edward-tufte",
      "tagline": "Pioneer of data visualization",
      "discipline": "Data Visualization"
    }
  ],
  "principles": [...]
}
```

### 5. draft_response

**Purpose:** Draft email response and store for human review (DOES NOT SEND)

**Parameters:**
- `contact_id` (required): Contact submission ID
- `to_email` (required): Recipient email
- `to_name` (required): Recipient name
- `subject` (required): Email subject
- `body` (required): Email body (plain text)
- `reasoning` (required): Why you drafted this response this way

**Returns:**
```json
{
  "success": true,
  "draft_id": "draft:123",
  "message": "Draft created and queued for human review",
  "review_url": "https://createsomething.io/admin/agent-drafts/123",
  "next_steps": "Human will review and either approve, edit, or reject this draft."
}
```

**Storage:** Draft stored in KV with 7-day TTL

### 6. escalate_to_human

**Purpose:** Escalate inquiry to human review

**Parameters:**
- `contact_id` (required): Contact submission ID
- `reason` (required): Reason for escalation
  - 'pricing_question'
  - 'strategic_decision'
  - 'relationship_building'
  - 'ambiguous_requirements'
  - 'technical_uncertainty'
  - 'scope_unclear'
  - 'other'
- `context` (required): Additional context for human reviewer
- `urgency` (optional): 'low', 'medium', 'high' (default: 'medium')

**Returns:**
```json
{
  "success": true,
  "escalation_id": "escalation:123",
  "message": "Escalated to human review: pricing_question",
  "urgency": "high",
  "next_steps": "Human will review this inquiry and take appropriate action."
}
```

**Storage:** Escalation stored in KV with 30-day TTL

---

## Agent Decision Framework

**The agent will DRAFT when:**
- Inquiry is straightforward question about capabilities
- Can reference specific experiments or canon
- Request aligns with documented services
- No pricing/budget discussion needed

**The agent will ESCALATE when:**
- Pricing or budget questions
- Strategic/business decisions needed
- Relationship building opportunities
- Ambiguous or complex requirements
- Anything involving commitments (timeline, scope, deliverables)
- When uncertain

**Philosophy:** Better to escalate than make wrong assumption.

---

## Testing

### Create Test Contact Submission

```sql
INSERT INTO contact_submissions (name, email, message, submitted_at, status)
VALUES (
  'Test User',
  'test@example.com',
  'I saw your AI design analysis experiment. Can you help with a similar project?',
  datetime('now'),
  'new'
);
```

### Run Agent on Test Contact

```bash
# Get the contact_id from the INSERT above, then:
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "process", "contact_id": <id>}'
```

### Check Draft

```bash
curl "https://createsomething.io/api/agent?contact_id=<id>"
```

### Approve Draft

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_draft",
    "contact_id": <id>,
    "approved": true
  }'
```

---

## Metrics Queries

### Approval Rate

```sql
SELECT
  COUNT(CASE WHEN approved = 1 THEN 1 END) * 100.0 / COUNT(*) as approval_rate,
  COUNT(*) as total_decisions
FROM agent_decisions;
```

### Escalation Rate

```sql
SELECT
  COUNT(CASE WHEN status = 'escalated' THEN 1 END) * 100.0 / COUNT(*) as escalation_rate
FROM contact_submissions
WHERE status IN ('in_progress', 'escalated', 'responded');
```

### Average Review Time

```sql
SELECT
  AVG(time_to_review_seconds) / 60.0 as avg_review_minutes
FROM agent_decisions
WHERE time_to_review_seconds IS NOT NULL;
```

### Tool Success Rate

```sql
SELECT
  action_type,
  COUNT(CASE WHEN success = 1 THEN 1 END) * 100.0 / COUNT(*) as success_rate,
  COUNT(*) as total_executions,
  AVG(execution_time_ms) as avg_execution_ms
FROM agent_actions
GROUP BY action_type
ORDER BY total_executions DESC;
```

---

## Files Structure

```
packages/io/
├── src/
│   ├── lib/
│   │   └── agents/
│   │       └── pm-agent/
│   │           ├── index.ts          # Agent config, helpers
│   │           ├── tools.ts          # 6 tool definitions
│   │           └── README.md         # This file
│   └── routes/
│       ├── api/
│       │   ├── agent/
│       │   │   └── +server.ts        # Main agent API
│       │   └── admin/
│       │       ├── agent-reviews/
│       │       │   └── +server.ts    # Pending reviews API
│       │       └── agent-metrics/
│       │           └── +server.ts    # Metrics API
│       └── admin/
│           └── agent-drafts/
│               └── +page.svelte      # Admin UI
├── migrations/
│   └── 003_pm_agent_tables.sql       # Database schema
└── wrangler.jsonc                     # Already configured
```

---

## Configuration

The agent uses the existing Cloudflare bindings from `wrangler.jsonc`:

- **AI binding:** `env.AI` (Workers AI)
- **D1 binding:** `env.DB` (create-something-db)
- **KV bindings:** `env.CACHE` (for drafts/escalations)

No additional configuration needed!

---

## Limitations

### Current Limitations

1. **No Gmail integration yet** - Only processes contact_submissions table
2. **Manual email sending** - Agent drafts, human must send
3. **No voice scoring** - Human subjectively rates voice consistency
4. **No A/B testing** - Can't compare agent vs human drafts systematically
5. **Single model** - Using Llama 3.1 8B, could upgrade to Sonnet

### Future Enhancements

- [ ] Gmail API integration (OAuth + tool)
- [ ] Automated voice scoring (compare against checklist)
- [ ] Send emails directly after approval
- [ ] A/B test: some contacts → agent, some → human baseline
- [ ] Upgrade to Sonnet 4.5 when available via Workers AI
- [ ] Multi-agent: separate agents for triage vs drafting
- [ ] Learning: fine-tune based on approval/rejection patterns

---

## Troubleshooting

### Agent not processing contacts

**Check:** Contact status in D1

```sql
SELECT * FROM contact_submissions WHERE status = 'new';
```

If no 'new' contacts, agent has nothing to process.

### Draft not showing in admin UI

**Check:** KV storage

```bash
curl "https://createsomething.io/api/agent?contact_id=123"
```

Draft should be in `draft` field. If missing, re-run agent.

### Metrics showing 0%

**Check:** Do you have decisions logged?

```sql
SELECT COUNT(*) FROM agent_decisions;
```

If 0, you need to approve/reject some drafts first.

### Tool execution failing

**Check:** Agent actions log

```sql
SELECT * FROM agent_actions WHERE success = 0 ORDER BY created_at DESC LIMIT 10;
```

Look at `error_message` field for details.

---

## Cost Estimate

| Resource | Per Inquiry | Notes |
|----------|-------------|-------|
| Workers AI | ~$0.01 | ~1K tokens with Llama 3.1 8B |
| D1 queries | Free | Included in plan |
| KV operations | Free | Included in plan |
| Human review | $3-8 | 2-5 min at $100/hr |
| **Total** | **$3.01-8.01** | vs $58-92 without agent |

**Savings:** 85-90% cost reduction per inquiry

---

## Support

Questions? Issues?

- **Documentation:** `/EXPERIMENT_03_PM_AGENT.md`
- **Voice Guidelines:** `https://createsomething.ltd/voice`
- **Cloudflare Agents SDK:** `https://github.com/cloudflare/agents`

---

**Experiment Status:** 🚧 Phase 1 Complete, Testing in Progress

🤖 Generated with [Claude Code](https://claude.com/claude-code)
