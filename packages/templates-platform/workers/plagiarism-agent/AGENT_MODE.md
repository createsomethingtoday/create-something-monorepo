# Agent Mode: Content Policy Expansion

Agent SDK implementation for content policy violations beyond plagiarism detection.

## Architecture Decision

**Fixed Pipeline** (current plagiarism detection):
- Three-tier system: Workers AI → Claude Haiku → Claude Sonnet
- Predictable cost: $0.00 → $0.02 → $0.15
- Fast: 2-5 seconds per case
- Bounded: Screenshot comparison, code analysis, editorial judgment
- **Best for**: Plagiarism (visual + code similarity)

**Agent SDK** (agent-mode.ts):
- Iterative evidence gathering with tool use
- Dynamic tool selection based on case needs
- Variable cost: $0.10-$0.50+ depending on iterations
- Slower: 10-60+ seconds per case
- Unbounded: Agent decides what evidence to gather
- **Best for**: Harassment, hate speech, DMCA, NSFW, spam

## When to Use Agent Mode

| Policy Type | Recommended Approach | Why |
|-------------|---------------------|-----|
| **Plagiarism** | Fixed pipeline | Bounded problem (visual + code comparison) |
| **Harassment** | Agent mode | Requires context analysis, tone detection, pattern recognition |
| **Hate speech** | Agent mode | Needs text analysis, cultural context, intent evaluation |
| **DMCA** | Agent mode | Complex: verify original work claims, compare implementations |
| **NSFW** | Agent mode | Vision model + context (artistic vs explicit) |
| **Spam** | Agent mode | Pattern detection across multiple submissions |

## Available Tools

Agent has access to these tools during investigation:

1. **capture_screenshot**: Visual evidence via Browser Rendering
2. **fetch_html**: Source code inspection
3. **extract_css_patterns**: Code similarity (animations, layouts)
4. **analyze_text_content**: Text policy violations (harassment, hate speech)
5. **compare_visual_similarity**: Vision model comparison (Llama 3.2)
6. **conclude_investigation**: Final decision with confidence

## Usage

### Trigger Agent Investigation

```bash
# Start agent investigation for a case
curl https://plagiarism-agent.workers.dev/agent/case_abc123
```

### Response Format

```json
{
  "caseId": "case_abc123",
  "decision": "major",
  "confidence": 0.87,
  "reasoning": "Evidence gathered shows...",
  "recommendedAction": "Content removal",
  "evidenceSummary": [
    "Screenshots show near-identical layout (95% similarity)",
    "CSS animations copied verbatim (12 @keyframes rules)",
    "HTML structure matches 18/20 section elements"
  ],
  "duration": "23.45s"
}
```

## Example: Harassment Detection

```typescript
const contentCase = {
  id: 'case_xyz',
  policyType: 'harassment',
  reporterEmail: 'reporter@example.com',
  targetUrl: 'https://example.com/user-profile',
  complaintText: 'This profile contains targeted harassment against me',
  context: 'History of interactions: ...',
  createdAt: Date.now()
};

const violation = await runAgentInvestigation(contentCase, env, 10);
```

**Agent's likely investigation path**:
1. `fetch_html` → Extract profile content
2. `analyze_text_content` → Check for harassment patterns
3. `capture_screenshot` → Visual evidence of profile
4. `fetch_html` (related pages) → Check for pattern across multiple pages
5. `conclude_investigation` → Make decision

## Escalation Threshold Comparison

| System | Threshold | Behavior |
|--------|-----------|----------|
| **Fixed Pipeline** | Confidence < 0.75 | Escalate to Tier 3 (Sonnet + code analysis) |
| **Agent Mode** | Confidence < 0.7 | Agent gathers more evidence (another iteration) |

Agent mode naturally adapts: if confident early, concludes quickly. If uncertain, gathers more evidence.

## Cost Analysis

**Fixed Pipeline** (plagiarism):
```
Best case (Tier 1 only):     $0.00
Average case (Tier 2):        $0.02
Complex case (Tier 3):        $0.17
```

**Agent Mode**:
```
Simple case (2-3 iterations): $0.10-$0.15
Average case (5-7 iterations): $0.25-$0.35
Complex case (10+ iterations): $0.50+
```

**Decision**: Use fixed pipeline for plagiarism (bounded, predictable). Use agent mode for expansion (flexible, adaptive).

## Session Persistence

Agent state is saved to D1 after each iteration:

```sql
CREATE TABLE agent_sessions (
  id INTEGER PRIMARY KEY,
  case_id TEXT,
  iteration INTEGER,
  evidence TEXT,      -- JSON array of Evidence objects
  tools_used TEXT,    -- JSON array of tool names
  reasoning TEXT,     -- JSON array of reasoning strings
  created_at INTEGER
);
```

This enables:
- **Recovery**: Resume after worker restart/timeout
- **Debugging**: Inspect agent's decision path
- **Auditing**: Review evidence trail

## Graceful Degradation

Agent handles errors gracefully:

1. **Early error** (iterations 1-2): Return inconclusive, flag for human review
2. **Mid-investigation error** (iterations 3+): Conclude with available evidence
3. **Tool failure**: Log error, continue with remaining tools
4. **Max iterations**: Return best assessment, flag if confidence < 0.7

## Integration Example

Update webhook handler to route policy types:

```typescript
async function handleAirtableWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.json() as any;
  const policyType = inferPolicyType(payload.fields['Offense']);

  if (policyType === 'plagiarism') {
    // Use fixed pipeline (existing behavior)
    await env.CASE_QUEUE.send({ caseId, tier: 1 });
  } else {
    // Use agent mode for other violations
    await triggerAgentInvestigation(caseId, policyType, env);
  }
}
```

## Monitoring

Key metrics to track:

- **Average iterations**: Should be 3-7 for most cases
- **Tool usage distribution**: Which tools are most valuable?
- **Conclusion rate**: % of cases reaching decision vs max iterations
- **Cost per case**: Compare agent mode vs fixed pipeline
- **Confidence distribution**: Are agents making confident decisions?

## Future Enhancements

1. **Multi-model routing**: Use Haiku for simple tools, Sonnet for complex reasoning
2. **Parallel tool execution**: Run independent tools concurrently
3. **Evidence caching**: Reuse screenshots/HTML across related cases
4. **Human-in-the-loop**: Flag low-confidence decisions for review
5. **Custom tools**: Template-specific policy tools (e.g., license verification)

## Philosophy: When Tools Recede

**Fixed pipeline**: Tool recedes because the problem is bounded. Plagiarism = visual + code comparison. No ambiguity about what to check.

**Agent mode**: Tool recedes because the agent adapts. Harassment detection might need text analysis, screenshot context, and historical patterns. Agent decides based on case specifics.

Both approaches embody Zuhandenheit (ready-to-hand) differently:
- Fixed: The hammer disappears because we always hammer nails
- Agent: The toolbox disappears because we select tools transparently

## Canon Reflection

| Principle | Application |
|-----------|-------------|
| **DRY** | Reuses tools (screenshot, HTML fetch) across both modes |
| **Rams** | Agent mode only for expansion, not replacing fixed pipeline |
| **Heidegger** | Each approach serves its purpose: fixed for bounded, agent for open-ended |

The infrastructure recedes; content policy decisions emerge.
