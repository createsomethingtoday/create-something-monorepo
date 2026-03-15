# Voice Audit: Hero Section and CTAs

**Issue**: csm-h9zcu
**Status**: FAIL
**Property**: .agency
**Completed**: 2026-01-09T19:45:00Z

## Issues Found

### 1. Marketing Jargon (HIGH SEVERITY)

**Violation**: "implement AI-powered automation solutions that streamline workflows"
- "solutions" - flagged marketing jargon (voice-canon.md line 152-155)
- "streamline" - flagged marketing jargon (voice-canon.md line 152-155)
- Violates "Clarity Over Cleverness" principle

**Why it violates canon**: .agency voice requires "Business outcomes first. Philosophy as brief anchor only" (line 107-113). Marketing jargon obscures concrete value.

### 2. Vague Claims (HIGH SEVERITY)

**Violation**: "identify operational inefficiencies"
- "operational inefficiencies" - vague, not measurable
- Fails "Specificity Over Generality" principle (line 52)
- Canon example: Should be like "155 scripts → 13" (line 77)

**Why it violates canon**: .agency examples show specificity: "Production in 6 hours. $50K under budget." (line 76). Current text provides no measurable outcome.

### 3. Philosophy Placement (MEDIUM SEVERITY)

**Violation**: "remove what obscures" appears in headline
- Philosophical language should come AFTER business outcomes (line 101)
- .agency rule: Lead with "155 scripts → 13" not "Applying subtractive methodology" (line 113)

**Why it violates canon**: Philosophy must "earn its place after the metrics" (line 101). Here it leads, obscuring the business value proposition.

### 4. Engineer Test Failure (HIGH SEVERITY)

**Question**: "Would a working engineer understand this in 30 seconds?" (line 9)
- Answer: No. Jargon and vague claims require parsing
- Violates core principle: "Good writing disappears" (line 31)

## Current Version

```
Headline: "We help businesses identify operational inefficiencies and implement AI-powered automation solutions that streamline workflows and remove what obscures."

CTA: "Book a discovery call or scroll to learn more"
```

## Recommended Rewrite

```
Headline: "We automate workflows. 155 scripts became 13. $6.30 replaced $3,750."

CTA: "Book a discovery call"
```

## Rationale

**Why this transformation works**:

1. **Leads with outcomes**: Three concrete metrics immediately communicate value
   - 92% reduction (155 → 13 scripts)
   - 99.8% cost savings ($6.30 vs $3,750)
   - Measurable, verifiable, specific

2. **Uses Canon examples**: Draws directly from Kickstand and Arc for Gmail case studies
   - Already proven on the site
   - Internally consistent messaging

3. **Removes jargon**:
   - "solutions" → "We automate workflows"
   - "streamline" → implied by the metrics
   - "AI-powered" → unnecessary (the outcomes speak for themselves)

4. **Passes 30-second test**: A working engineer immediately understands:
   - What you do (automate workflows)
   - Proof it works (155 → 13, $6.30 vs $3,750)
   - How to engage (book a call)

5. **Simplifies CTA**: "or scroll to learn more" is unnecessary friction
   - Primary action is clear
   - Secondary action (scrolling) is obvious website behavior

**Alignment with voice canon**:
- ✓ Clarity Over Cleverness
- ✓ Specificity Over Generality
- ✓ Business outcomes first (line 109)
- ✓ Philosophy removed from headline (can appear later on page)

## Alternative Versions

### Option 1: Lead with single strongest metric
```
"We saved Arc $3,744. One automation replaced $3,750/month in API costs."
```

### Option 2: Lead with time savings
```
"Kickstand ran 155 deployment scripts. We reduced them to 13. Same functionality, 92% less complexity."
```

### Option 3: Lead with automation completeness
```
"100% automated A&R discovery for Viralytics. Zero manual work. Daily reports."
```

## Implementation

**Effort**: 5 minutes (copy/paste)
**Impact**: High - hero section is first impression
**Complexity**: Simple - text change only, no code changes required

**Where to change**: Homepage hero section at https://createsomething.agency/

**Test after change**:
- [ ] Run voice audit again to verify compliance
- [ ] A/B test if possible (track conversion rate on "Book a discovery call")
- [ ] Verify metrics are accurate and match case studies

## Assessment Summary

**Overall Grade**: FAIL

**Critical Issues**: 3 (marketing jargon, vague claims, philosophy placement)
**Medium Issues**: 1 (engineer test failure follows from other issues)

**Recommendation**: Immediate rewrite required. Current headline violates core .agency voice principles and fails to communicate concrete value.
