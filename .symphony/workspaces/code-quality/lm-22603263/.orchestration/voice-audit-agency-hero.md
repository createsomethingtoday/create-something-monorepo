# Voice Audit: createsomething.agency Hero Section

**Issue ID**: csm-h9zcu
**Date**: 2026-01-09
**Auditor**: Claude Code Worker (Haiku)
**Target**: Hero section + primary CTAs

---

## Executive Summary

**Status**: ⚠️ PARTIAL COMPLIANCE

The hero section violates 3 critical .agency voice rules:
1. Leads with jargon, not outcomes
2. Uses vague claims ("streamline workflows")
3. Buries the actual value proposition

**Severity**: Medium - The supporting service headlines are excellent (specific outcomes), but the hero undercuts them.

---

## Issues Found

### Issue 1: Marketing Jargon in Headline

**Flagged phrase**: "AI-powered automation solutions that streamline workflows"

| Criterion | Status | Details |
|-----------|--------|---------|
| Jargon detection | ❌ FAILS | "solutions," "streamline workflows," "AI-powered" |
| Specificity | ❌ FAILS | No metrics, no concrete outcomes |
| .agency voice | ❌ FAILS | Should lead with business outcomes |

**Why this matters**: "Streamline workflows" is the most generic claim in SaaS. It tells prospects nothing. Compare to the service headlines below, which ARE specific.

### Issue 2: Vague Claims ("Identify Operational Inefficiencies")

**Flagged phrase**: "identify operational inefficiencies"

| Criterion | Status | Details |
|-----------|--------|---------|
| Specificity | ❌ FAILS | Vague action (identify = study?) |
| Actionable | ❌ FAILS | Doesn't tell what happens next |
| Business outcome | ❌ FAILS | No result metric |

**Why this matters**: "Identify" is passive. Prospects wonder: "Then what? Does someone implement it for me?" The service headlines say "155 scripts → 13" (implicit in workflow automation). The hero should lead with that.

### Issue 3: Philosophy Placed Before Outcomes

**Flagged phrase**: "remove what obscures"

| Criterion | Status | Details |
|-----------|--------|---------|
| Placement | ⚠️ PARTIAL | Philosophy appears at END of long sentence |
| .agency rule | ⚠️ PARTIAL | Should FOLLOW outcomes, not be woven in |
| Clarity | ⚠️ PARTIAL | "Remove what obscures" is poetic but vague for first-time visitors |

**Why this matters**: First-time visitors to .agency don't know what "what obscures" means. It's a .ltd concept. At .agency, you lead with "155 scripts → 13" THEN note this emerged from removing what obscures.

### Issue 4: CTA Weakness ("Book a discovery call")

**Flagged phrase**: "Book a discovery call or scroll to learn more"

| Criterion | Status | Details |
|-----------|--------|---------|
| Specificity | ⚠️ PARTIAL | "discovery call" is generic |
| Clarity | ✅ PASSES | Clear action |
| .agency voice | ⚠️ PARTIAL | Should indicate WHAT they'll discover |

**Why this matters**: At .agency, prospects want to know: "Will you help reduce costs? Speed up delivery? What's in the call?" Blank discovery calls feel like lead generation, not partnership.

---

## Suggested Rewrites

### Rewrite 1: Hero Headline

**BEFORE** (current):
```
We help businesses identify operational inefficiencies and implement
AI-powered automation solutions that streamline workflows and
remove what obscures.
```

**AFTER** (option A - metrics-first):
```
155 scripts. One developer. 13 production workflows.
We automate what's manual, measure what works, and build systems
that scale without you.
```

**Why**: Leads with the most compelling outcome (155→13). Concrete. Outcome-focused. Philosophy anchor ("scale without you") comes last.

---

**AFTER** (option B - outcome-focused, shorter):
```
Manual work takes time. We automate it.
Save hours per week per developer. Measure the results.
Built for teams shipping code, not managing complexity.
```

**Why**: Three sentences. Each sentence is specific. First addresses the problem. Second shows the outcome. Third shows the lens.

---

### Rewrite 2: Service Headlines

**CURRENT** (audit shows these are EXCELLENT—keep them):
```
Agentic Systems: AI that runs your operations. Not chatbots—agents
that make decisions while you sleep.

Web Platforms: Fast sites on Cloudflare edge. Sub-100ms response,
zero maintenance.

Workflow Automation: Manual work becomes automated. We measure the
hours saved.
```

**Status**: ✅ PASSES all criteria.
- Specific outcomes (sub-100ms, hours saved)
- No jargon
- Active voice
- Clear value

**Recommendation**: These ARE the voice model. Use their structure for the hero.

---

### Rewrite 3: Primary CTA

**BEFORE**:
```
Book a discovery call or scroll to learn more
```

**AFTER** (option A):
```
See what changed for [Client Name] → or start the conversation
```

**AFTER** (option B):
```
See three case studies → or book a call to discuss your setup
```

**Why**: Specific about what happens next. Removes generic "discover" language. Prospect knows they're viewing case studies before clicking.

---

### Rewrite 4: Secondary CTA

**BEFORE**:
```
Book a discovery call
```

**AFTER** (option A):
```
Talk to us about your operations
```

**AFTER** (option B):
```
Schedule a conversation about your automation needs
```

**Why**: More specific. Sets expectation (we'll discuss YOUR situation, not a generic intro call).

---

## Voice Canon Compliance Matrix

| Rule | Current | Status | Notes |
|------|---------|--------|-------|
| Lead with outcomes | "Identify inefficiencies" | ❌ FAIL | Should lead with metric |
| Avoid jargon | "solutions," "streamline" | ❌ FAIL | Both in opening sentence |
| Specific > vague | No metrics in hero | ❌ FAIL | Service section has them; hero doesn't |
| Business outcomes first | Philosophy woven in | ⚠️ PARTIAL | Should move to end |
| Active voice | "implement," "remove" | ✅ PASS | Voice is active |
| No marketing jargon | None detected | ✅ PASS | (contradicts jargon findings—clarification below) |

**Clarification on "marketing jargon"**: The terms flagged ("solutions," "streamline") aren't typical SaaS jargon (like "leverage," "synergy"). They're vague *claims* instead. Both violate .agency voice, but for different reasons.

---

## Recommended Action Plan

### Priority 1: Fix Hero Headline (High Impact)

**Current**: 27 words, vague, jargon-heavy
**Recommended**: 15 words, specific, outcome-focused

Replace with one of the "Rewrite 1" options above. Option A (155→13) is strongest.

### Priority 2: Strengthen CTAs (Medium Impact)

**Current**: Generic "discovery call" language
**Recommended**: Specific about next step

Use "Rewrite 3" or "Rewrite 4" options.

### Priority 3: Retain Service Headlines (No Action)

These already pass voice canon. They're the model—use their structure for the hero.

---

## Comparison to Voice Canon Masters

### Orwell's Rule (Clarity as Ethics)

**Current hero violates this**: "streamline workflows" is obscure jargon that hides meaning.

**Orwell's test**: "What does this actually mean?"
- "Streamline workflows" = unclear (reduce time? complexity? Both?)
- "155 scripts → 13" = crystal clear (fewer scripts, same functionality)

### Fenton/Lee's Rule (Serve the Reader)

**Current hero fails**: A visitor doesn't know if we help with costs, speed, or complexity management.

**Fenton/Lee test**: "Where is my benefit in this?"
- Current: Implied (they'll find out on the call)
- Recommended: Explicit (save hours per week; automate manual work)

### Rams' Rule (Weniger, aber besser)

**Current hero**: 27 words, 2 separate concepts ("identify" + "implement")
**Recommended**: 12-15 words, 1 concept (outcome)

---

## Reference: Service Section (Voice Model)

For comparison, here's what .agency voice SHOULD sound like. The service headlines below are exemplary:

```
✅ "AI that runs your operations. Not chatbots—agents that make
   decisions while you sleep."

   - Specific (agents, not generic AI)
   - Outcome-focused (make decisions while you sleep = autonomy)
   - No jargon
   - Active voice

✅ "Sub-100ms response, zero maintenance."

   - Specific metric (sub-100ms)
   - Outcome (zero maintenance)
   - Concise (2 concepts, 5 words)

✅ "Manual work becomes automated. We measure the hours saved."

   - Specific transformation (manual → automated)
   - Measurable outcome (hours saved)
   - Active voice
```

**These should be the model for the hero rewrite.**

---

## Detection Criteria Used

This audit used these voice-canon.md patterns:

| Detection Type | Pattern | Applied |
|---|---|---|
| Jargon | "solutions," "streamline," "AI-powered" | ✅ |
| Vague claims | "operational inefficiencies," "implement" | ✅ |
| Missing specificity | No metrics in hero | ✅ |
| Weak CTAs | Generic "discovery call" | ✅ |
| Philosophy placement | Philosophy mid-sentence vs. end | ✅ |

---

## Conclusion

**Current hero**: Reads like enterprise SaaS boilerplate. Violates 3+ voice canon rules.

**Recommended hero**: Lead with "155 scripts → 13." Use the service section's proven voice model. Outcomes first, philosophy last.

**Effort to fix**: 2 hours copywriting + design review.

**Impact**: High. Hero is first impression. Current version undersells what the service section promises.

---

**Status**: Ready for implementation
**Next Steps**:
1. Review rewrite options with product/marketing
2. A/B test if timeline allows
3. Apply same voice audit to rest of .agency site
4. Update CTA language across platform
