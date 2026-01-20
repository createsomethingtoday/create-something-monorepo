# Webflow Marketplace System Context

**Last Updated:** 2026-01-19  
**Author:** Micah Johnson (System Architect, Marketplace Team)

---

## Team & Expertise

### Micah Johnson (System Architect)
- Frontend systems (Asset Dashboard, App Form, Template Validation)
- Cloudflare Workers, SvelteKit, Designer Extensions
- Agent SDK, IC MVP → Code Components pipeline

### Joey Best-James (Airtable Specialist)
- Airtable system design and automations
- Built Partner/Experts matching system with algorithmic matching
- Experience with versioned algorithms in Airtable (currently v7 with 17 variables)
- Deep expertise in Airtable scripting and automation patterns

---

## System Architect Scope

As System Architect on the Marketplace Team, you own/maintain:

| System | Location | Tech Stack | Purpose |
|--------|----------|------------|---------|
| **Asset Dashboard** | `packages/webflow-dashboard/` | SvelteKit + Cloudflare | Creator view of assets & review progress |
| **App Form** | `wf-bl-app-form-cloud` (external) | Next.js + Vercel | App submission form with retry system |
| **Template Validation** | `wf-template-validation-app` (external) | Designer Extension + CF Worker | Pre-submission validation |
| **Agentic Layer** | This spec directory | Various | AI-native automation (in exploration) |

### Related Systems (Joey)

| System | Purpose | Relevance |
|--------|---------|-----------|
| **Partner/Experts Matching** | Match partners with users via algorithm | Similar patterns to Marketplace routing |
| **Algorithms Table** | Version-controlled matching logic | Pattern for agent versioning |

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        WEBFLOW MARKETPLACE SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ASSET SUBMISSION                                                                   │
│  ────────────────                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                          │
│  │  Web Forms   │───▶│   Airtable   │◀───│  Automations │                          │
│  │  (Creators)  │    │  (Database)  │    │  (Triggers)  │                          │
│  └──────────────┘    └──────────────┘    └──────────────┘                          │
│                             │                    │                                  │
│                             ▼                    ▼                                  │
│  REVIEW PROCESS       ┌──────────────┐    ┌──────────────┐                          │
│  ──────────────       │  Airtable    │    │   Zendesk    │                          │
│                       │  Interface   │───▶│   Tickets    │                          │
│                       │  (Reviewers) │    │  (Feedback)  │                          │
│                       └──────────────┘    └──────────────┘                          │
│                                                                                     │
│  CREATOR VISIBILITY                                                                 │
│  ──────────────────                                                                 │
│  ┌──────────────────────────────────────┐                                          │
│  │         Asset Dashboard              │                                          │
│  │  (SvelteKit + Cloudflare Workers)    │                                          │
│  │  - View assets & review progress     │                                          │
│  │  - Recently refactored               │                                          │
│  └──────────────────────────────────────┘                                          │
│                                                                                     │
│  IC/DE APP PIPELINE (NEW)                                                          │
│  ────────────────────────                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  AI Studio   │───▶│  MVP Build   │───▶│  Internal    │───▶│  External    │      │
│  │  (or Cursor) │    │  (React/etc) │    │  Code Comp   │    │  Marketplace │      │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Asset Submission Layer

**Entry Points:**
- Web forms for different asset types
- Creators submit to Airtable database

**Database:** Airtable
- Central source of truth for assets
- Tracks submission status, metadata, versions

### 2. Review Process

**Interface:** Airtable Interface
- Reviewers access base via custom interface
- Complete reviews with structured feedback

**Automations:** Airtable Automations
- Trigger on status changes
- Push review feedback to Zendesk tickets
- Notify creators of updates

**Integration:** Zendesk
- Review feedback becomes support tickets
- Enables creator communication

### 3. Asset Dashboard

**Tech Stack:** SvelteKit + Cloudflare
- Recently refactored from previous stack
- Template creators see their assets
- Track review progress
- Related: `packages/webflow-dashboard/`

**Reference:** `papers/published/webflow-dashboard-refactor.md`

### 4. IC/DE App Pipeline

**Status:** Exploratory (Joey + Micah collaboration on AI-native architecture)

**Validated Experiment:** IC MVP → Webflow Code Components

**Flow:**
1. DE builds MVP in AI Studio/Cursor/Claude Code
2. Agentic translation to Webflow Code Component
3. Internal deployment (shadow/canary)
4. External availability (Marketplace)

**First Success:** Bundle Scanner
- Security scanner for app submissions
- 18 regex-based rules + Gemini AI analysis
- Translated in 3.5 hours with 95%+ fidelity
- Currently being improved by DE for internal needs

**AI Studio Integration (Planned):**
- Not yet integrated into the system
- Goal: Allow DEs to create apps that flow from internal → external use
- This is the "AI native" direction being explored

**Reference:** `docs/internal/EXPERIMENT_04_IC_MVP_PIPELINE.md`

---

## Agentic Architecture Opportunities

Based on this system context, here are the integration points for agents:

### High-Value Targets

| Process | Current State | Agentic Opportunity |
|---------|--------------|---------------------|
| **Asset Review** | Manual via Airtable Interface | Agent pre-screening, risk scoring |
| **Bundle Scanning** | Rule-based + manual AI analysis | Automated security agent |
| **Zendesk Feedback** | Template-based responses | Contextual feedback generation |
| **Dashboard Insights** | Static display | Predictive review timeline |
| **IC MVP Translation** | Agent-assisted (validated) | Fully automated pipeline |

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                      PROPOSED AGENTIC LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         AGENT ORCHESTRATOR                                   │   │
│  │  - Routes tasks to appropriate agent                                        │   │
│  │  - Manages token budgets                                                    │   │
│  │  - Enforces guardrails                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│         │              │              │              │                              │
│         ▼              ▼              ▼              ▼                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐                        │
│  │ Security  │  │  Design   │  │  Feedback │  │  MVP      │                        │
│  │  Agent    │  │  Agent    │  │  Agent    │  │ Translator│                        │
│  │           │  │           │  │           │  │           │                        │
│  │ - Bundle  │  │ - Visual  │  │ - Zendesk │  │ - Code    │                        │
│  │   scan    │  │   review  │  │   drafts  │  │   analysis│                        │
│  │ - Rule    │  │ - Style   │  │ - Creator │  │ - Props   │                        │
│  │   check   │  │   check   │  │   comms   │  │   expose  │                        │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘                        │
│         │              │              │              │                              │
│         └──────────────┴──────────────┴──────────────┘                              │
│                                    │                                                │
│                                    ▼                                                │
│                        ┌─────────────────────────┐                                  │
│                        │   HUMAN REVIEW QUEUE    │                                  │
│                        │   (Confidence < 95%)    │                                  │
│                        └─────────────────────────┘                                  │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Questions for Clarification

### Review Process
1. **Volume:** How many asset submissions per week/month?
2. **Review Time:** Average time from submission to approval/rejection?
3. **Rejection Rate:** What % of submissions are rejected? Common reasons?
4. **Reviewer Count:** How many reviewers handle the queue?

### Airtable Integration
5. **API Access:** Do we have Airtable API access for agent integration?
6. **Automation Limits:** Are there rate limits or constraints on automations?
7. **Custom Fields:** What fields track review status/feedback?

### Bundle Scanner
8. **Current Usage:** Is the Bundle Scanner actively used by reviewers?
9. **False Positive Rate:** How often do rule-based checks flag incorrectly?
10. **AI Analysis:** How often is Gemini analysis used vs skipped?

### Dashboard
11. **User Auth:** How do creators authenticate to the dashboard?
12. **Real-time:** Does the dashboard need real-time updates or polling is OK?
13. **Metrics:** What metrics do creators most want to see?

---

---

## Frontend Systems Detail

### 1. Asset Dashboard

**Location:** `packages/webflow-dashboard/`  
**Stack:** SvelteKit + Cloudflare Workers  
**Purpose:** Template creators view their assets and review progress

**Key Features:**
- Asset listing with status tracking
- Review progress visibility
- Analytics and insights
- Version history

**Agent Opportunities:**
| Opportunity | Description |
|-------------|-------------|
| **Predictive Timeline** | Estimate review completion based on queue position + historical data |
| **Smart Notifications** | Alert creators when action needed vs informational updates |
| **Submission Quality Score** | Pre-submission checklist with AI recommendations |

---

### 2. App Form (App Submissions)

**Location:** `/Users/micahjohnson/Documents/Github/Webflow/wf-bl-app-form-cloud`  
**Stack:** Next.js + Vercel + Postgres + Blob Storage  
**Purpose:** Handle marketplace app submissions with reliability

**Architecture:**
```
User → Form → Vercel Postgres → Blob Storage → Webhook → Airtable
                    ↓
         Auto-retry (15 min, max 3 attempts)
                    ↓
         Blob cleanup (24h after success)
```

**Current Automation:**
- Automatic retry on webhook failure (3 attempts)
- Blob cleanup cron (every 6 hours)
- Client ID verification
- Auto-fill for updates

**Agent Opportunities:**
| Opportunity | Description |
|-------------|-------------|
| **Submission Quality Gate** | Validate app submission data before Airtable delivery |
| **Smart Auto-fill** | Suggest field values based on similar apps |
| **Error Classification** | Categorize failures for better retry strategies |

---

### 3. Template Validation App (Designer Extension)

**Location:** `/Users/micahjohnson/Documents/Github/Webflow/wf-template-validation-app`  
**Stack:** Designer Extension + Cloudflare Worker  
**Purpose:** Validate templates against "Webflow Way" before submission

**Architecture:**
```
Designer Extension → Collect Data → Cloudflare Worker → Validators → Results
                                          ↓
                              Batched for 50-subrequest limit
```

**Validation Categories:**
| Category | Validator | Checks |
|----------|-----------|--------|
| Variables | designer-validator | Naming, mode coverage, type consistency |
| Components | designer-validator | Naming, nesting depth, instance counts |
| Styles | designer-validator | Class naming, unused styles, tag overrides |
| Pages | designer-validator | SEO, slug format, home page |
| Assets | asset-validator | Size (150KB), format, alt text |
| Content | content-validator | Lorem ipsum, heading hierarchy |
| Accessibility | accessibility-validator | Alt text, contrast, form labels |

**Agent Opportunities:**
| Opportunity | Description |
|-------------|-------------|
| **Auto-Fix Suggestions** | Generate specific fixes for validation failures |
| **Similar Template Analysis** | Compare against approved templates for patterns |
| **Severity Calibration** | Learn which issues actually cause rejection |

---

## Related Files

- `packages/webflow-dashboard/` - Asset Dashboard (SvelteKit)
- `packages/bundle-scanner/` - Security Scanner Code Component
- `packages/bundle-scanner-core/` - Scanner logic library
- `docs/internal/EXPERIMENT_04_IC_MVP_PIPELINE.md` - IC MVP translation experiment
- `papers/published/webflow-dashboard-refactor.md` - Dashboard refactor paper

### External Repos (System Architect owned)
- `/Users/micahjohnson/Documents/Github/Webflow/wf-bl-app-form-cloud` - App Form
- `/Users/micahjohnson/Documents/Github/Webflow/wf-template-validation-app` - Template Validation
