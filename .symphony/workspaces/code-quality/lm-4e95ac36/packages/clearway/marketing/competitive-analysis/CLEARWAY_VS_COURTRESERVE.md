# CLEARWAY vs. CourtReserve: Competitive Analysis

## Executive Summary

CourtReserve is the incumbent in court booking software. They own the market but have a critical weakness: **redirect friction**. CLEARWAY attacks this wedge with embedded checkout.

---

## Side-by-Side Comparison

| Category | CourtReserve | CLEARWAY |
|----------|--------------|----------|
| **Checkout Flow** | Redirects to courtreserve.com | Embedded on facility site |
| **Branding** | Generic CourtReserve page | Facility-branded |
| **Pricing** | $150-300/month (flat) | 5% per transaction (usage-based) |
| **Setup Time** | 2-5 days (onboarding) | 10 minutes (one script tag) |
| **Drop-off Rate** | 30-40% (redirect friction) | <10% (no redirect) |
| **Payment Processing** | Built-in (their processor) | Stripe Connect (facility's account) |
| **Mobile Experience** | Separate mobile site | Responsive widget |
| **Developer Tools** | Limited API access | Full API, webhooks, embed SDK |
| **Customization** | Template-based | Fully themeable |
| **Support** | Ticket-based (slow) | Direct founder access |

---

## Where CourtReserve Wins

### 1. Feature Completeness
CourtReserve has years of head start. They have:
- Membership tiers and packages
- Recurring reservations
- Leagues and tournaments
- Instructor scheduling
- POS integration

**CLEARWAY response:** We're not competing on features (yet). We're competing on **booking experience**. Start with the core flow (book a court), nail that, then add features.

### 2. Brand Recognition
CourtReserve is the known name. Facility owners Google "court booking software" and find CourtReserve.

**CLEARWAY response:** Use The Stack as proof. Don't compete on brand, compete on **outcomes**. "The infrastructure disappears; courts get booked."

### 3. Established Customer Base
CourtReserve has hundreds of facilities. Network effects (players know how to use it).

**CLEARWAY response:** Wedge strategy—target **new facilities** and **facilities frustrated with redirect friction**. Not trying to convert happy customers.

---

## Where CLEARWAY Wins

### 1. No Redirect Friction
**CourtReserve flow:**
1. Player visits facility site
2. Clicks "Book a Court"
3. **Redirected to courtreserve.com**
4. Sees generic page (not facility branding)
5. Completes checkout
6. Confirmation (maybe redirected back)

**Drop-off:** 30-40% abandon during redirect.

**CLEARWAY flow:**
1. Player visits facility site
2. Clicks "Book a Court"
3. **Widget loads on same page**
4. Sees facility-branded experience
5. Completes checkout (Stripe in-widget)
6. Confirmation (same page)

**Drop-off:** <10% abandon (no redirect).

**Why it matters:** For every 100 people who click "Book a Court":
- CourtReserve: 60-70 complete booking
- CLEARWAY: 90+ complete booking

That's **20-30 extra bookings** per 100 clicks.

### 2. Usage-Based Pricing
**CourtReserve:** $150-300/month whether you get 10 bookings or 100.

**CLEARWAY:** 5% per transaction. Scale costs with revenue.

**Example math:**
- Facility gets 50 bookings/month at $40 each = $2,000 revenue
- CourtReserve cost: $200/month (10% of revenue)
- CLEARWAY cost: $100/month (5% of revenue)

**When CourtReserve is cheaper:** Very high volume (>100 bookings/month). At that point, flat fee beats %.

**When CLEARWAY is cheaper:** New facilities, seasonal facilities, low-volume facilities.

### 3. Setup Speed
**CourtReserve:** 2-5 days onboarding, training, configuration.

**CLEARWAY:** 10 minutes. Add script tag, done.

**Why it matters:** Lower barrier to trial. Facility can test CLEARWAY without committing to onboarding.

### 4. Developer Experience
**CourtReserve:** Limited API access. Hard to customize.

**CLEARWAY:** Full API, webhooks, embed SDK. Built for developers.

**Why it matters:** Tech-forward facilities (or facilities with in-house devs) can build custom integrations.

---

## Pricing Deep Dive

### CourtReserve Pricing Tiers

| Plan | Cost | Features |
|------|------|----------|
| **Basic** | $150/month | 1 location, basic scheduling |
| **Pro** | $250/month | Multi-location, memberships |
| **Enterprise** | $300+/month | Custom features, API access |

**Plus:**
- Payment processing fees (2.9% + 30¢ via their processor)
- Setup fee (typically $500-1000)

**Total first-year cost (Basic):**
- Setup: $500
- Monthly: $150 × 12 = $1,800
- **Total: $2,300** (plus payment processing)

### CLEARWAY Pricing

| Component | Cost |
|-----------|------|
| **Base fee** | $0/month |
| **Transaction fee** | 5% per booking |
| **Payment processing** | Stripe fees (2.9% + 30¢) |
| **Setup fee** | $0 |

**Total first-year cost (50 bookings/month at $40 each):**
- Transaction fees: 50 × $40 × 5% × 12 = $1,200
- Setup: $0
- **Total: $1,200** (plus Stripe fees)

**Break-even point:**
- CourtReserve $150/month = $1,800/year
- CLEARWAY 5% of revenue
- Break-even: $1,800 / 5% = $36,000 in bookings
- At $40/booking, that's 900 bookings/year (75/month)

**Takeaway:** Below 75 bookings/month, CLEARWAY is cheaper. Above 75, CourtReserve is cheaper.

---

## Feature Parity Roadmap

### What CLEARWAY Has Today (MVP)
- ✅ Court availability display
- ✅ Time slot selection
- ✅ Stripe checkout (in-widget)
- ✅ Reservation management
- ✅ Embeddable widget
- ✅ Mobile responsive

### What CLEARWAY Needs (Phase 2)
- ⏳ Membership tiers
- ⏳ Recurring reservations
- ⏳ Waitlist management
- ⏳ Instructor scheduling
- ⏳ League/tournament tools

### What CLEARWAY May Never Need
- ❌ POS integration (out of scope)
- ❌ Retail inventory (out of scope)
- ❌ Facility management (focus on booking only)

---

## Win/Loss Analysis

### When to Win Against CourtReserve

**Win scenarios:**
1. **New facility:** No existing system, low booking volume initially
2. **Frustrated with redirect friction:** Seeing high drop-off rates
3. **Tech-forward owner:** Comfortable with website embeds
4. **Low-volume facility:** <75 bookings/month (usage pricing saves money)
5. **Fast setup needed:** Want to go live in days, not weeks

### When to Lose Against CourtReserve

**Loss scenarios:**
1. **High-volume facility:** >100 bookings/month (flat fee becomes cheaper)
2. **Complex membership needs:** Requires tiers, packages, recurring billing
3. **League/tournament focus:** Needs scheduling tools beyond court booking
4. **Risk-averse buyer:** Prefers known brand over new solution
5. **Multi-location chain:** Needs enterprise features (CLEARWAY not there yet)

---

## Messaging Against CourtReserve

### Discovery Questions (Sales Calls)

**1. "How do players currently book courts?"**
- Listen for: CourtReserve mention, redirect complaints, drop-off issues

**2. "Do you track how many people start booking but don't complete checkout?"**
- Listen for: Drop-off metrics (if they know), frustration with abandonment

**3. "What's your monthly cost for CourtReserve?"**
- Listen for: Pain around flat fee, desire for usage-based pricing

**4. "What features do you use most in CourtReserve?"**
- Listen for: Basic scheduling (good for CLEARWAY) vs. leagues/memberships (hard to compete)

**5. "How long did CourtReserve take to set up?"**
- Listen for: Onboarding pain, training time, configuration complexity

### Positioning Statements

**Against redirect friction:**
> "CourtReserve redirects players to an external site. Every redirect costs you 30-40% of bookings. CLEARWAY keeps players on your site—no redirect, no drop-off."

**Against flat pricing:**
> "CourtReserve charges $150-300/month whether you get 10 bookings or 100. CLEARWAY is 5% per booking—you pay only when courts fill."

**Against setup complexity:**
> "CourtReserve takes 2-5 days to onboard. CLEARWAY is one script tag—10 minutes and you're live."

---

## Competitive Intel Sources

### Where to Research CourtReserve

1. **Their website:** courtreserve.com (pricing, features)
2. **Customer reviews:** Capterra, G2, Software Advice
3. **Demo requests:** Sign up for their demo (understand their sales pitch)
4. **LinkedIn:** Follow their company page, see who's joining/leaving
5. **Facility websites:** Find CourtReserve customers, analyze their booking flow

### Key Metrics to Track

- **CourtReserve customer count:** How many facilities use them?
- **Churn rate:** How many cancel each month?
- **Common complaints:** What do reviews say?
- **Pricing changes:** Are they raising prices?
- **Feature releases:** What are they building?

---

## Notes

- CourtReserve is the incumbent. Don't underestimate them.
- CLEARWAY's wedge is **redirect friction** + **usage-based pricing**. Lean into that.
- Feature parity will take time. Focus on **booking experience** first.
- Target **new facilities** and **frustrated CourtReserve customers** (not happy customers).
- The Stack is proof CLEARWAY works in production. Use that relentlessly.
