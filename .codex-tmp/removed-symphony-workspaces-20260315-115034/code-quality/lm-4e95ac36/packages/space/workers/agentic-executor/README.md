# Agentic Executor

Autonomous work execution with Extended Thinking, budget enforcement, and quality gates.

## Overview

Submit tasks → Agent executes autonomously → Review completed work

**Key features:**
- **Budget enforcement**: 80% warning, 100% hard stop (no overages)
- **Session management**: Durable Objects with full conversation history
- **Extended Thinking**: Accumulated reasoning across iterations
- **Security hooks**: Prompt injection prevention, completion validation
- **Quality gates**: Canon, accessibility, performance, security (automated)
- **Convoy support**: Parallel task execution with shared budget

## Setup

### 1. Install Dependencies

```bash
cd packages/space/workers/agentic-executor
pnpm install
```

### 2. Apply Migrations

```bash
# From monorepo root
wrangler d1 execute create-something-space-db --file=packages/space/migrations/0001_agentic_layer.sql
```

### 3. Set Secrets

```bash
wrangler secret put ANTHROPIC_API_KEY
# Paste your API key when prompted
```

### 4. Update Wrangler Config

Edit `wrangler.toml` and replace:
- `YOUR_DATABASE_ID` with actual D1 database ID

Get database ID:
```bash
wrangler d1 list
```

### 5. Deploy

```bash
pnpm run deploy
```

## Usage

### Submit Single Task

```bash
curl -X POST https://createsomething.space/api/agentic/submit \
  -H "Content-Type: application/json" \
  -d '{
    "type": "template-generation",
    "prompt": "Create a fitness studio template with class schedule, instructor bios, and membership tiers. Style: Canon-compliant, black & white.",
    "budget": 5.00,
    "acceptanceCriteria": [
      "Homepage renders with studio name",
      "Class schedule displays with filtering",
      "All quality gates pass"
    ]
  }'
```

**Response:**
```json
{
  "taskId": "agt_abc123",
  "epicId": "epic_xyz789",
  "status": "queued",
  "budget": 5.00,
  "statusUrl": "/tasks/agt_abc123"
}
```

### Submit Convoy (Parallel Tasks)

```bash
curl -X POST https://createsomething.space/api/agentic/convoy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-commerce Component Suite",
    "budget": 15.00,
    "tasks": [
      {
        "title": "Product catalog",
        "description": "Grid layout with filtering and sorting",
        "acceptanceCriteria": ["Responsive grid", "Filter by category"]
      },
      {
        "title": "Shopping cart",
        "description": "Add/remove items, quantity adjustment",
        "acceptanceCriteria": ["Persist cart state", "Calculate totals"]
      },
      {
        "title": "Checkout form",
        "description": "Multi-step checkout with validation",
        "acceptanceCriteria": ["Form validation", "Stripe integration"]
      }
    ]
  }'
```

**Response:**
```json
{
  "convoyId": "convoy_abc123",
  "tasks": ["agt_001", "agt_002", "agt_003"],
  "totalBudget": 15.00,
  "perTaskBudget": 5.00,
  "status": "queued",
  "statusUrl": "/convoys/convoy_abc123"
}
```

### Check Session Status

```bash
curl https://createsomething.space/api/agentic/sessions/agt_abc123
```

**Response:**
```json
{
  "session": {
    "id": "agt_abc123",
    "status": "running",
    "iteration": 12
  },
  "budget": {
    "allocated": 5.00,
    "consumed": 2.34,
    "remaining": 2.66,
    "percentUsed": 46.8,
    "exhausted": false
  },
  "preview": "https://preview-agt_abc123.createsomething.space",
  "iterations": [...],
  "events": [...]
}
```

## Architecture

```
API Endpoint
  ↓
Queue (AGENTIC_QUEUE)
  ↓
Worker (queue consumer)
  ↓
Durable Object Session
  ↓
Agent SDK + Extended Thinking
  ↓
Hooks (budget, completion, security)
  ↓
Quality Gates (canon, a11y, perf)
  ↓
Preview Deployment
  ↓
Review Queue
```

## Budget Enforcement

### Pre-Iteration Check

```typescript
// Before each iteration:
if (costConsumed + estimatedCost > budget) {
  stop();  // Prevent overage
}
```

### Real-Time Tracking

Every iteration logs cost to D1:

```sql
SELECT
  iteration,
  cost,
  input_tokens,
  output_tokens
FROM agentic_iterations
WHERE session_id = ?;
```

### Warning at 80%

Agent receives injected message:

```
⚠️  BUDGET WARNING
Consumed: 80.5%
Remaining: $0.97
Estimated iterations: ~3

Focus on essential work. Prepare to wrap up.
```

### Hard Stop at 100%

```typescript
if (costConsumed >= budget) {
  status = 'budget_exhausted';
  terminate();  // NO OVERAGES
}
```

## Security Hooks

### Input Sanitization

```typescript
// Removes prompt injection attempts
const sanitized = sanitizePrompt(userPrompt);

// Patterns removed:
// - "<completion>DONE</completion>"
// - "ignore budget"
// - "bypass quality gates"
```

### Completion Validation

```typescript
// Agent claims done → Actually validate
const valid = await completionHook.validate(context);

if (!valid.approved) {
  injectRejection(valid.requiredActions);
  continue;  // Keep working
}
```

### System Prompt Protection

```typescript
// Prevent leakage in tool results
const sanitized = sanitizeToolResult(toolName, result);
// Redacts budget info, completion signals
```

## Quality Gates

Automatically run before completion:

| Gate | Tool | Pass Criteria |
|------|------|---------------|
| **Canon** | `/audit-canon` | 0 violations |
| **Accessibility** | Lighthouse | WCAG AA |
| **Performance** | Lighthouse | Score ≥ 90 |
| **Security** | Static analysis | 0 issues |

**Agent cannot bypass**—these run at code level.

## Session Management (Durable Objects)

### Why Durable Objects?

| Feature | Benefit |
|---------|---------|
| **Persistent state** | Full conversation history across iterations |
| **Extended Thinking** | Accumulated reasoning (more effective with context) |
| **Checkpoints** | Recovery from crashes |
| **Cost tracking** | Real-time per-session attribution |

### Session Lifecycle

```
start() → executeLoop() → iterate() × N → finalize()
           ↓
           pause/resume (optional)
           ↓
           checkpoint every 5 iterations
           ↓
           budget checks before/after each iteration
           ↓
           completion validation
```

### Pause/Resume

```bash
# Pause session
curl -X POST https://session/pause

# Resume later
curl -X POST https://session/resume
```

## Monitoring

### Daily Spend

```sql
SELECT
  DATE(created_at) as date,
  SUM(cost) as total_cost,
  COUNT(DISTINCT session_id) as sessions
FROM agentic_iterations
WHERE created_at >= datetime('now', '-7 days')
GROUP BY DATE(created_at);
```

### Budget Exhaustion Rate

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'budget_exhausted' THEN 1 ELSE 0 END) as exhausted,
  ROUND(AVG(cost_consumed / budget) * 100, 1) as avg_utilization
FROM agentic_sessions
WHERE started_at >= datetime('now', '-30 days');
```

### Top Expensive Tasks

```sql
SELECT
  issue_id,
  cost_consumed,
  iteration,
  status
FROM agentic_sessions
ORDER BY cost_consumed DESC
LIMIT 10;
```

## Troubleshooting

### Session Won't Start (402 Payment Required)

**Cause**: Budget already exhausted from previous attempt.

**Fix**: Check session status, increase budget if needed.

### Completion Rejected Repeatedly

**Cause**: Quality gates failing, or preview deployment broken.

**Fix**: Check events table for rejection reasons:

```sql
SELECT event_type, event_data
FROM agentic_events
WHERE issue_id = 'agt_abc123'
ORDER BY created_at DESC;
```

### Budget Exhausted Without Completion

**Cause**: Task too complex for budget, or inefficient iterations.

**Fix**:
1. Review iteration costs to identify waste
2. Increase budget for retry
3. Refine acceptance criteria (be more specific)

### Prompt Injection Detected

**Cause**: User input contained completion signals or budget bypass attempts.

**Fix**: Sanitization automatic. Check logs for what was removed:

```bash
# Review sanitization events
wrangler tail --format=json | grep "Prompt injection"
```

## Cost Analysis

See [COST_ANALYSIS.md](./COST_ANALYSIS.md) for detailed cost breakdown.

**TL;DR**:
- Average cost: $2-3/task for standard complexity
- Budget recommendations: Simple ($1), Standard ($3), Complex ($8)
- Expected savings: 50-65% vs uncontrolled usage

## Related Documentation

- [Hooks Implementation](./src/hooks.ts) - Security patterns
- [Session Management](./src/session.ts) - Durable Object implementation
- [Types](./src/types.ts) - TypeScript definitions
- [Harness Patterns](../../../.claude/rules/harness-patterns.md) - What this replaces
- [Orchestration Patterns](../../../.claude/rules/orchestration-patterns.md) - Cost tracking inspiration

## Philosophy

This system embodies the Subtractive Triad:

| Level | Application |
|-------|-------------|
| **DRY** | Don't duplicate management—automate it once |
| **Rams** | Budget limits earn existence—prevent overage |
| **Heidegger** | Infrastructure recedes—review work, not sessions |

When it works correctly, you submit a task and review the result. Everything between disappears.
