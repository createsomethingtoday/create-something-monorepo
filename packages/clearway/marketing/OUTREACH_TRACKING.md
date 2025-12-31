# Outreach Tracking System

## Overview

Track every facility contact from cold outreach to closed deal. Use this as a simple CRM.

---

## Tracking Spreadsheet Template

### Column Headers

| Column | Purpose | Values |
|--------|---------|--------|
| **Facility Name** | Facility identifier | Text |
| **Location** | City, State | Text |
| **Contact Name** | Decision maker | Text |
| **Contact Email** | Primary email | Email |
| **Contact Phone** | Phone number | Phone |
| **Status** | Current stage | See statuses below |
| **Priority** | Lead quality | High / Medium / Low |
| **Current System** | Existing booking software | CourtReserve / Manual / Other |
| **Courts** | Number of courts | Number |
| **Date Added** | When facility entered pipeline | Date |
| **Last Contact** | Most recent touchpoint | Date |
| **Next Action** | What's next | Text |
| **Next Action Date** | When to do it | Date |
| **Notes** | Context, insights, follow-up details | Text |

---

## Status Definitions

### Lead Stages (Sales Pipeline)

| Status | Definition | Next Action |
|--------|------------|-------------|
| **Prospect** | Identified but not contacted | Research, find contact info |
| **Contacted** | Initial email/call sent | Wait for response (3 days) |
| **Engaged** | Replied to outreach | Schedule demo call |
| **Demo Scheduled** | Call on calendar | Prepare demo, send pre-call email |
| **Demo Completed** | Showed CLEARWAY | Send follow-up with next steps |
| **Trial Setup** | Widget installed on their site | Monitor usage, check for questions |
| **Negotiating** | Discussing terms, pricing, contract | Address objections, close deal |
| **Closed Won** | Paying customer | Onboard, ensure success |
| **Closed Lost** | Not moving forward | Note reason, move to Nurture |
| **Nurture** | Not now, but maybe later | Quarterly check-in |

---

## Next Action Examples

### By Status

| Status | Common Next Actions |
|--------|---------------------|
| **Prospect** | "Find decision maker email" |
| **Contacted** | "Follow up if no response by [date]" |
| **Engaged** | "Send demo calendar link" |
| **Demo Scheduled** | "Send pre-call email with live demo link" |
| **Demo Completed** | "Send post-demo summary and next steps" |
| **Trial Setup** | "Check in after 1 week of usage" |
| **Negotiating** | "Address pricing objection" |
| **Closed Won** | "Onboard: Stripe Connect setup" |
| **Closed Lost** | "Move to Nurture, check in Q2 2025" |
| **Nurture** | "Quarterly email with product updates" |

---

## Sample Tracking Data

### Example Row

| Facility Name | Location | Contact Name | Contact Email | Status | Priority | Current System | Courts | Date Added | Last Contact | Next Action | Next Action Date | Notes |
|---------------|----------|--------------|---------------|--------|----------|----------------|--------|------------|--------------|-------------|------------------|-------|
| Pickle & Social | Fort Worth, TX | John Smith | john@pickleandsocial.com | Demo Scheduled | High | CourtReserve | 6 | 2025-01-01 | 2025-01-03 | Send pre-call email | 2025-01-06 | Frustrated with redirect drop-off. Mentioned seeing 40% abandon rate. Demo scheduled for 1/7 at 2pm. |

---

## Usage Instructions

### Daily Workflow

**Morning:**
1. Check "Next Action Date" for today
2. Complete actions (send emails, make calls, etc.)
3. Update "Last Contact" and "Status"
4. Set new "Next Action" and "Next Action Date"

**Evening:**
1. Log any new leads discovered
2. Update statuses for responses received
3. Plan tomorrow's actions

### Weekly Review (Every Friday)

1. **Review pipeline:**
   - How many in each status?
   - Any leads stuck (no movement in 7+ days)?
2. **Update priorities:**
   - Bump engaged leads to High
   - Downgrade unresponsive leads to Low
3. **Clean up:**
   - Move "Closed Lost" to Nurture (with reason in Notes)
   - Archive old Nurture leads (>6 months)

---

## Key Metrics to Track

### Pipeline Health

| Metric | Formula | Target |
|--------|---------|--------|
| **Total Leads** | Count all rows | 50+ (DFW area) |
| **Contacted %** | (Contacted + Engaged + later stages) / Total | >60% |
| **Response Rate** | Engaged / Contacted | >30% |
| **Demo Conversion** | Demo Scheduled / Engaged | >50% |
| **Trial Conversion** | Trial Setup / Demo Completed | >40% |
| **Close Rate** | Closed Won / Trial Setup | >60% |

### Time Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| **Time to Response** | Date contacted → Engaged | <3 days |
| **Time to Demo** | Engaged → Demo Scheduled | <5 days |
| **Time to Trial** | Demo Completed → Trial Setup | <7 days |
| **Time to Close** | Trial Setup → Closed Won | <14 days |

---

## Email Tracking Notes

### Log Every Touchpoint

For each email sent, note in "Notes" column:
- **Date sent**
- **Email template used** (e.g., "Cold Outreach #1")
- **Personalization details** (what you customized)
- **Response received?** Yes/No
- **Response summary** (if yes)

**Example:**
> 2025-01-01: Sent Cold Outreach #1. Personalized with "I saw you have 6 courts". No response yet.
> 2025-01-04: Sent Follow-Up #1. Mentioned redirect friction. Response received: "Interested, let's talk."

---

## Google Sheets Template Structure

### Sheet 1: Active Pipeline

Use column headers above. Filter by:
- **Status ≠ Closed Lost** AND **Status ≠ Nurture**

Sort by:
- **Next Action Date** (ascending) - see what's due today

### Sheet 2: Closed Lost

Archive "Closed Lost" leads here with:
- All original data
- **Lost Reason** column (Not interested / Budget / Timing / Competitor / Other)
- **Lost Date** column

Sort by:
- **Lost Date** (descending) - recent losses first

### Sheet 3: Metrics Dashboard

Track weekly:
- Total leads
- Leads by status (count)
- Response rate (%)
- Demo conversion (%)
- Close rate (%)

---

## Automation Ideas (Future)

### If using Zapier / Make / n8n:

1. **Auto-add to sheet:** New contact form submission → Add row to sheet
2. **Reminder emails:** Next Action Date = Today → Send reminder email
3. **Status updates:** Demo calendar event completed → Update status to "Demo Completed"
4. **Nurture drip:** Closed Lost + 90 days → Send quarterly update email

---

## Sample Tracking Workflow

### Scenario: New Lead Discovery

**Day 1:**
1. Discover "Pickle & Social" facility
2. Add to sheet:
   - Status: Prospect
   - Priority: Medium
   - Next Action: "Find decision maker email"
   - Next Action Date: Tomorrow

**Day 2:**
1. Research LinkedIn, find owner: John Smith
2. Update row:
   - Contact Name: John Smith
   - Contact Email: john@pickleandsocial.com
   - Status: Prospect (still)
   - Next Action: "Send Cold Outreach #1"
   - Next Action Date: Today

**Day 2 (later):**
1. Send cold email using template
2. Update row:
   - Status: Contacted
   - Last Contact: Today
   - Next Action: "Follow up if no response"
   - Next Action Date: 3 days from today
   - Notes: "Sent Cold Outreach #1. Mentioned 6 courts."

**Day 4:**
1. No response yet, send Follow-Up #1
2. Update row:
   - Last Contact: Today
   - Next Action: "Follow up if no response"
   - Next Action Date: 4 days from today
   - Notes: "Sent Follow-Up #1. Highlighted redirect friction."

**Day 5:**
1. Response received: "Interested, let's talk"
2. Update row:
   - Status: Engaged
   - Priority: High (bump from Medium)
   - Last Contact: Today
   - Next Action: "Send demo calendar link"
   - Next Action Date: Today
   - Notes: "Response: Interested. Frustrated with 40% drop-off."

**Day 5 (later):**
1. Send demo calendar link
2. Update row:
   - Next Action: "Wait for demo booking"
   - Next Action Date: 2 days from today

**Day 6:**
1. Demo booked for 1/7 at 2pm
2. Update row:
   - Status: Demo Scheduled
   - Next Action: "Send pre-call email"
   - Next Action Date: 1/6 (day before demo)
   - Notes: "Demo scheduled 1/7 at 2pm."

*...continue tracking through demo, trial, close...*

---

## Notes

- **Keep it simple:** Don't over-engineer. A Google Sheet is enough for Phase 1.
- **Update daily:** Stale data = missed opportunities.
- **Review weekly:** Pipeline health check every Friday.
- **Automate later:** Manual tracking first, automation when volume demands it.
- **Notes are gold:** Capture context. Future you will thank you.
