# Dual-Agent Routing Strategy

⚠️ **Status: Experimental - Not Recommended (2026-01-09)**

Orchestration experiments (Jan 2026) showed this pattern is **not viable at current scale**:

**Findings**:
- **Gemini CLI**: 50% success rate, API quota exhaustion after 1 task, stdout extraction issues
- **GPT-4 API**: Authentication failures (invalid token issuer)
- **Codex CLI**: File access failures even with valid auth
- **Claude Code Direct**: ✅ 100% success rate, <10 seconds per task, zero errors

**Economics**:
- Current workload: 54 LMS files
- Direct execution cost: $0.54 (54 × $0.01)
- Orchestrated cost: $0.016 (54 × $0.0003) + infrastructure investment
- **Break-even point**: ~300 files (we're at 18% of break-even)

**Recommendation**: Use direct Claude Code execution until workload exceeds 300+ files where orchestration cost savings justify infrastructure fragility.

**Full findings**: See [Orchestrated Code Generation](../.claude/experiments/orchestrated-code-generation.md)

---

**Original proposal follows for reference.**

Cost optimization through intelligent model routing while maintaining operational stability.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Harness Protocol                      │
│              (via MCP - tool-agnostic)                   │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────┐            ┌──────────────────┐
│  Claude Code     │            │  Gemini CLI      │
│  (Primary)       │            │  (Secondary)     │
├──────────────────┤            ├──────────────────┤
│ • Opus: complex  │            │ • Flash: trivial │
│ • Sonnet: std    │            │ • Pro: simple    │
│ • Haiku: simple  │            │ • Cost: ~10x <   │
│ • Cost: $$-$$$   │            │ • Fallback ready │
└──────────────────┘            └──────────────────┘
```

## The Thesis

**For .agency clients, we're selling stability.**

**Model-tailored systems** (Claude-specific optimizations) provide operational stability today.

**Tool-agnostic systems** (MCP abstraction) provide strategic stability against vendor changes.

**Dual-agent routing** achieves both: Claude-specific optimizations remain, Gemini provides cost optimization and vendor redundancy.

## Routing Rules

| Complexity | Primary Model | Secondary (Cost-Optimized) | Cost Savings | When to Use Secondary |
|------------|---------------|---------------------------|--------------|----------------------|
| **Trivial** | Claude Haiku (~$0.001) | Gemini Flash (~$0.0001) | **~90%** | Always (linting, typos, formatting) |
| **Simple** | Claude Haiku (~$0.001) | Gemini Pro (~$0.0005) | **~50%** | After validation (CRUD, single-file edits) |
| **Standard** | Claude Sonnet (~$0.01) | — | — | Never (harness prompts Claude-tuned) |
| **Complex** | Claude Opus (~$0.10) | — | — | Never (requires highest reasoning) |

## Labeling Convention

Use Beads labels to signal routing preference:

```bash
# Explicitly route to Gemini
bd create "Fix linting errors" --label model:gemini-flash --label complexity:trivial

# Explicitly route to Claude
bd create "Architect payment system" --label model:opus --label complexity:complex

# Let smart routing decide (based on complexity)
bd create "Add user profile endpoint" --label complexity:simple
```

### Label Mapping

| Beads Label | Routes To |
|-------------|-----------|
| `model:gemini-flash` | Gemini Flash (force) |
| `model:gemini-pro` | Gemini Pro (force) |
| `model:haiku` | Claude Haiku (force) |
| `model:sonnet` | Claude Sonnet (force) |
| `model:opus` | Claude Opus (force) |
| `complexity:trivial` | Gemini Flash (default) |
| `complexity:simple` | Gemini Pro or Claude Haiku (A/B test) |
| `complexity:standard` | Claude Sonnet (default) |
| `complexity:complex` | Claude Opus (default) |

## Smart Routing Implementation

### Option 1: Manual (Now)

```bash
# Trivial task → Use Gemini CLI
gemini -m gemini-2.0-flash-exp "Fix linting errors in src/lib/auth.ts"

# Standard task → Use Claude Code
# (Just work normally in Claude Code session)

# Complex task → Use Claude Code with Opus
# (Switch model in Claude Code)
```

### Option 2: Automated (via gt-smart-sling with agent routing)

Enhance `gt-smart-sling` to route between agents:

```bash
# Smart routing based on issue labels
gt-smart-sling cs-abc123 csm

# Reads issue labels:
# - complexity:trivial → spawns Gemini Flash worker
# - complexity:simple → spawns Gemini Pro worker
# - complexity:standard → spawns Claude Sonnet worker
# - complexity:complex → spawns Claude Opus worker
```

### Option 3: Hybrid Planning (Claude Plans, Gemini Executes)

**For convoy-based work** (multi-issue features):

```bash
# 1. Claude Coordinator plans the work
gt convoy create "User Auth Feature" cs-login cs-session cs-middleware

# 2. Gemini workers execute bounded tasks
gt sling cs-login csm --agent gemini --model pro
gt sling cs-session csm --agent gemini --model pro
gt sling cs-middleware csm --agent gemini --model flash

# 3. Claude Opus reviews when workers complete
# (Refinery runs security/architecture/quality reviews)
```

**Cost savings**: Planning ($0.10) + Execution ($0.04) + Review ($0.10) = **$0.24 vs $0.60** (~60% savings)

## Cost Projections

**Baseline** (all Claude Sonnet):
- 100 issues/month × $0.01 = **$100/month**

**Optimized** (dual routing):
- 40 trivial → Gemini Flash: 40 × $0.0001 = $0.004
- 30 simple → Gemini Pro: 30 × $0.0005 = $0.015
- 20 standard → Claude Sonnet: 20 × $0.01 = $0.20
- 10 complex → Claude Opus: 10 × $0.10 = $1.00
- **Total: $1.22/month** (~**88% savings**)

**Realistic** (50% trivial, 30% simple, 15% standard, 5% complex):
- 50 trivial → Gemini: $0.005
- 30 simple → Gemini: $0.015
- 15 standard → Claude Sonnet: $0.15
- 5 complex → Claude Opus: $0.50
- **Total: $0.67/month** (~**93% savings**)

## Quality Assurance

All tasks run through the same quality gates regardless of agent:

1. **Baseline check** (before work starts)
2. **Implementation** (Claude or Gemini)
3. **Quality gates** (tests, typecheck, lint)
4. **Review** (security, architecture, quality as needed)

**The guarantee**: Outcomes are consistent. Cost varies.

## Client Messaging

**What to say**:
> "We use a hybrid approach: Claude handles all planning, architectural decisions, and code review. Well-defined implementation tasks are executed by cost-optimized models with the same quality gates. This allows us to deliver Claude-level quality while serving more clients within budget."

**What NOT to say**:
- ❌ "We use cheaper AI for some tasks"
- ❌ "We're experimenting with cost cutting"
- ❌ "Not all tasks get the best model"

**The framing**: Claude for thinking, cost-optimization for execution, quality gates ensure consistency.

## Partner Ecosystem Messaging

**For Anthropic Partner Program**:
> "We've built an autonomous development methodology centered on Claude Code. Our harness system uses Claude Opus for architectural decisions, Sonnet for task decomposition, and quality assurance. For scalability, we route well-defined execution tasks to cost-effective alternatives while keeping Claude as the intelligence layer for planning and review."

**Educational positioning**:
> "We teach AI-native development through courses on learn.createsomething.space and learn.workway.co. Students learn Claude Code as the premium tool for autonomous work, with the harness methodology as the validated framework."

**Value to ecosystem**:
- Open source harness patterns and Beads integration
- Production-validated Claude Code methodology
- Educational content expanding Claude adoption
- Enterprise client validation (.agency work)

## Empirical Validation

Before routing production work to Gemini, validate with A/B testing:

### Test Setup

1. **Create 20 identical issue pairs** (10 trivial, 10 simple)
2. **Split execution**:
   - Trivial: 5 Claude Haiku, 5 Gemini Flash
   - Simple: 5 Claude Haiku, 5 Gemini Pro
3. **Measure**:
   - Success rate (tests pass, acceptance met)
   - Cost per issue (actual API costs)
   - Time to completion (minutes)
   - Quality gate pass rate (first attempt)
   - Number of retries/escalations needed

### Success Criteria

**Gemini Flash** (for trivial):
- Success rate ≥90% vs Claude Haiku
- Cost <20% of Claude Haiku
- Quality gate pass rate ≥85%

**Gemini Pro** (for simple):
- Success rate ≥85% vs Claude Haiku
- Cost <60% of Claude Haiku
- Quality gate pass rate ≥80%

**If criteria not met**: Stick with Claude for those complexity tiers.

## Philosophical Grounding

### Operational Stability (Claude-Tailored)

Harness prompts (quote-based findings, XML tags, prefilled responses) remain Claude-specific. No reliability loss.

**Zuhandenheit preserved**: Claude Code continues working exactly as it does now.

### Strategic Stability (Tool-Agnostic)

MCP abstraction enables Gemini fallback if Anthropic restricts access or pricing changes dramatically.

**Zuhandenheit extended**: Infrastructure recedes—you think about task complexity, not which agent to use.

### Serving the Whole (Heidegger)

Does dual-routing serve the whole?

**If Gemini harms client outcomes**: No—architectural purity is not worth client risk.

**If Gemini maintains outcomes at lower cost**: Yes—cost optimization enables more client work within budget.

**The test reveals which.**

## Related Documentation

- [Model Routing Optimization](./model-routing-optimization.md) - Cost-effective model selection
- [Harness Patterns](./harness-patterns.md) - Single-session orchestration
- [Gastown Patterns](./gastown-patterns.md) - Multi-agent coordination
- [Beads Patterns](./beads-patterns.md) - Issue labeling conventions
