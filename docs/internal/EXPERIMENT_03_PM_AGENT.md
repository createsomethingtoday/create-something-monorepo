# Experiment #3: AI PM Agent - Can AI Handle Client Communication While Maintaining Brand Voice?

**Status:** 🚧 In Progress - Infrastructure Built, Testing Phase
**Started:** November 24, 2025
**Hypothesis:** An AI agent can handle 60-80% of PM duties (triage, drafting, research) while maintaining CREATE SOMETHING voice, with human review for approval and escalation for complex decisions.

---

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  EXPERIMENT #3: AI PM AGENT                              ║
║  ───────────────────────────────────────────────────────  ║
║                                                           ║
║  HYPOTHESIS: Can AI triage and draft client responses   ║
║             while maintaining brand voice?               ║
║                                                           ║
║  APPROACH: Cloudflare Agents SDK + D1 + Gmail           ║
║                                                           ║
║  CONSTRAINTS: Human approval required for all sends      ║
║              Escalation required for pricing/strategy   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## The Problem

Client communication is a bottleneck. Each inquiry requires:
- Reading and understanding the request
- Researching relevant CREATE SOMETHING work (experiments, canon)
- Drafting a response that matches brand voice
- Ensuring technical accuracy
- Deciding when to escalate (pricing, strategy, relationships)

**Traditional Approach:**
- Initial triage: 5-10 minutes
- Research context: 10-15 minutes
- Draft response: 15-20 minutes
- Review and send: 5-10 minutes
- **Total: 35-55 minutes per inquiry**

**Problem:** At scale, this doesn't work. With 10 inquiries/week, that's 6-9 hours of PM time.

---

## The Hypothesis

**I hypothesize that:** A Cloudflare Agent with access to:
- Contact submissions (D1 database)
- CREATE SOMETHING voice guidelines
- Experiments database (.io)
- Canon database (.ltd)
- Gmail API (future)

...can triage inquiries and draft responses in < 5 minutes, with:
- 80%+ approval rate (human accepts draft with minor/no edits)
- 20-40% escalation rate (correctly identifies complex cases)
- 95%+ voice consistency (matches CREATE SOMETHING principles)

**Expected Outcome:** Agent handles routine inquiries autonomously (with human approval), escalates complex cases, and saves 50-70% of PM time.

---

## Success Criteria

### Phase 1: Infrastructure (✅ Completed)
- [✅] Install Cloudflare Agents SDK
- [✅] Create agent with 6 tools (query, draft, escalate, search, canon)
- [✅] Create API endpoints for agent control
- [✅] Create D1 tables for logging and metrics
- [✅] Document architecture and design decisions

### Phase 2: Testing (🚧 In Progress)
- [ ] Process 10 test contact submissions
- [ ] Measure draft quality (human scoring)
- [ ] Measure approval rate
- [ ] Measure escalation accuracy
- [ ] Collect time savings data

### Phase 3: Production (⏳ Not Started)
- [ ] Deploy to production with real inquiries
- [ ] Monitor for 30 days
- [ ] Track metrics: approval rate, escalation rate, time savings, cost
- [ ] Gather client satisfaction data (if measurable)
- [ ] Honest assessment: what works, what doesn't

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Agent (PM for CREATE SOMETHING)             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Agent Brain: Llama 3.1 8B via Workers AI              │
│  Temperature: 0.2 (consistent with guidelines)         │
│  Max Tokens: 2000                                       │
│                                                         │
│  System Prompt:                                         │
│  - Role: PM for CREATE SOMETHING                       │
│  - Voice: Empirical, specific, honest, grounded        │
│  - Decision framework: Draft vs Escalate               │
│  - Constraints: No sending, no pricing, no timelines   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Tools (6):                                             │
│  1. query_contact_submissions → D1                     │
│  2. get_voice_guidelines → Static                      │
│  3. search_experiments → D1 papers table               │
│  4. get_canon_context → D1 masters/principles          │
│  5. draft_response → KV storage for review             │
│  6. escalate_to_human → Update status + notify         │
├─────────────────────────────────────────────────────────┤
│  State Management:                                      │
│  - Conversation history: KV namespace                  │
│  - Drafts: KV (7 day TTL)                              │
│  - Escalations: KV (30 day TTL)                        │
│  - Metrics: D1 (agent_decisions, agent_actions)        │
└─────────────────────────────────────────────────────────┘
```

### Files Created

**Agent Core:**
- `packages/io/src/lib/agents/pm-agent/tools.ts` (6 tools, 400+ lines)
- `packages/io/src/lib/agents/pm-agent/index.ts` (agent config, helpers)

**API:**
- `packages/io/src/routes/api/agent/+server.ts` (HTTP endpoints)

**Database:**
- `packages/io/migrations/003_pm_agent_tables.sql` (3 tables, 2 views)

**Documentation:**
- `EXPERIMENT_03_PM_AGENT.md` (this file)

---

## Decision: Why Cloudflare Agents SDK?

### Comparison: Workers AI vs Agents SDK

| Aspect | Workers AI (basic) | Agents SDK |
|--------|-------------------|------------|
| Architecture | Single inference | Multi-step reasoning |
| Tool calling | Manual | Built-in orchestration |
| State | Manual (KV/Durable Objects) | Native support |
| Multi-turn | Request/response only | Conversation tracking |
| Reasoning | Single prompt | Chain-of-thought |

**Decision:** Use Agents SDK because:
1. **Agentic workflow** - Need multi-step: query → research → draft → decide
2. **Tool orchestration** - Agent decides which tools to call and when
3. **State management** - Track conversation context across interactions
4. **Production-ready** - 2,100+ projects use it, 86 releases, actively maintained

---

## Voice Guidelines Implementation

The agent has CREATE SOMETHING voice encoded in multiple places:

**1. System Prompt**
```
Voice principles embedded directly in agent instructions:
- Clarity Over Cleverness
- Specificity Over Generality
- Honesty Over Polish
- Useful Over Interesting
- Grounded Over Trendy
```

**2. get_voice_guidelines Tool**
Returns structured guidelines:
- Core principles (what to do)
- Forbidden patterns (what to avoid)
- Required patterns (what to include)
- Sentence structure rules
- When to escalate

**3. Validation Layer** (future)
- Compare draft against voice checklist
- Flag marketing jargon
- Require metrics when claiming capability
- Ensure attribution to masters

---

## Metrics Tracked

### Efficiency Metrics
- **Time to draft:** Agent vs human baseline
- **Time to review:** Human approval time
- **Total time:** End-to-end contact → response
- **Time savings:** Baseline - actual

### Quality Metrics
- **Approval rate:** Drafts sent without edits
- **Edit rate:** Drafts sent with minor edits
- **Rejection rate:** Drafts rejected entirely
- **Voice consistency:** Human scoring (1-5 scale)

### Decision Metrics
- **Escalation rate:** % escalated to human
- **Escalation accuracy:** Correct escalations / total escalations
- **False positives:** Escalated unnecessarily
- **False negatives:** Should have escalated but didn't

### Business Metrics
- **Cost per interaction:** AI tokens + human review time
- **Client satisfaction:** Survey or NPS (if measurable)
- **Response time:** Submission → first response
- **Throughput:** Inquiries processed per week

### Database Queries for Metrics

```sql
-- Approval rate
SELECT
  COUNT(CASE WHEN approved = 1 THEN 1 END) * 100.0 / COUNT(*) as approval_rate
FROM agent_decisions;

-- Escalation rate
SELECT
  COUNT(CASE WHEN status = 'escalated' THEN 1 END) * 100.0 / COUNT(*) as escalation_rate
FROM contact_submissions
WHERE status IN ('in_progress', 'escalated', 'responded');

-- Average review time
SELECT AVG(time_to_review_seconds) / 60.0 as avg_review_minutes
FROM agent_decisions;

-- Tool success rate
SELECT
  action_type,
  COUNT(CASE WHEN success = 1 THEN 1 END) * 100.0 / COUNT(*) as success_rate,
  COUNT(*) as total_executions
FROM agent_actions
GROUP BY action_type;
```

---

## Usage Examples

### Triage All New Submissions

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "triage"}'
```

Agent will:
1. Query all submissions with status='new'
2. For each: get voice guidelines, search context, draft or escalate
3. Return summary of actions taken

### Process Specific Contact

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "process", "contact_id": 123}'
```

Agent will:
1. Get contact #123 details
2. Research relevant experiments/canon
3. Draft response OR escalate with reasoning
4. Store result in KV for human review

### Review Draft

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{"action": "get_draft", "contact_id": 123}'
```

Returns draft with:
- To, subject, body
- Agent's reasoning for this response
- Relevant experiments/canon referenced
- Created timestamp

### Approve/Reject Draft

```bash
curl -X POST https://createsomething.io/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve_draft",
    "contact_id": 123,
    "approved": true
  }'
```

Logs decision to D1 for metrics, updates contact status.

---

## What This Will Prove (If Successful)

✅ **AI can triage client inquiries systematically**
✅ **AI can maintain brand voice with proper guidelines**
✅ **AI can reference relevant work (experiments/canon) in context**
✅ **AI can recognize when to escalate to human**
✅ **Agent architecture saves significant PM time**
✅ **Tool calling enables complex workflows**

---

## What This Won't Prove

❌ **AI can't negotiate pricing** (human judgment essential)
❌ **AI can't build client relationships** (human touch matters)
❌ **AI can't make strategic decisions** (business context required)
❌ **AI drafts are autonomous** (still need human approval)
❌ **Voice consistency at 100%** (edge cases will exist)

---

## Honest Assessment (To Be Updated)

### What Worked

**✅ To be determined after testing**

Placeholder for findings after Phase 2 testing:
- Tool calling accuracy
- Voice consistency observations
- Escalation decision quality
- Time savings measurements

### What Didn't Work

**❌ To be determined after testing**

Placeholder for failures and limitations:
- Where agent struggled
- Voice violations observed
- Escalation errors
- Edge cases discovered

### Where Human Intervention Was Needed

**🤝 To be determined after testing**

Placeholder for human involvement:
- Types of edits required
- Escalation handling
- Voice corrections
- Context additions

---

## Next Steps

### Phase 2: Testing (Current)

1. **Create test contact submissions** (10 diverse examples)
   - Technical questions
   - Project inquiries
   - Pricing requests (should escalate)
   - General information
   - Ambiguous requests

2. **Run agent on each submission**
   - Capture all tool calls
   - Record drafts and escalations
   - Measure time to process

3. **Human review and scoring**
   - Rate voice consistency (1-5)
   - Rate accuracy (1-5)
   - Rate escalation decisions (correct/incorrect)
   - Time to review each draft

4. **Calculate metrics**
   - Approval rate
   - Escalation accuracy
   - Time savings
   - Cost per interaction

5. **Document findings**
   - Update "What Worked" section
   - Update "What Didn't Work" section
   - Honest assessment of viability

### Phase 3: Production (Future)

- Deploy to production with real inquiries
- Monitor for 30 days
- Gather client feedback
- Iterate on system prompt and tools
- Consider Gmail integration
- Build admin UI for draft review

---

## Reproducibility

### Prerequisites

- Cloudflare account with Workers AI access
- D1 database configured
- KV namespaces (SESSIONS, CACHE)
- Node.js 18+ and pnpm
- Existing contact_submissions table

### Setup Instructions

1. **Install Agents SDK**
   ```bash
   pnpm add agents --filter @create-something/io
   ```

2. **Run database migration**
   ```bash
   cd packages/io
   npx wrangler d1 execute DB --remote --file=migrations/003_pm_agent_tables.sql
   ```

3. **Copy agent files**
   - `src/lib/agents/pm-agent/tools.ts`
   - `src/lib/agents/pm-agent/index.ts`
   - `src/routes/api/agent/+server.ts`

4. **Test locally**
   ```bash
   pnpm dev
   curl -X POST http://localhost:5173/api/agent -d '{"action":"triage"}'
   ```

5. **Deploy**
   ```bash
   pnpm --filter @create-something/io deploy
   ```

### Starting Prompt (for replication)

```
Build a PM agent using Cloudflare Agents SDK that:
1. Triages contact form submissions from D1
2. Drafts responses following CREATE SOMETHING voice
3. References experiments and canon when relevant
4. Escalates pricing/strategy questions to human
5. Stores drafts in KV for human approval

Voice guidelines: [provide voice principles]
Tools needed: query_contact_submissions, get_voice_guidelines,
              search_experiments, draft_response, escalate_to_human
```

---

## Cost Analysis (Estimated)

| Resource | Usage | Cost |
|----------|-------|------|
| Workers AI (Llama 3.1 8B) | ~1K tokens/inquiry | ~$0.01/inquiry |
| D1 reads | 5-10 queries/inquiry | Free (included) |
| D1 writes | 2-3 writes/inquiry | Free (included) |
| KV reads/writes | 2-4 ops/inquiry | Free (included) |
| Human review time | 2-5 min/draft | $3-8 (at $100/hr) |
| **Total per inquiry** | | **$3.01-8.01** |

**Baseline (no agent):** 35-55 min human time = $58-92/inquiry

**Potential savings:** $50-84 per inquiry (85-90% cost reduction)

---

## Experiment Date

**Started:** November 24, 2025
**Phase 1 Completed:** November 24, 2025
**Phase 2 Target:** December 1, 2025
**Phase 3 Target:** January 1, 2026

---

## Related Work

- **Experiment #1:** AI-Native Design Analysis (88% time savings, validated)
- **Experiment #2:** Analytics Dashboard (60-70% time savings, validated)
- **Voice Guidelines:** `/voice` on createsomething.ltd
- **Cloudflare Agents SDK:** github.com/cloudflare/agents

---

**Hypothesis Status:** ⏳ Testing in Progress

🤖 Infrastructure by [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
