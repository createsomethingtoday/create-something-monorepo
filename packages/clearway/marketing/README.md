# CLEARWAY Marketing Collateral

## Overview

This directory contains all go-to-market (GTM) materials for CLEARWAY's DFW pickleball facility outreach campaign.

**Goal:** Acquire first external paying customer (Stripe transaction outside The Stack).

---

## Directory Structure

```
marketing/
├── README.md                          # This file
├── VALUE_PROPOSITION.md               # Core messaging, positioning
├── OUTREACH_TRACKING.md               # CRM system (Google Sheets template)
├── LANDING_PAGE_SEO.md                # SEO/AEO optimization guide
├── email-templates/
│   ├── 01-cold-outreach.md           # Initial contact email
│   ├── 02-follow-up-1.md             # Day 3 follow-up
│   ├── 03-follow-up-2-final.md       # Day 7 & Day 14 follow-ups
│   └── 04-demo-response.md           # Demo request handling
├── competitive-analysis/
│   └── CLEARWAY_VS_COURTRESERVE.md   # Competitive positioning
└── research/
    └── FACILITY_RESEARCH_TEMPLATE.md  # Lead qualification template
```

---

## Quick Start Guide

### Step 1: Read Core Docs (15 min)

1. **VALUE_PROPOSITION.md** - Understand CLEARWAY's positioning
2. **CLEARWAY_VS_COURTRESERVE.md** - Know your competitor
3. **Email template 01** - See outreach approach

### Step 2: Build Target List (1-2 hours)

1. Open **FACILITY_RESEARCH_TEMPLATE.md**
2. Google "pickleball facilities DFW"
3. Add 20-30 facilities to list
4. Qualify each (High/Medium/Low priority)

### Step 3: Find Decision Makers (2-3 hours)

1. Use Contact Discovery Methods (in research template)
2. Find owner/GM email for High Priority facilities
3. Verify emails using Hunter.io or similar

### Step 4: Set Up Tracking (30 min)

1. Copy **OUTREACH_TRACKING.md** template to Google Sheets
2. Add facilities to sheet
3. Set up columns: Facility Name, Contact, Status, Next Action, etc.

### Step 5: Start Outreach (ongoing)

1. Send 5-10 cold emails per day (personalize each)
2. Use **01-cold-outreach.md** template
3. Log in tracking sheet
4. Follow up Day 3, Day 7, Day 14 (use templates 02-03)

### Step 6: Handle Responses (as needed)

1. Engaged prospect? Use **04-demo-response.md**
2. Schedule 15-min demo call
3. Show The Stack live widget
4. Move to Trial Setup

---

## Email Campaign Flow

### Timeline

| Day | Action | Template | Status Update |
|-----|--------|----------|---------------|
| 0 | Send cold email | 01-cold-outreach.md | Prospect → Contacted |
| 3 | Follow-up #1 (if no response) | 02-follow-up-1.md | Contacted (still) |
| 7 | Follow-up #2 (if no response) | 03-follow-up-2-final.md | Contacted (still) |
| 14 | Final follow-up (if no response) | 03-follow-up-2-final.md | Contacted → Nurture |

**If response at any point:**
- Use **04-demo-response.md**
- Update status to **Engaged**
- Schedule demo call

---

## Demo Call Checklist

### Pre-Call (Day Before)

- [ ] Send calendar confirmation
- [ ] Send pre-call email (see 04-demo-response.md)
- [ ] Share The Stack live demo link
- [ ] Prepare notes: facility name, courts, current system

### During Call (15 min)

**Agenda:**
1. **Intro (2 min):** Who you are, why you built CLEARWAY
2. **Discovery (3 min):** Their pain points, current system, booking volume
3. **Demo (7 min):** Show The Stack widget, explain no-redirect flow
4. **Next Steps (3 min):** Trial setup, timeline, questions

**Key Questions:**
- How do players currently book courts?
- Do you track booking drop-off or abandonment?
- What's your monthly cost for [Current System]?
- How many bookings per month?

### Post-Call (Same Day)

- [ ] Send follow-up email (see 04-demo-response.md)
- [ ] Recap what you showed
- [ ] Outline next steps (trial setup)
- [ ] Ask for decision timeline
- [ ] Update tracking sheet (status: Demo Completed)

---

## Trial Setup Process

### If Prospect Wants to Try CLEARWAY

**Step 1: Provision Facility**
- Add facility to CLEARWAY database
- Create courts (based on their actual courts)
- Set pricing (match their current pricing)

**Step 2: Send Embed Code**
```html
<div id="clearway-widget"></div>
<script src="https://clearway.createsomething.space/embed.js"></script>
<script>
  CLEARWAY.createWidget({
    facilitySlug: 'their-facility-slug',
    container: '#clearway-widget',
    theme: 'dark'
  });
</script>
```

**Step 3: Test Booking**
- Walk through booking flow together (screen share)
- Test Stripe checkout (use test mode)
- Verify confirmation email/SMS

**Step 4: Go Live**
- Switch Stripe to live mode
- Monitor first real booking
- Check in after 1 week

---

## Objection Handling

### Common Objections & Responses

**"We're happy with CourtReserve."**
> Totally fair. Out of curiosity, do you track how many people start booking but don't complete checkout? CourtReserve's redirect flow typically sees 30-40% drop-off. CLEARWAY's in-widget checkout cuts that to <10%. If you're losing bookings to redirect friction, we should talk.

**"What if CLEARWAY goes out of business?"**
> Great question. You own your data (Stripe Connect = your account). If CLEARWAY disappeared tomorrow, you'd still have your booking history and customer payments. Plus, the widget is just a script tag—you can remove it anytime.

**"How do I know The Stack isn't a fake case study?"**
> Try it yourself: [clearway.createsomething.space](https://clearway.createsomething.space). That's the actual production widget The Stack uses. Book a court (test mode) and see the flow. Or call The Stack directly—they'll confirm they use CLEARWAY.

**"We need memberships/leagues/tournaments."**
> CLEARWAY Phase 1 focuses on court booking (the core flow). If you need membership tiers or league scheduling, we can discuss custom dev or wait for Phase 2 (Q2 2025). What's your priority: better booking experience now or advanced features later?

**"5% per booking is expensive."**
> Let's do the math. If you get 50 bookings/month at $40 each, that's $2,000 revenue. CLEARWAY fee: $100 (5%). CourtReserve charges $150-300/month flat. So CLEARWAY saves you $50-200/month at that volume. Only if you're doing 100+ bookings/month does flat fee become cheaper.

---

## Success Metrics

### Phase 1 Goals (First 30 Days)

| Metric | Target | Current |
|--------|--------|---------|
| **Facilities contacted** | 50 | 0 |
| **Response rate** | >30% | 0% |
| **Demos scheduled** | 10 | 0 |
| **Trials started** | 5 | 0 |
| **Closed won** | 1 | 0 |

### North Star Metric

**First external Stripe transaction outside The Stack.**

---

## Resources

### External Links

- **The Stack live demo:** [clearway.createsomething.space](https://clearway.createsomething.space)
- **CourtReserve website:** [courtreserve.com](https://courtreserve.com)
- **Stripe Connect docs:** [stripe.com/docs/connect](https://stripe.com/docs/connect)

### Tools

- **Email finder:** Hunter.io, Apollo.io
- **CRM:** Google Sheets (use OUTREACH_TRACKING.md template)
- **Calendar:** Calendly or Cal.com (for demo bookings)
- **Screen recording:** Loom (for async demos)

---

## Notes

- **Personalize every email:** Mention specific detail (court count, location, current system)
- **Proof point:** The Stack is your strongest asset—use it relentlessly
- **Track everything:** Stale data = missed opportunities
- **Follow up:** 80% of deals happen after 5+ touches
- **Iterate:** Update templates based on what works
