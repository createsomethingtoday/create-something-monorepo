# GTM Sprint 2: Weeks 5-8 Plan

**Sprint Duration**: 8 weeks total
**Current Phase**: Weeks 5-8 (Execution & Optimization)
**Goal**: First paying client from inbound funnel

---

## Philosophical Foundation

This GTM strategy embodies the [Hermeneutic Circle](/canon/concepts/hermeneutic-circle): each piece of content informs the next, and understanding deepens through iteration. We don't broadcast—we build a compounding body of thought.

**Core Principles:**
- **[Weniger, aber besser](/canon/concepts/weniger-aber-besser)**: Fewer, higher-quality touchpoints. One resonant post beats ten forgettable ones.
- **[Zuhandenheit](/canon/concepts/zuhandenheit)**: Our content should recede—readers remember the insight, not the source. The tool disappears into use.
- **[Complementarity](/canon/concepts/complementarity)**: We partner with clients, not replace them. GTM messaging emphasizes augmentation, not automation.

**Anti-patterns to avoid:**
- [Gestell](/canon/concepts/gestell) thinking: treating prospects as "leads to be optimized" rather than humans with problems.
- Decorative content: posts that seek attention rather than communicate value.

---

## Sprint Summary

| Phase | Weeks | Focus | Status |
|-------|-------|-------|--------|
| Foundation | 1-4 | Content + Infrastructure | ✅ Complete |
| Execution | 5-6 | Outreach + Conversion | 🔄 Current |
| Optimization | 7-8 | Iterate + Close | Upcoming |

---

## Weeks 1-4 Recap (Complete)

### Content Infrastructure
- [x] Subtractive Triad thread (5-part) - Scheduled Jan 14-28
- [x] AI Agent Patterns thread (7-part) - Scheduled Feb 4-25
- [x] Kickstand case study thread - Scheduled

### Sales Infrastructure
- [x] Proposal generation system (`/api/proposals`)
- [x] Discovery call script (`content/sales/discovery-call-script.md`)
- [x] Funnel dashboard (`/admin/funnel`)
- [x] Lead management (`/admin/funnel/leads/new`)
- [x] Metrics recording (`/admin/funnel/record`)

### LMS Content
- [x] Lesson 2 (DRY) - Praxis section added
- [x] Lesson 3 (Rams) - Praxis section added

---

## Week 5: Outreach Systems

**Theme**: Proactive lead generation

### Deliverables

#### 5.1 LinkedIn Outreach Templates
Create templated messages for warm outreach:

```
templates/
├── connection-request.md      # Initial connection (no pitch)
├── post-engagement.md         # After they engage with content
├── mutual-connection.md       # Warm intro request
└── discovery-invite.md        # Invite to call (after rapport)
```

**Voice**: Helpful, not salesy. Reference specific content they engaged with.

#### 5.2 Ideal Client Profile (ICP) Document
Define who we're targeting:

| Attribute | Ideal | Acceptable | Avoid |
|-----------|-------|------------|-------|
| Company size | 10-50 employees | 5-100 | <5 or >500 |
| Industry | Tech, SaaS, Agency | Professional services | Retail, F&B |
| Pain point | AI integration, automation | Web presence | "Just a website" |
| Budget | $15k-50k | $8k-75k | <$5k |
| Timeline | 2-8 weeks | 1-12 weeks | "Someday" |

#### 5.3 Content Engagement Tracking
Enhance funnel dashboard:
- Track LinkedIn post engagement → lead attribution
- Source detail field populated automatically
- Campaign attribution for each thread

#### 5.4 Weekly Metrics Ritual
Establish cadence:
- **Daily**: Record LinkedIn metrics (5 min)
- **Weekly**: Review funnel, identify bottlenecks (30 min)
- **Bi-weekly**: Content performance analysis (1 hr)

### Success Criteria
- [ ] 5 connection requests sent per day
- [ ] 10+ profile views from ICP per week
- [ ] 2+ discovery calls scheduled

---

## Week 6: Conversion Optimization

**Theme**: Turn interest into conversations

### Deliverables

#### 6.1 Second Case Study
Choose from completed projects:
- Viralytics (AI/ML)
- Arc for Gmail (Product)
- Maverick X (Platform)

Format: Same thread structure as Kickstand
Schedule: After AI Patterns thread (late Feb)

#### 6.2 Objection Handling Document
Common objections and responses:

| Objection | Response Framework |
|-----------|-------------------|
| "Too expensive" | ROI calculation, phased approach |
| "We can do it in-house" | Time cost, opportunity cost |
| "Not ready yet" | Pilot project, low-risk start |
| "Need to think about it" | Specific concerns, timeline |
| "Bad AI experience before" | Our approach differs (show how) |

#### 6.3 ROI Calculator
Simple tool for discovery calls:
- Input: Current manual hours, hourly cost
- Output: Annual savings, payback period
- Location: `/tools/roi-calculator` or spreadsheet

#### 6.4 Testimonial Collection
Reach out to past clients:
- Kickstand (Marcus)
- Viralytics team
- Arc collaborators

Format: 2-3 sentence quote + headshot + title

### Success Criteria
- [ ] 1 discovery call → proposal conversion
- [ ] 2 testimonials collected
- [ ] Second case study drafted

---

## Week 7: Sales Enablement

**Theme**: Close deals efficiently

### Deliverables

#### 7.1 Pricing Framework Document
Standardize pricing logic:

| Service Tier | Range | Typical Scope |
|--------------|-------|---------------|
| Sprint | $8k-15k | 2-week focused build |
| Standard | $15k-35k | 4-6 week project |
| Platform | $35k-75k | 8-12 week system |
| Retainer | $5k-15k/mo | Ongoing support |

Factors: Complexity, timeline, support level

#### 7.2 Proposal Templates
Enhance generator with:
- Multiple tier options (good/better/best)
- Timeline visualization
- Payment schedule options
- Terms and conditions

#### 7.3 Contract Templates
Standard agreements:
- Master Services Agreement (MSA)
- Statement of Work (SOW) template
- NDA (mutual)

#### 7.4 Follow-up Sequences
Post-proposal cadence:
- Day 1: Proposal sent + summary email
- Day 3: "Any questions?" check-in
- Day 7: Value reminder + case study
- Day 14: Decision timeline check
- Day 21: Final follow-up or close

### Success Criteria
- [ ] 1 proposal sent
- [ ] Contract templates ready
- [ ] Follow-up sequence documented

---

## Week 8: Review & Iterate

**Theme**: Learn and adjust

### Deliverables

#### 8.1 Funnel Analysis Report

**Template**: [funnel-analysis-sprint-2.md](./reports/funnel-analysis-sprint-2.md)

Review 8 weeks of data:
- Impressions → Engagement rate
- Engagement → Profile visits
- Visits → Connection requests received
- Connections → Discovery calls
- Calls → Proposals
- Proposals → Closed

Identify biggest drop-off point.

#### 8.2 Content Performance Review
Analyze threads:
- Which posts got most engagement?
- What time/day performed best?
- Which topics resonated?

Document learnings for Sprint 3 content.

#### 8.3 Process Retrospective (Subtractive Triad Review)

Apply the [Subtractive Triad](/canon) to our GTM process:

| Level | Question | Reflection |
|-------|----------|------------|
| **DRY** (Implementation) | What are we duplicating? | Which processes can be unified? |
| **Rams** (Artifact) | What doesn't earn its existence? | Which activities produced no value? |
| **Heidegger** (System) | What's disconnected? | Which efforts didn't serve the whole? |

**What worked** (Keep):
- Activities that produced qualified conversations

**What didn't** (Subtract):
- Activities that consumed time without producing signal

**What to try** (Experiment):
- New approaches for Sprint 3

#### 8.4 Sprint 3 Planning
Based on learnings, plan:
- Content calendar (next 8 weeks)
- Target metrics (based on baselines)
- New experiments to run

### Success Criteria
- [ ] Funnel analysis complete
- [ ] Sprint 3 plan drafted
- [ ] At least 1 deal in pipeline

---

## Key Metrics to Track

### Awareness (Top of Funnel)
| Metric | Week 5 Target | Week 8 Target |
|--------|---------------|---------------|
| LinkedIn impressions/week | 3,000 | 5,000 |
| Reach/week | 1,500 | 2,500 |
| Engagement rate | 2.5% | 3.0% |
| Profile views/week | 50 | 100 |

### Consideration (Middle of Funnel)
| Metric | Week 5 Target | Week 8 Target |
|--------|---------------|---------------|
| Website visits/week | 100 | 200 |
| Connection requests received | 5 | 10 |
| Content downloads | 2 | 5 |

### Decision (Bottom of Funnel)
| Metric | Week 5 Target | Week 8 Target |
|--------|---------------|---------------|
| Discovery calls/month | 2 | 4 |
| Proposals sent | 1 | 2 |
| Close rate | - | 25% |

---

## Daily/Weekly Rituals

### Daily (10 min)
1. Check LinkedIn notifications
2. Respond to comments on posts
3. Send 2-3 connection requests to ICP
4. Record any leads in funnel

### Weekly (1 hr)
1. Record weekly LinkedIn metrics
2. Review funnel dashboard
3. Plan week's outreach targets
4. Draft/schedule content if needed

### Bi-weekly (2 hr)
1. Deep content performance analysis
2. Update ICP based on conversations
3. Refine outreach templates
4. Adjust strategy as needed

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Low engagement on threads | A/B test hooks, adjust posting time |
| No discovery calls | Increase outreach volume, warm intro focus |
| Proposals not converting | Review pricing, add social proof |
| Running out of content | Repurpose existing content, user questions |

---

## Dependencies

### External
- LinkedIn algorithm (can't control)
- Prospect availability
- Market conditions

### Internal
- Daily metrics recording discipline
- Consistent outreach execution
- Quick proposal turnaround

---

## Sprint 2 Success Definition

**Minimum Viable Success**:
- 1 qualified lead in decision stage
- Funnel baseline established
- Repeatable outreach process

**Target Success**:
- 1 signed client ($10k+)
- 3+ discovery calls completed
- 2 case studies published

**Stretch Success**:
- 2 signed clients
- 5+ discovery calls
- Referral from existing client

---

*Last updated: December 29, 2025*
*Owner: CREATE SOMETHING GTM*
