# Marketplace Agentic System Audit

**Purpose:** Identify where agents can be added, and optimize existing agents  
**Date:** 2026-01-19  
**Authors:** Micah Johnson, Joey Best-James

---

## Team Expertise

**Joey Best-James** — Airtable Specialist
- Built Partner/Experts matching system with algorithmic matching
- Maintains versioned algorithms in Airtable (v1-v7, currently v7 active)
- v7 algorithm: 17 variables, 270% aggregate variable weight
- Pattern: Algorithm versions tracked with status (Active/Archived), variable counts, timestamps

**Micah Johnson** — System Architect
- Frontend systems (Dashboard, Forms, Validation)
- Cloudflare Workers, Agent SDK
- IC MVP → Code Components pipeline
- Built Response Classification agent (Zapier + GPT-5.1)

---

## Existing Patterns to Build On

### Versioned Algorithms (from Partner/Experts)

Joey's Partner/Experts system demonstrates a pattern for managing algorithmic logic:

```
Algorithms Table
├── v7 (Active) - 17 variables, 270% weight
├── v6 (Archived) - 16 variables, 260% weight
├── v5 (Archived) - 14 variables, 270% weight
└── ... v1-v4
```

**Applicable to Agents:**
- Version agent prompts/logic like algorithms
- Track performance metrics per version
- A/B test agent versions
- Rollback capability

### Matching Algorithm Pattern

The Partner/Experts matching algorithm:
- Takes user-provided details as input
- Applies weighted variables
- Produces ranked matches

**Applicable to Marketplace:**
- Asset → Reviewer routing (match asset type to reviewer expertise)
- Response classification (match response patterns to intents)
- Similarity detection (match new submissions to existing assets)

---

## Current Agent Inventory

### Agent 1: Response Classification Agent

**Location:** Zapier (Zap: "Zendesk Response Sync")  
**Owner:** Micah Johnson  
**Model:** GPT-5.1 (temperature: 0.7)  
**Status:** Nodes 2-5 paused

**Function:** Determines if status should update from "Changes Requested" → "Response to Review"

**Zap Flow:**
```
1. TRIGGER: Airtable - Updated record
   Table: 🧘Zendesk Messages
   View: 📤Changes Requested (No Notification) - Status Update

2. SEARCH: Zendesk - Get latest comment (ticket_id from step 1)

3. AI: ChatGPT - Classify email
   Output: "Ready for re-review" or "Still working on it"

4. FILTER: Continue only if "Ready for re-review"

5. ACTION: Airtable - Update 🖌️Asset Versions
   Field: Status → "🔁Response to Review"
```

**Classification Framework (Heideggerian Phenomenology):**

The prompt uses Heidegger's phenomenological distinction between modes of being:

| Mode | German | Meaning | Maps To |
|------|--------|---------|---------|
| **Ready-to-hand** | Zuhandenheit | Work achieved completion, withdraws from attention | "Ready for re-review" |
| **Present-at-hand** | Vorhandenheit | Work remains incomplete, object of ongoing effort | "Still working on it" |

**Prompt Interpretation Method:**
1. Attend to the temporal horizon: Does the creator speak from having-completed or still-working?
2. Identify the orientation of concern: Is their care directed toward review, or toward unfinished work?
3. Discern the essential disclosure: What mode of being does this message reveal?

**"Ready for re-review" Indicators:**
- Statements that updates are complete or finished
- Requests for re-review or next steps
- Inquiries about whether their submission was received
- Questions about review timeline (presupposing readiness)
- Check-ins implying they believe the work is done

**"Still working on it" Indicators:**
- Statements about work in progress
- Requests for more time or extensions
- Questions about requirements while actively revising
- Acknowledgment of issues still being addressed
- Language of continuation or incompleteness

**Evaluation:**
- [ ] Accuracy rate?
- [ ] False positive rate (updates when shouldn't)?
- [ ] False negative rate (doesn't update when should)?
- [ ] Edge cases that trip it up?
- [ ] Why is it currently paused?

---

## Full Workflow Mapping

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           ASSET LIFECYCLE                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  1. SUBMISSION                                                                      │
│  ──────────────                                                                     │
│  Creator submits via web form                                                       │
│       ↓                                                                             │
│  Asset created in Airtable                                                          │
│       ↓                                                                             │
│  Status: "Submitted"                                                                │
│                                                                                     │
│  🤖 AGENT OPPORTUNITY: Intake validation                                            │
│     - Metadata completeness check                                                   │
│     - Duplicate detection                                                           │
│     - Auto-categorization enhancement                                               │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  2. QUEUE & ASSIGNMENT                                                              │
│  ─────────────────────                                                              │
│  Asset enters review queue                                                          │
│       ↓                                                                             │
│  Reviewer assigned (or self-assigned)                                               │
│       ↓                                                                             │
│  Status: "In Review"                                                                │
│                                                                                     │
│  🤖 AGENT OPPORTUNITY: Smart routing                                                │
│     - Route to reviewer by expertise (Templates vs Apps)                            │
│     - Priority scoring based on creator history                                     │
│     - Load balancing across reviewers                                               │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  3. REVIEW                                                                          │
│  ─────────                                                                          │
│  Reviewer examines asset                                                            │
│       ↓                                                                             │
│  Decision: Approve / Request Changes / Reject                                       │
│                                                                                     │
│  🤖 AGENT OPPORTUNITY: Review assistant                                             │
│     - Pre-scan with Bundle Scanner (security rules)                                 │
│     - Surface similar past reviews for consistency                                  │
│     - Auto-generate checklist based on asset type                                   │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  4A. APPROVAL PATH                                                                  │
│  ─────────────────                                                                  │
│  Status: "Approved" → "Published"                                                   │
│       ↓                                                                             │
│  Asset goes live on Marketplace                                                     │
│                                                                                     │
│  🤖 AGENT OPPORTUNITY: Post-publish                                                 │
│     - Notification to creator                                                       │
│     - Analytics tracking setup                                                      │
│     - Social promotion suggestions                                                  │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  4B. CHANGES REQUESTED PATH                                                         │
│  ──────────────────────────                                                         │
│  Status: "Changes Requested"                                                        │
│       ↓                                                                             │
│  Feedback pushed to Zendesk ticket                                                  │
│       ↓                                                                             │
│  Creator receives notification                                                      │
│       ↓                                                                             │
│  Creator responds                                                                   │
│       ↓                                                                             │
│  🤖 EXISTING AGENT: Response Classification                                         │
│     Determines: Update status or keep?                                              │
│       ↓                                                                             │
│  If ready: Status → "Response to Review"                                            │
│  If not: Status stays "Changes Requested"                                           │
│                                                                                     │
│  🤖 AGENT OPPORTUNITY: Response classification improvement                          │
│     - Confidence scoring (high/medium/low)                                          │
│     - Escalation for ambiguous responses                                            │
│     - Learning from corrections                                                     │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  4C. REJECTION PATH                                                                 │
│  ─────────────────                                                                  │
│  Status: "Rejected"                                                                 │
│       ↓                                                                             │
│  Rejection email sent via Zendesk                                                   │
│                                                                                     │
│  🤖 AGENT OPPORTUNITY: Rejection handling                                           │
│     - Auto-generate rejection email draft                                           │
│     - Categorize rejection reason for analytics                                     │
│     - Suggest improvements for resubmission                                         │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Opportunity Matrix

### By Workflow Stage

| Stage | Opportunity | Value | Complexity | Priority |
|-------|-------------|-------|------------|----------|
| **Submission** | Intake validation | Medium | Low | P2 |
| **Submission** | Duplicate detection | High | Medium | P1 |
| **Submission** | Auto-categorization | Medium | Low | P2 |
| **Queue** | Smart routing | High | Medium | P2 |
| **Queue** | Priority scoring | Medium | Low | P3 |
| **Review** | Security pre-scan | High | Medium | P1 |
| **Review** | Consistency check | High | Medium | P1 |
| **Review** | Checklist generation | Low | Low | P3 |
| **Changes** | Response classification | High | Low | **EXISTS** |
| **Changes** | Confidence scoring | Medium | Low | P2 |
| **Rejection** | Email draft generation | Medium | Low | P3 |
| **Publish** | Creator notification | Low | Low | P3 |

### By Agent Type

| Agent Type | Description | Exists? | Optimize? | Add? |
|------------|-------------|---------|-----------|------|
| **Classification** | Categorize assets, responses | Partial | ✅ | ✅ |
| **Validation** | Check rules, security, metadata | No | — | ✅ |
| **Routing** | Assign to right reviewer | No | — | ✅ |
| **Generation** | Draft emails, checklists | No | — | ✅ |
| **Scoring** | Confidence, priority, risk | No | — | ✅ |

---

## Existing Agent Deep Dive: Response Classification

### Current Behavior

**Input:** Creator response text from Zendesk  
**Output:** Boolean decision (update status or not)

**Intent Categories:**
1. ✅ **Ready for Review** - "I've made the changes", "Updates complete", "Please review again"
2. ❌ **Question/Clarification** - "What do you mean by...", "Can you explain...", "I'm not sure about..."
3. ❌ **Keep Open** - "Just checking in", "Still working on it", "Don't close the ticket"
4. ❓ **Ambiguous** - Mixed signals, unclear intent

### Optimization Opportunities

**1. Add Confidence Scoring**
```
Response: "I think I've fixed most of the issues you mentioned"

Current: Binary (yes/no)
Improved: { action: "update", confidence: 0.72, reason: "partial completion language" }
```

**2. Escalation Path**
- Low confidence (<70%) → Flag for human review
- Medium confidence (70-90%) → Auto-update with notification
- High confidence (>90%) → Silent auto-update

**3. Feedback Loop**
- Track when humans override agent decision
- Use overrides to improve classification
- Measure accuracy over time

**4. Multi-intent Detection**
```
Response: "I've made the changes. Also, quick question - should the button be blue or green?"

Detection: 
- Intent 1: Ready for review ✅
- Intent 2: Question ❓

Action: Update status + flag for reviewer to answer question
```

---

## High-Priority Agent Additions

### 1. Security Pre-Scan Agent

**Trigger:** Asset submitted  
**Function:** Run Bundle Scanner rules automatically  
**Output:** Risk score + specific findings in Airtable

**Value:** 
- Catch obvious issues before human review
- Reduce reviewer cognitive load
- Improve consistency across reviewers

**Integration:**
```
Airtable Automation → Cloudflare Worker → Bundle Scanner Core → Write results back
```

### 2. Duplicate Detection Agent

**Trigger:** Asset submitted  
**Function:** Compare against existing assets (name, screenshots, code patterns)  
**Output:** Duplicate flag + similar assets list

**Value:**
- Prevent duplicate listings
- Surface potential IP issues
- Speed up review for resubmissions

**Integration:**
```
Airtable Automation → Vector similarity search → Flag in Airtable
```

### 3. Review Consistency Agent

**Trigger:** Review started  
**Function:** Surface past reviews of similar assets  
**Output:** "Similar assets were reviewed as: [Approved/Rejected] because [reasons]"

**Value:**
- Reduce reviewer-to-reviewer variance
- Faster onboarding for new reviewers
- Build institutional knowledge

**Integration:**
```
Airtable Interface extension or sidebar with agent results
```

---

## Optimization Framework

### For Existing Agents

| Question | Method |
|----------|--------|
| What's the accuracy? | Compare agent decisions to final human decisions |
| What are the failure modes? | Analyze overridden decisions |
| Can we add confidence? | Output probability, not just binary |
| Should we add escalation? | Route low-confidence to humans |
| Can we learn from feedback? | Track corrections, retrain |

### For New Agents

| Question | Method |
|----------|--------|
| Where's the pain? | Interview reviewers, analyze bottlenecks |
| Is it deterministic? | If yes, use rules; if no, use agent |
| What's the cost of errors? | High-cost = human-in-loop required |
| Can we shadow first? | Run alongside humans before autonomous |
| How do we measure success? | Define metrics before building |

---

## Next Steps

### Immediate (This Week)
1. [ ] Get accuracy metrics for Response Classification agent
2. [ ] Identify 3-5 recent cases where it made wrong decision
3. [ ] Document the current Airtable automation logic

### Short-term (Next 2-4 Weeks)  
4. [ ] Add confidence scoring to Response Classification
5. [ ] Design Security Pre-Scan agent integration
6. [ ] Shadow mode: run Bundle Scanner on all submissions

### Medium-term (1-2 Months)
7. [ ] Implement Duplicate Detection agent
8. [ ] Build Review Consistency agent prototype
9. [ ] Create agent performance dashboard

---

---

## Frontend System Agent Opportunities

### Asset Dashboard (`packages/webflow-dashboard/`)

| Opportunity | Value | Complexity | Integration Point |
|-------------|-------|------------|-------------------|
| **Predictive Review Timeline** | High | Medium | Dashboard UI + historical data |
| **Smart Notifications** | Medium | Low | Push/email based on status patterns |
| **Submission Quality Score** | High | Medium | Pre-submission checklist |
| **Similar Asset Recommendations** | Medium | Medium | "Templates like yours took X days" |

### App Form (`wf-bl-app-form-cloud`)

| Opportunity | Value | Complexity | Integration Point |
|-------------|-------|------------|-------------------|
| **Pre-Submission Validation** | High | Low | Before webhook delivery |
| **Smart Auto-fill Enhancement** | Medium | Medium | Suggest values from similar apps |
| **Failure Classification** | Medium | Low | Categorize errors for retry strategy |
| **Duplicate Detection** | High | Medium | Compare against existing apps |

### Template Validation (`wf-template-validation-app`)

| Opportunity | Value | Complexity | Integration Point |
|-------------|-------|------------|-------------------|
| **Auto-Fix Generation** | High | High | Generate code/config fixes |
| **Pattern Learning** | High | Medium | Learn from approved templates |
| **Severity Calibration** | Medium | Medium | Which issues actually cause rejection? |
| **Review History Correlation** | High | Medium | Validation result → Review outcome |

---

## Cross-System Agent Opportunities

### Data Flow Agents

```
Template Validation → Submission → Review → Feedback → Creator Response
        ↓                ↓           ↓          ↓             ↓
   Pre-validate      Enrich      Assist    Generate    Classify
     Agent          Agent       Agent      Agent       Agent (EXISTS)
```

### Recommended Implementation Order

| Priority | Agent | System | Rationale |
|----------|-------|--------|-----------|
| P1 | **Response Classification** (optimize) | Airtable | Already exists, improve accuracy |
| P1 | **Validation→Review Correlation** | Validation + Airtable | Learn which validation issues matter |
| P2 | **Pre-Submission Quality Gate** | App Form | Catch issues before they enter system |
| P2 | **Smart Routing** | Airtable | Route to right reviewer faster |
| P3 | **Auto-Fix Suggestions** | Validation App | Help creators self-serve |
| P3 | **Predictive Timeline** | Dashboard | Improve creator experience |

---

## Questions for Joey

1. Are there other agents running (in Airtable automations) that we should document?
2. What are the top 3 pain points reviewers mention?
3. Is there appetite for adding more agents, or focus on optimizing existing?
4. What's the approval process for new automations in Airtable?
5. Should Response Classification move from Zapier to Airtable-native (Python script)?

## Questions About Frontend Systems

6. **Template Validation**: Do we track which validation issues correlate with rejection?
7. **App Form**: What % of submissions fail the webhook on first attempt?
8. **Dashboard**: What do creators ask for most that they can't currently see?
