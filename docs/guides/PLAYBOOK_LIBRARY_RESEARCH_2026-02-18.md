# Playbook Library Research (2026-02-18)

This document summarizes research used to select the first 30 AI-native outcome playbooks (10 construction, 10 agency, 10 ops) that we ship in `@create-something/playbook-mcp` as structured workflows + Atlas Studio exports.

## Method

- Queried Perplexity for “highest ROI, most common workflows” per vertical.
- Prioritized workflows that are:
  - frequent (weekly/daily),
  - high-cost when delayed (schedule/cash flow/retention),
  - tool-heavy (benefit from MCP connectivity),
  - governance-friendly (clear human approval gates).

## Construction (Procore-Centered): Top 10

1. RFI Management (draft + route + track)
2. Submittal Review (extract + check + respond)
3. Change Order Processing (draft + impact + approve)
4. Daily Log Synthesis (field -> exec summary)
5. Pay App Prep (SOV + progress -> draft billing)
6. Cost Variance Alerts (budget -> early warning)
7. Schedule Risk Forecast (signals -> mitigation)
8. Long-Lead Procurement Watch (forecast + expedite)
9. Quality NCR Tracking (detect + assign + close)
10. Safety/Compliance Flagging (monitor + escalate)

**Primary sources consulted**
- Procore: AI/automation resources and product workflows.  
  - https://www.procore.com/library/ai-construction-tools  
  - https://www.procore.com/library/automation-in-construction  
  - https://www.procore.com/project-financials/workflows  
  - https://www.procore.com/assist
- Autodesk Construction: AI workflows overview.  
  - https://construction.autodesk.com/workflows/artificial-intelligence-construction/
- General construction PM AI workflows and prioritization discussions (secondary).  
  - https://www.wrike.com/blog/ai-in-construction-project-management/

## Agency (Marketing/Creative): Top 10

1. Lead Scoring + Routing (inbox -> CRM)
2. Proposal / RFP Drafter (requirements -> draft)
3. Client Reporting + Briefing (metrics -> narrative)
4. Content Production (outline -> draft -> publish)
5. Ad Creative Variants (brief -> batch -> test plan)
6. Social Calendar (plan + draft + approve)
7. CRO Testing Roadmap (insights -> hypotheses)
8. PM Autopilot (brief -> tasks)
9. Competitive Intel Brief (monitor -> summary)
10. Client Call Prep (data -> agenda -> follow-ups)

**Primary sources consulted**
- Agency tooling + reporting workflows (secondary).  
  - https://funnel.io/blog/marketing-agency-tools
- Creative production at scale (secondary).  
  - https://www.superside.com/blog/creative-marketing-services

## Ops (SMB Back-Office): Top 10

1. Inbox Triage (classify + draft + route)
2. Meeting Notes + Action Items (transcript -> tasks)
3. CRM Auto-Update (interactions -> structured records)
4. AP Invoice Processing (extract + match + approve)
5. AR Collections (rank + draft + track)
6. Support Ticket Automation (classify + suggest + escalate)
7. Knowledge Base Maintenance (cluster -> update -> publish)
8. Employee Onboarding (accounts + checklist + welcome)
9. Expense Reimbursements (extract + policy check + route)
10. Compliance Monitoring (rules + alerts + audit)

**Primary sources consulted**
- SMB AI adoption and operational automation examples (secondary).  
  - https://www.torontomu.ca/content/dam/diversity/reports/ai-in-action/artificial-intelligence-in-action-for-small-and-medium-sized-enterprises.pdf

## How This Research Maps to Our Stack

Each outcome playbook is implemented as an AI-native artifact:

- **Database tier:** `playbooks://outcomes/*` resources (machine-readable workflows + constraints + tests)
- **Automation tier:** tools to list/get/export playbooks, plus Atlas Studio BuilderState exports
- **Judgment tier:** per-playbook human oversight level and recommended policy posture (guidance)

Implementation lives in:
- `packages/playbook-mcp/src/outcome-playbooks.ts`
- `packages/playbook-mcp/src/resources.ts`
- `packages/playbook-mcp/src/tools.ts`
- `packages/playbook-mcp/src/atlas-studio.ts`

