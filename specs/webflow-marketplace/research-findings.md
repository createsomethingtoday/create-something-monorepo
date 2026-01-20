# Agentic Architecture Research Findings

**Research Date:** 2026-01-19  
**Sources:** Enterprise best practices, Gartner, McKinsey, Salesforce Architecture, academic papers

---

## Key Industry Trends

### Market Trajectory
- **Gartner predicts** by end of 2026, ~40% of enterprise apps will include task-specific AI agents (up from <5% in 2025)
- Shift toward **Outcome as Agentic Solution (OaAS)** - contracting for outcomes achieved by agents
- Enterprises building platforms to orchestrate, monitor, and secure agents

---

## Decision Framework: Agents vs Rule-Based Automation

### When to Use Rule-Based Automation
| Criteria | Rationale |
|----------|-----------|
| **Predictability required** | Tasks are fully known, bounded, rules are stable |
| **Compliance-critical** | Errors carry high legal, financial, or safety risk |
| **Clean data & stable APIs** | Well-defined boundaries, mature infrastructure |
| **Cost-sensitive at scale** | Lower compute cost, predictable scaling |
| **Auditability paramount** | Deterministic behavior easier to audit |

### When to Use AI Agents
| Criteria | Rationale |
|----------|-----------|
| **Adaptability needed** | Inputs vary, unexpected situations arise |
| **Reasoning required** | Planning, decision-making beyond if/then logic |
| **Evolving business goals** | Dynamic environments, changing requirements |
| **Cross-system coordination** | Integration across multiple domains |
| **Edge case handling** | Graceful degradation when rules don't cover scenario |

---

## Enterprise Agentic Architecture Patterns

### 1. Task-Oriented Agent
- **Description:** Single agent for specific workflow with defined steps
- **Use Cases:** Tier-1 support, invoice processing, email routing
- **Marketplace Application:** App validation, submission routing

### 2. Tool-Calling & Orchestration
- **Description:** Agent chooses tools/APIs, runs actions in downstream systems
- **Use Cases:** Data aggregation, CRM updates, report generation
- **Marketplace Application:** Code bundle analysis, metadata enrichment

### 3. Multi-Agent Collaboration
- **Description:** Specialized agents (research, reasoning, execution) coordinated under orchestration
- **Use Cases:** Complex workflows, incident response, cross-system tasks
- **Marketplace Application:** Full app review pipeline (security + design + compliance)

### 4. Reflective / Self-Improving Agents
- **Description:** Agents evaluate outputs, detect drift, trigger human review
- **Use Cases:** Code generation, content generation, decision support
- **Marketplace Application:** Review quality monitoring, pattern learning

### 5. Hierarchical Planning (Manager-Worker)
- **Description:** Supervisor decomposes goals, assigns to worker/sub-agents
- **Use Cases:** Project planning, multi-step processes
- **Marketplace Application:** Complex app onboarding workflows

---

## Security Patterns for Agent-Based Code Review

### Identity & Access
- **Treat agents as non-human identities** - unique service accounts per agent
- **Zero-Trust by default** - continuous verification, minimal permissions
- **Ephemeral credentials** - avoid embedded secrets

### Deployment Progression
```
Sandbox → Shadow → Canary → Full Rollout
   ↓         ↓         ↓          ↓
 Testing   Observing  Limited   Production
           (no action) scope    deployment
```

### Security Controls
| Control | Implementation |
|---------|---------------|
| **Policy-as-Code** | Encode rules in enforceable artifacts, version like code |
| **Audit Logging** | Every action, reasoning step, data access logged |
| **Anomaly Detection** | Behavioral baselines, alert on deviations |
| **Data Minimization** | Only feed agents data they need |
| **Gateway Mediation** | API layers validate, log, limit agent requests |

### Code Review Specific
- AI-generated code needs **rigorous review** (surveys show developers skip this)
- Include **static analysis, security linting, human audits** for high-impact components
- **Prompt injection** and **tool poisoning** are real threats - threat model accordingly

---

## Best Practices for Production Deployment

### 1. Governance by Design
- [ ] Unique identities for each agent
- [ ] Granular permissions/scopes
- [ ] Audit trails and explainability
- [ ] Human-in-the-loop for high-risk decisions

### 2. Observability (AgentOps)
- [ ] Track agent behavior, performance, drift, costs
- [ ] Define agent lifecycles (creation, versioning, deprecation)
- [ ] Behavioral baselines and anomaly detection

### 3. Modularity
- [ ] Decompose into specialized agents
- [ ] Shared semantic understanding and data context
- [ ] Single-purpose tool modules, composable

### 4. Hybrid Strategy
- [ ] Offload deterministic tasks to tools/rules
- [ ] Agent-orchestrated automation rules
- [ ] Rule-based fallback when uncertain

### 5. Cost-Aware Architecture
- [ ] Select appropriate model size
- [ ] Caching strategies
- [ ] Budget alerts and limits

### 6. Iterative Deployment
- [ ] Start with lower-risk areas
- [ ] Shadow mode before production
- [ ] Canary releases for gradual rollout

---

## Application to Marketplace Use Cases

### App Security Reviewer
| Pattern | Application |
|---------|-------------|
| **Task-Oriented Agent** | Single-purpose security scan |
| **Reflective Agent** | Self-evaluate confidence, escalate uncertain cases |
| **Policy-as-Code** | Security rules versioned alongside agent |
| **Shadow Deployment** | Run alongside human reviewers initially |

### Pre-Validator App
| Pattern | Application |
|---------|-------------|
| **Rule-Based Core** | Deterministic checks remain rules |
| **Agent Edge Cases** | Only invoke agent for ambiguous cases |
| **Gateway Mediation** | API validates all agent actions |
| **Cost Controls** | Token budget per validation |

### Design Analysis
| Pattern | Application |
|---------|-------------|
| **Tool-Calling** | Agent uses vision APIs, style checkers |
| **Human-in-Loop** | All recommendations require human approval |
| **Hierarchical** | Manager agent coordinates visual + UX + brand checks |

---

## Risk Matrix

| Risk | Mitigation |
|------|------------|
| **Prompt Injection** | Input sanitization, domain constraints, guardrails |
| **Tool Spoofing** | Verify tool responses, use trusted sources only |
| **Cost Overrun** | Token budgets, circuit breakers, fallback to rules |
| **Compliance Violation** | Audit logging, human oversight, policy-as-code |
| **Behavioral Drift** | Monitoring, baselines, automated alerts |
| **Secret Exposure** | Ephemeral credentials, no secrets in prompts |

---

## Marketplace-Specific Research (via Perplexity)

### Multi-Stage Pipeline Pattern (Industry Standard)

| Stage | Tool Type | Purpose | Latency |
|-------|-----------|---------|---------|
| **1. Initial Scan** | Rule-based (linters, Snyk, SonarQube) | Fast syntax/vuln blocking | Seconds |
| **2. Security/Quality** | AI Agent | Contextual vuln detection, drift analysis | Seconds-minutes |
| **3. Final Review** | Human + AI assist | Complex edge cases, compliance sign-off | Minutes-hours |

### Measured Results from Enterprise Deployments
- **50% reduction** in manual review time
- **70% faster** vulnerability detection
- **10+ hours/week** saved per team on reviews
- **20-40% reduction** in reviewer fatigue

### Platform-Specific Patterns

| Platform | Pattern | Key Insight |
|----------|---------|-------------|
| **GitHub** | AI agents restricted to draft PRs only | Human oversight preserved - no direct pushes to main |
| **Salesforce AppExchange** | Org-wide rules with audit trails | Compliance-first architecture |
| **Shopify** | PR agents for velocity | Quality maintained at scale |

### Cost & Latency at Scale
- **Cost drivers**: Multi-repo indexing (400k+ files), customization, training
- **3-5x subscription costs** at enterprise scale
- **Mitigation strategies**:
  - Flexible LLM deployment
  - Batch submissions with async queues
  - SOC 2/ISO 42001 certified platforms
- **Quick wins** (highest ROI): Stack trace analysis, security scanning

### Agentic Workflow Implementation
- AI agents act as "first-pass reviewers" with defined roles/goals
- Structured prompts encoding security rules and standards
- Multi-repo context to catch architectural drift
- One-click patch generation matching team norms
- Quality gates with evidence trails

---

## Next Steps for Marketplace Team

1. **Map existing processes** to the decision framework (agents vs rules)
2. **Select pilot use case** - recommend Error Record Fixing (lowest risk)
3. **Design shadow deployment** for App Security Reviewer
4. **Implement AgentOps** - logging, monitoring, cost tracking
5. **Define policy-as-code** framework for security rules

---

---

## Deep Research: Airtable + LLM Integration (January 19, 2026)

*Research conducted via Perplexity Deep Research on production patterns for marketplace review systems.*

### Airtable + LLM Architecture Pattern

The recommended architecture separates concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AIRTABLE (Data Layer)                        │
│  Reviews table → Classifications table → Review Queue table     │
│  + Configurations table (prompt versions, thresholds)           │
└─────────────────────────────────────────────────────────────────┘
                    │ Automation triggers webhook
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              PYTHON SERVICE (Intelligence Layer)                │
│  Uses pyAirtable for CRUD, Anthropic/OpenAI for classification  │
│  Implements routing logic, returns { decision, confidence }     │
└─────────────────────────────────────────────────────────────────┘
                    │ Updates record
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                 HUMAN REVIEW (Judgment Layer)                   │
│  Airtable Interface views for escalated cases                   │
│  Feedback captured → continuous improvement loop                │
└─────────────────────────────────────────────────────────────────┘
```

**Key Library:** `pyAirtable` - Python client for Airtable REST API

### Prompt Versioning Best Practices

| Practice | Implementation |
|----------|---------------|
| **Git-based versioning** | Store in `prompts/agent_name/v1.md`, `v2.md` |
| **Semantic naming** | `review_classify_toxicity_v3`, `review_detect_spam_v2` |
| **Evaluation gates** | Test against labeled dataset before deployment |
| **A/B testing** | Route traffic to different versions, compare accuracy |
| **Rollback capability** | Configuration switches active version without deployment |

**Prompt Loader Pattern:**
```python
class PromptLoader:
    def __init__(self, prompts_dir: str):
        self.prompts_dir = prompts_dir
    
    def get_latest(self, agent_name: str) -> str:
        # Finds highest version in prompts/{agent_name}/
        # Returns prompt content as string
```

### Confidence Calibration

**The Problem:** Raw model confidence is poorly calibrated. 90% reported confidence may only be 70% accurate.

**Solution: Expected Calibration Error (ECE)**
- Divide predictions into bins (0-10%, 10-20%, etc.)
- Compare reported confidence to actual accuracy in each bin
- Well-calibrated: 70% confidence → ~70% accuracy

**Multi-Tier Threshold Pattern:**

| Tier | Confidence | Action |
|------|------------|--------|
| **High** | >85% | Auto-approve |
| **Medium** | 70-85% | Quick human review (confirmation) |
| **Low** | <70% | Deep human review with full reasoning |

**Category-Specific Thresholds:**
- High-consequence categories (fraud, hate speech): require >90% for auto-approve
- Low-consequence categories (grammar, tone): can auto-approve at >75%

**Calibration Code Pattern:**
```python
def route_review(review_text, category_thresholds):
    classification, confidence = classify_review(review_text)
    threshold = category_thresholds.get(classification, 0.70)
    
    if confidence > threshold:
        return {"status": "approved", ...}
    elif confidence > threshold - 0.15:
        return {"status": "escalate_quick", ...}
    else:
        return {"status": "escalate_deep", ...}
```

### Shopify & Etsy Patterns

#### Shopify Findings
- **60% automation rate** for routine inquiries
- Multi-agent specialization (order tracking, returns, billing, product info)
- AI-assisted human handling (AI drafts, humans refine): 30-40% of tickets
- **10-20% improvement** in customer satisfaction with AI routing

#### Etsy Content Moderation
- **Multi-layer architecture:**
  1. Automated systems identify violative content
  2. Human enforcement specialists review/remove
  3. User reports via direct channels
  4. Regulatory reports inform enforcement
  5. Internal agents scan for violations

- **Graduated Enforcement:**
  - First violation → warning
  - Repeated violations → escalating consequences
  - Egregious violations → immediate action

- **Appeals Process:** Human review for contested decisions (100% accuracy is unattainable)

- **AI Disclosure Policy:** Sellers must disclose AI use in listings

### Escalation Design Patterns

**Structured Escalation Reasons:**
- `low_confidence` - Model uncertain
- `ambiguity` - Multiple reasonable interpretations
- `context_required` - Need info from seller/creator
- `conflicting_signals` - Different metrics disagree
- `appeal` - User contested classification

**Routing by Expertise:**
- Fraud → Financial review specialists
- Policy violations → Content specialists
- Mixed concerns → Team lead for triage

### Multi-Agent Orchestration

**Supervisor Pattern:**
```
Incoming Review
      │
      ▼
┌─────────────┐
│  Supervisor │ ← Decides which specialists to invoke
└─────────────┘
      │
      ├──────────────┬──────────────┐
      ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Fraud   │  │  Policy  │  │  Quality │
│  Agent   │  │  Agent   │  │  Agent   │
└──────────┘  └──────────┘  └──────────┘
      │              │              │
      └──────────────┴──────────────┘
                     │
                     ▼
         ┌───────────────────┐
         │ Synthesized       │
         │ Final Decision    │
         │ + Confidence      │
         └───────────────────┘
```

### Cost Optimization

| Strategy | Implementation |
|----------|---------------|
| **Tiered model routing** | Simple → cheap model, complex → capable model |
| **Token budget monitoring** | Track tokens/review, optimize prompt length |
| **Caching** | Cache common classifications |
| **Batch processing** | Queue low-priority reviews for batch runs |

**Example:** If reviews average 2000 tokens but could achieve similar accuracy at 1500 tokens, optimizing saves 25% API costs.

### Observability Recommendations

**Engineering Dashboards:**
- Model accuracy by category
- Calibration curves (confidence vs actual accuracy)
- API latency percentiles (p50, p95, p99)
- Cost per review

**Operations Dashboards:**
- Current queue sizes
- Reviewer utilization rates
- Escalation reasons distribution

**Product Dashboards:**
- Escalation rate trends
- Average human review time
- Quality per dollar spent

### Implementation Phases (Industry Best Practice)

| Phase | Focus | Duration |
|-------|-------|----------|
| **1. Foundation** | Airtable tables, basic classification, confidence routing | 2-3 weeks |
| **2. Observability** | Dashboards, feedback capture, quality gates | 2-3 weeks |
| **3. Continuous Improvement** | Prompt versioning, A/B testing, feedback loops | Ongoing |

---

## Application to Webflow Marketplace

### Immediate Relevance

| Research Finding | Marketplace Application |
|-----------------|------------------------|
| **pyAirtable + webhooks** | Joey's Python expertise + existing Airtable backend |
| **Prompt versioning** | Model on Joey's Algorithms table pattern (v7) |
| **Multi-tier confidence** | Response Classification agent optimization |
| **Graduated enforcement** | Asset rejection workflow |
| **Supervisor pattern** | Future: Security + Design + Compliance pipeline |

### Recommended Agent Configs Table

Based on Joey's Algorithms table pattern:

| Field | Type | Purpose |
|-------|------|---------|
| `agent_name` | Single line | e.g., "response_classification" |
| `version` | Number | e.g., 7 |
| `status` | Single select | draft, staging, production, deprecated |
| `system_prompt` | Long text | The core prompt |
| `model` | Single select | claude-3-sonnet, gpt-4-turbo |
| `temperature` | Number | 0.0-1.0 |
| `confidence_threshold_high` | Number | Auto-approve threshold |
| `confidence_threshold_low` | Number | Deep review threshold |
| `created_at` | Date | Version creation date |
| `created_by` | Collaborator | Who created this version |
| `notes` | Long text | What changed and why |
| `active` | Checkbox | Is this the live version |

---

## References

- Gartner: Enterprise AI Agent Predictions 2026
- McKinsey: Deploying Agentic AI with Safety and Security
- Salesforce Architecture: Enterprise Agentic Architecture
- Microsoft: Azure Cloud Adoption Framework for AI Agents
- Shakudo: 5 Agentic AI Design Patterns (2025)
- Architecture & Governance: When to Use Agentic AI
- Perplexity Deep Research (January 2026):
  - pyAirtable documentation
  - Braintrust, PromptLayer, LangFuse platforms
  - Shopify AI customer service implementation
  - Etsy content moderation documentation
  - NAACL 2025: Confidence calibration in LLMs
  - Kore.ai: Multi-agent orchestration patterns
