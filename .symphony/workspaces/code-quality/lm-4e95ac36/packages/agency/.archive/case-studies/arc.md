# Case Study: Arc

**Client**: Arc
**Industry**: B2B SaaS / Financial Services
**Engagement**: AI-Powered Workflow Automation
**Duration**: 8 weeks

---

## Executive Summary

Arc, a B2B fintech platform serving startups and SMBs, was scaling rapidly but their operations team couldn't keep pace. Manual review processes that worked at 100 customers were breaking at 1,000.

We implemented an AI-powered document processing and risk assessment system that reduced manual review time by 73% while improving accuracy. The operations team went from firefighting to strategic work.

**Key Results**:
- **73%** reduction in manual review time
- **4.2 hours → 1.1 hours** average processing time per application
- **94%** accuracy on automated risk assessments (vs. 89% human baseline)
- **$180K** annual savings in operational costs

---

## The Challenge

### Scaling Pains

Arc's growth was creating a bottleneck: every new customer required manual document review, risk assessment, and compliance verification. The process involved:

- Collecting 8-12 documents per application
- Manual extraction of key data points
- Cross-referencing against multiple databases
- Risk scoring based on 40+ criteria
- Compliance documentation

**The numbers told the story:**

| Metric | At 100 Customers | At 1,000 Customers |
|--------|------------------|---------------------|
| Applications/week | 15-20 | 150-200 |
| Review staff | 2 | 8 (and growing) |
| Avg. processing time | 2.5 hours | 4.2 hours |
| Error rate | 8% | 14% |
| Customer complaints | Rare | Weekly |

The team was hiring reviewers faster than they could train them. Quality was declining. Processing time was increasing. Something had to change.

### Previous Attempts

Arc had tried several approaches:

1. **Hiring more staff**: Expensive and created training bottleneck
2. **Offshore team**: Quality issues, timezone delays
3. **RPA tools**: Brittle, broke with document variations
4. **Generic AI tools**: Too general, couldn't handle domain-specific requirements

Each solution addressed symptoms without solving the underlying problem: the process itself needed to be reimagined.

---

## Our Approach

### Discovery Sprint (Week 1-2)

We started with a two-week discovery sprint to understand the actual workflow, not the documented one.

**Key findings:**

1. **80/20 pattern**: 80% of applications followed predictable patterns; 20% required genuine human judgment
2. **Redundant verification**: Same data points were being checked 3-4 times across different steps
3. **Document variation**: 47 different document formats for the same information type
4. **Tribal knowledge**: Critical decision logic existed only in senior reviewers' heads

**The insight**: The goal wasn't to automate everything. It was to identify what genuinely required human judgment and automate everything else.

### Solution Design (Week 3)

We designed a three-layer system:

```
Layer 1: Document Intelligence
├── Ingestion (any format → structured data)
├── Extraction (key fields with confidence scores)
└── Validation (cross-reference and flag anomalies)

Layer 2: Risk Assessment Engine
├── Rule-based checks (compliance, thresholds)
├── ML-based scoring (pattern recognition)
└── Confidence calibration (know when to escalate)

Layer 3: Human-in-the-Loop
├── Dashboard for edge cases
├── Feedback mechanism (continuous improvement)
└── Audit trail (compliance documentation)
```

**Design principles:**

- **Transparent AI**: Every decision explainable, every confidence score visible
- **Graceful degradation**: Low confidence → human review, never silent failure
- **Continuous learning**: Human corrections improve the model

### Implementation (Week 4-7)

**Week 4: Document Intelligence Layer**
- Built document ingestion pipeline handling 47 format variations
- Trained extraction models on 2,000 historical documents
- Achieved 96% extraction accuracy on test set

**Week 5: Risk Assessment Engine**
- Encoded 40+ risk criteria as structured rules
- Trained ML model on 18 months of historical decisions
- Calibrated confidence thresholds with operations team

**Week 6: Integration & Dashboard**
- Connected to Arc's existing systems via API
- Built review dashboard for edge cases
- Implemented feedback loop for model improvement

**Week 7: Testing & Refinement**
- Parallel processing: AI + human for validation
- Tuned confidence thresholds based on results
- Documentation and team training

### Deployment (Week 8)

- Phased rollout: 10% → 50% → 100% of applications
- Real-time monitoring dashboard
- Escalation procedures documented
- 30-day hypercare support

---

## Results

### Quantitative Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Avg. processing time | 4.2 hours | 1.1 hours | **-73%** |
| Applications/reviewer/day | 2-3 | 8-10 | **+233%** |
| Error rate | 14% | 6% | **-57%** |
| Customer wait time | 3-5 days | Same day | **-80%** |
| Monthly capacity | 800 | 3,200 | **+300%** |

### Financial Impact

| Category | Annual Impact |
|----------|---------------|
| Reduced headcount growth | $120,000 |
| Faster customer activation | $45,000 |
| Reduced error remediation | $15,000 |
| **Total annual savings** | **$180,000** |

**ROI**: 3.2x in first year (project cost: $56,000)

### Qualitative Impact

**Operations Team:**
> "We went from processing paperwork to actually thinking about risk. The AI handles the obvious cases; we handle the interesting ones."
> — Operations Lead, Arc

**Leadership:**
> "We were about to hire four more reviewers. Instead, we redeployed two to higher-value work. The math was obvious."
> — COO, Arc

**Customers:**
- NPS improved 12 points (faster onboarding cited as top factor)
- Support tickets related to application status dropped 64%

---

## Technical Details

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Arc Platform                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Document Ingestion API                       │
│  • PDF, image, spreadsheet support                          │
│  • OCR with layout understanding                            │
│  • Format normalization                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Extraction Pipeline                         │
│  • Named entity recognition                                 │
│  • Table extraction                                         │
│  • Cross-document linking                                   │
│  • Confidence scoring                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Risk Assessment Engine                       │
│  • Rule engine (compliance, thresholds)                     │
│  • ML scorer (pattern-based risk)                           │
│  • Ensemble decision (rules + ML + confidence)              │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
           ┌──────────────┐    ┌──────────────┐
           │ Auto-Approve │    │ Human Review │
           │ (High Conf)  │    │ (Low Conf)   │
           └──────────────┘    └──────────────┘
```

### Model Performance

| Component | Accuracy | Precision | Recall |
|-----------|----------|-----------|--------|
| Document extraction | 96.2% | 94.8% | 97.1% |
| Risk classification | 94.1% | 92.3% | 95.8% |
| Escalation detection | 98.7% | 99.1% | 98.2% |

**Key design decision**: We optimized for high recall on escalation detection. Missing a risky application is worse than over-escalating a safe one.

### Technology Stack

- **Document processing**: Custom pipeline (Python, PyTorch)
- **OCR**: Tesseract + custom post-processing
- **ML models**: Fine-tuned transformers for extraction, gradient boosting for risk scoring
- **Infrastructure**: Cloudflare Workers for API, D1 for state, R2 for document storage
- **Dashboard**: SvelteKit with real-time updates

---

## Lessons Learned

### What Worked

1. **Discovery before solutioning**: Two weeks of observation revealed patterns that would have taken months to discover through trial and error.

2. **Human-in-the-loop from day one**: Building the escalation path first meant we could ship earlier with lower risk.

3. **Confidence calibration**: Knowing when the AI doesn't know is more valuable than raw accuracy.

4. **Feedback integration**: Every human correction improves the model. The system gets better with use.

### What We'd Do Differently

1. **Earlier stakeholder alignment**: Operations team was enthusiastic; compliance team needed more upfront involvement.

2. **More document variation in training**: Edge cases in production revealed gaps in training data. Would budget more for data collection upfront.

### Transferable Patterns

This approach applies whenever you have:
- High-volume, repetitive decision-making
- Mix of routine cases and genuine edge cases
- Domain expertise that's hard to hire
- Scaling pressure outpacing hiring capacity

---

## Engagement Details

| Aspect | Detail |
|--------|--------|
| Duration | 8 weeks |
| Team | 1 lead engineer, 1 ML specialist |
| Engagement type | Fixed-price implementation |
| Ongoing support | Retainer for model monitoring |

---

## About CREATE SOMETHING

We help technology companies integrate AI into their operations—not as a feature, but as capability. Our approach: understand the workflow, identify what genuinely requires human judgment, and automate everything else.

**Ready to discuss your workflow?**
[createsomething.agency/discover](https://createsomething.agency/discover)

---

## Appendix: Timeline

| Week | Phase | Key Activities |
|------|-------|----------------|
| 1 | Discovery | Stakeholder interviews, workflow observation |
| 2 | Discovery | Data analysis, pattern identification, solution design |
| 3 | Design | Architecture, model selection, integration planning |
| 4 | Build | Document intelligence layer |
| 5 | Build | Risk assessment engine |
| 6 | Build | Integration, dashboard, feedback loop |
| 7 | Test | Parallel processing, threshold tuning, documentation |
| 8 | Deploy | Phased rollout, training, hypercare |
