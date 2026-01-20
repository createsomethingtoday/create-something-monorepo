# Marketplace Agentic Architecture Plan

**Authors:** Joey Best-James (Senior System Architect), Micah Johnson (System Architect)  
**Started:** January 15, 2026  
**Status:** Discovery & Framework Development

---

## Ethos

> "Tools recede, understanding remains."

The agentic layer should **disappear into the work**. Reviewers shouldn't think "I'm using an AI agent"—they should simply experience faster, more consistent reviews. Creators shouldn't wait anxiously for status updates—they should trust the system to surface what matters.

### Guiding Principles

1. **Serve the humans in the loop** — Agents augment reviewers, not replace them
2. **Start internal, earn trust** — Shadow mode before autonomous decisions
3. **Version everything** — Agent configs, prompts, and logic are versioned like code
4. **Measure before optimizing** — Baseline accuracy before claiming improvement
5. **Fail gracefully** — When uncertain, escalate to humans

---

## Foundation

### What Exists

| System | Owner | Status | Notes |
|--------|-------|--------|-------|
| **Airtable Backend** | Joey | Production | Asset tracking, review workflow, automations |
| **Response Classification Agent** | Joey | Production | Classifies creator responses for status updates |
| **Partner/Experts Matching** | Joey | Production | Algorithmic matching with versioned configs (v7) |
| **Asset Dashboard** | Micah | Production | SvelteKit + Cloudflare, creator view |
| **App Form** | Micah | Production | Next.js + Vercel, submission handling |
| **Template Validation** | Micah | Production | Designer Extension + CF Worker |
| **Bundle Scanner** | Micah | Experimental | Security rules, being improved by DE |
| **Agent SDK** | Micah | Available | Python SDK for agent development |
| **IC MVP Pipeline** | Micah | Validated | AI Studio → Code Components |

### Team

**Joey Best-James** — Senior System Architect
- Airtable system design & automations (expert)
- Versioned algorithm pattern (17 variables in v7)
- Python development
- Built Response Classification agent
- Guiding Micah through Webflow systems architecture

**Micah Johnson** — System Architect
- Frontend systems (SvelteKit, Next.js, Designer Extensions)
- Cloudflare Workers architecture
- Agent SDK & harness patterns
- IC MVP translation pipeline
- Learning systems architecture from Joey

---

## Goal & Definitions

**Primary Question:** When do we use agents? When is it a function/rule/automation?

**Target:** Identify where agents add value in the Marketplace system, optimize what exists, and design what's next.

### What We Mean by "Agent"

An **agent** in our context is:
- LLM-powered reasoning that handles ambiguity
- Operates with defined inputs/outputs
- Has confidence scoring (knows when it's uncertain)
- Versioned and auditable
- Human-in-the-loop for high-stakes decisions

An agent is **NOT**:
- A replacement for deterministic rules
- Autonomous without oversight
- A black box (must be explainable)

---

## Framework: When to Use What

### Decision Matrix

| Approach | Use When | Cost | Risk | Examples |
|----------|----------|------|------|----------|
| **Deterministic Rules** | Logic is known, bounded, stable | Low | Low | File size limits, naming conventions |
| **Weighted Algorithms** | Multiple factors, tunable weights | Low | Low | Partner matching, priority scoring |
| **Scripts/API Calls** | Predictable I/O, no reasoning | Low | Low | Webhook delivery, data transforms |
| **Automations** | Event-driven, multi-step workflows | Low | Low | Status change → notification |
| **AI Agents** | Ambiguity, reasoning, judgment | Medium-High | Variable | Response classification, content analysis |
| **Human Review** | High stakes, edge cases, taste | High | Low | Final approval, rejection decisions |

### Decision Tree

```
Is the task deterministic with clear rules?
├── YES → Use rules/scripts/automations
└── NO → Does it require reasoning about ambiguous input?
    ├── NO → Use weighted algorithm (like Partner matching)
    └── YES → What are the stakes if wrong?
        ├── LOW → Agent can act autonomously
        ├── MEDIUM → Agent suggests, human confirms
        └── HIGH → Agent surfaces info, human decides
```

---

## Current State of the World (SOTW)

### Volume (Last Month)
- **382 assets** submitted
- **95% Templates**, 5% Apps
- **37% published**, 63% pending/rejected
- **26 assets (7%)** stuck 5+ days in review

### Review Team
- 5-6 active reviewers
- Top 3 handle 71% of reviews
- Pablo handles Apps specifically

### Existing Agents
- **Response Classification**: Reads creator responses, determines status update
- **Categorization agents**: Running via automations (details TBD)

### Pain Points (from Joey/Micah discussion)
1. **Speed (A)**: Review queue backlog, 5+ day delays
2. **Consistency (B)**: Different reviewers, different patterns

---

## Opportunity Evaluation

### Agent Opportunities by Stage

| Stage | Opportunity | Current | Proposed | Value |
|-------|-------------|---------|----------|-------|
| **Submission** | Duplicate detection | None | Agent compares to existing | High |
| **Submission** | Pre-validation | Template Validation app | Integrate results into Airtable | Medium |
| **Queue** | Smart routing | Manual/round-robin | Route by asset type + reviewer expertise | High |
| **Review** | Security pre-scan | Bundle Scanner (manual) | Auto-run on all submissions | High |
| **Review** | Consistency check | None | Surface similar past reviews | High |
| **Feedback** | Response classification | **Exists** | Optimize accuracy + add confidence | Medium |
| **Rejection** | Email generation | Templates | Contextual draft generation | Medium |

### Prioritized Opportunities

**P1 - Optimize Existing**
1. Response Classification agent accuracy/confidence

**P1 - High Value Additions**
2. Security pre-scan automation
3. Validation → Review correlation (learn what matters)

**P2 - Queue Improvements**
4. Smart routing based on asset type
5. Priority scoring

**P3 - Creator Experience**
6. Auto-fix suggestions in Validation app
7. Predictive review timeline in Dashboard

---

## Guardrails

### Cost Management
- Token budgets per agent per day
- Fallback to rules when budget exceeded
- Model selection by task (Haiku for classification, Opus for analysis)

### Risk Management
- **Security**: No PII in prompts, audit all agent decisions
- **Reputational**: Human approval for creator-facing output
- **Operational**: Circuit breakers, graceful degradation

### Quality Gates
- Shadow mode: Agent runs but doesn't act (2 weeks minimum)
- Accuracy threshold: 90%+ before autonomous operation
- Human override: Always available, tracked for learning

---

## Architecture Approach

### Airtable-Native (Joey's Domain)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AIRTABLE TABLES                              │
├─────────────────────────────────────────────────────────────────┤
│  Agent Configs          │  Agent Logs            │  Assets      │
│  (versioned prompts,    │  (decisions, inputs,   │  (existing   │
│   like Algorithms)      │   outputs, accuracy)   │   workflow)  │
└─────────────────────────┴────────────────────────┴──────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                AIRTABLE AUTOMATIONS                             │
│  Trigger: Record created/updated                                │
│  Action: Script block calls external AI API                     │
│  Result: Update record with agent output                        │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  External AI Service  │
        │  (Anthropic/OpenAI)   │
        │  OR                   │
        │  Cloudflare Worker    │
        │  with Agent SDK       │
        └───────────────────────┘
```

### Cloudflare Worker (Micah's Domain)

For heavier processing (Bundle Scanner, validation correlation):

```
┌─────────────────────────────────────────────────────────────────┐
│                 CLOUDFLARE WORKER                               │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/agent/classify-response                              │
│  POST /api/agent/pre-scan                                       │
│  POST /api/agent/route-asset                                    │
│                                                                 │
│  Uses: Agent SDK patterns, versioned configs                    │
│  Returns: { decision, confidence, reasoning }                   │
└─────────────────────────────────────────────────────────────────┘
```

### Python Scripts (Joey's Domain)

For complex analysis, batch processing, or ML models:

```python
# Example: Response classification with confidence
from anthropic import Anthropic

def classify_response(response_text: str, config_version: str) -> dict:
    prompt = get_prompt_for_version(config_version)
    result = client.messages.create(...)
    return {
        "intent": result.intent,
        "confidence": result.confidence,
        "should_update_status": result.confidence > 0.85,
        "reasoning": result.reasoning
    }
```

---

## Implementation Path

### Phase 1: Foundation (Weeks 1-2)
- [ ] Document Response Classification agent current logic
- [ ] Create Agent Configs table (modeled on Algorithms)
- [ ] Create Agent Logs table for decision tracking
- [ ] Establish accuracy baseline for existing agent

### Phase 2: Optimize Existing (Weeks 3-4)
- [ ] Add confidence scoring to Response Classification
- [ ] Implement escalation path for low confidence
- [ ] Track human overrides for learning
- [ ] Measure accuracy improvement

### Phase 3: Add High-Value Agents (Weeks 5-8)
- [ ] Security pre-scan automation (Bundle Scanner integration)
- [ ] Validation → Review correlation tracking
- [ ] Smart routing prototype

### Phase 4: Scale & Iterate (Ongoing)
- [ ] A/B test agent versions
- [ ] Expand to P2/P3 opportunities
- [ ] Build agent performance dashboard

---

## Action Items

### Immediate (This Week)
- [x] Document system context and scope
- [x] Create agent audit framework
- [x] Analyze volume data
- [ ] Get Response Classification agent accuracy metrics
- [ ] Document current agent prompt/logic

### Short-term (Next 2 Weeks)
- [ ] Design Agent Configs table schema
- [ ] Design Agent Logs table schema
- [ ] Set up shadow mode infrastructure
- [ ] Define accuracy measurement methodology

### Medium-term (Next Month)
- [ ] Implement confidence scoring
- [ ] Build Cloudflare Worker for pre-scan
- [ ] Create correlation tracking between Validation and Review

---

## Research Insights (via Perplexity - Jan 19, 2026)

### Key Findings Applied

| Finding | Application |
|---------|-------------|
| **pyAirtable** | Python library for Airtable API - Joey can integrate LLM calls directly |
| **60% automation rate** | Shopify achieves this with proper confidence calibration - our target |
| **Multi-tier thresholds** | >85% auto-approve, 70-85% quick review, <70% deep review |
| **Graduated enforcement** | First violation = warning, repeat = escalation (like Etsy) |
| **Prompt versioning** | Store in Git + Configs table, test before deploy, A/B test |
| **Supervisor pattern** | For future multi-agent pipeline (security + design + compliance) |

### Calibration is Critical

Raw model confidence is poorly calibrated. A model reporting 90% confidence may only be 70% accurate. Solution:
- Measure Expected Calibration Error (ECE) on validation set
- Implement category-specific thresholds (high-stakes = stricter)
- Track human reviewer agreement to detect drift

See `research-findings.md` for full details

---

## Success Metrics

| Metric | Baseline | Target | Timeframe |
|--------|----------|--------|-----------|
| Response Classification accuracy | TBD | 95%+ | 4 weeks |
| Review turnaround (median) | ~2-3 days | < 1 day | 8 weeks |
| 5+ day backlog | 26 assets | < 5 assets | 8 weeks |
| Reviewer consistency | Variable | Measurable standard | 8 weeks |

---

## References

- FigJam: Marketplace Agentic Architecture Exploration (Jan 15, 2026)
- Meeting transcript: Joey + Micah (Jan 15, 2026)
- Partner/Experts Algorithms table (v7 pattern)
- `packages/agent-sdk/` - Agent development patterns
- `docs/internal/EXPERIMENT_04_IC_MVP_PIPELINE.md` - IC MVP pipeline

---

*This document is the canonical reference for the Marketplace Agentic Architecture work. Update as decisions are made and progress is tracked.*
