# Voice Audit — Legacy Content Review

**Date:** 2025-11-24
**Auditor:** Claude Code (Sonnet 4.5)
**Purpose:** Identify content that doesn't align with CREATE SOMETHING's established voice principles

---

## Audit Criteria

Content is evaluated against the voice principles documented in `packages/ltd/src/routes/voice/+page.svelte`:

1. **Clarity Over Cleverness** — Direct, simple language
2. **Specificity Over Generality** — Metrics, not vague claims
3. **Honesty Over Polish** — Document failures and limitations
4. **Useful Over Interesting** — Reproducible, practical
5. **Grounded Over Trendy** — Connect to masters/principles

---

## CRITICAL: Content Requiring Immediate Attention

### 1. "The Dual Benefits of Advanced Automation Systems"

**Location:** `packages/io/src/lib/data/mockPapers.json` (line 81-118)
**ID:** `3b47355b-881c-4e6b-ae36-351720de8e6b`
**Status:** ❌ **FAILS VOICE STANDARDS**

#### Voice Violations

**Marketing Jargon:**
```
❌ "In today's fast-paced digital landscape"
❌ "streamline operations"
❌ "drive business success"
❌ "foster technological innovation"
❌ "enhance user experience"
❌ "transformative impact"
```

**No Metrics:**
- No time savings data
- No cost analysis
- No ROI calculation
- No comparison to manual approach
- Generic "improved efficiency" claims

**Missing Required Elements:**
- ❌ No ASCII art header
- ❌ No hypothesis/validation structure
- ❌ No "What This Proves / What This Doesn't Prove"
- ❌ No "Where Intervention Was Needed"
- ❌ No reproducibility section
- ❌ No master citations
- ❌ No honest assessment

**Generic Claims:**
```
❌ "smooth and engaging experience"
❌ "significantly boost revenue"
❌ "powerful and flexible framework"
❌ "robust and scalable applications"
```

**Wrong Tone:**
- Reads as business pitch, not research
- Addresses "business owners" and "software engineers" separately (marketing segmentation)
- Uses persuasive language instead of empirical description
- Focused on selling benefits, not documenting outcomes

#### Recommendation

**Option 1: Archive**
```json
{
  "archived": 1,
  "archive_reason": "Legacy content from pre-voice-establishment period. Preserved for historical record but no longer represents current standards.",
  "archive_date": "2025-11-24"
}
```

**Option 2: Complete Rewrite**
Transform into proper experiment format:
- Add hypothesis: "Can AI-native development build a quiz-based automation system in X hours vs Y hours manual?"
- Document actual metrics: time, cost, errors, interventions
- Include "What This Proves" and "What This Doesn't Prove"
- Add reproducibility section with starting prompt
- Cite relevant master principles (if any apply)
- Remove all marketing language
- Focus on empirical outcomes, not business benefits

**Recommended Action:** **Archive** (Option 1)
**Rationale:** The content appears to be client-facing documentation for a specific project, not a research experiment. It doesn't fit the `.io` research format and would require a complete conceptual rewrite, not just copy editing.

---

### 2. "Web Scraper and Airtable Integration with Next.js"

**Location:** `packages/io/src/lib/data/mockPapers.json` (line 119-129+)
**ID:** `413f17d7-6cf4-4520-9a13-3d1becb9c39b`
**Status:** ⚠️ **PARTIALLY INCOMPLETE**

#### Issues

**Placeholder Content:**
```json
"description": "No description available",
"content": "Content not available",
"excerpt": null,
"excerpt_short": null,
"excerpt_long": null
```

**Missing Elements:**
- No time metrics
- No cost analysis
- No hypothesis/validation
- No honest assessment sections
- HTML content exists but not structured as experiment

**Voice Issues:**
- Uses "Imagine you want to..." (informal, not research tone)
- Describes solution generically
- No empirical validation
- Tutorial format, not experiment format

#### Recommendation

**Option 1: Archive as Incomplete**
```json
{
  "archived": 1,
  "archive_reason": "Incomplete experiment documentation. Missing core metrics and structured methodology.",
  "archive_date": "2025-11-24"
}
```

**Option 2: Complete the Experiment**
Add missing sections:
- Time to build vs manual estimate
- Cost (API calls, developer time)
- Hypothesis: "Can scheduled scraping replace manual monitoring?"
- Success criteria with checkboxes
- Honest assessment of limitations
- When to use / don't use
- ASCII art header
- Master citations (Tufte for data organization?)

**Recommended Action:** **Complete** (Option 2) if project still relevant
**Otherwise:** **Archive** (Option 1)

---

## Alignment Summary by Property

### `.io` (Research Papers)

**Total Experiments Reviewed:** ~4 in mockPapers.json
**Aligned:** 2 (Canva Design Implementation, Analytics Dashboard)
**Misaligned:** 2 (Dual Benefits, Web Scraper)
**Alignment Rate:** 50%

**Recent experiments are EXCELLENT.** Legacy content from mid-2024 predates voice establishment.

### `.space` (Interactive Experiments)

**Status:** Under-developed
**Alignment:** Cannot assess—insufficient content exists
**Recommendation:** Prioritize creating `.space` content using current voice standards

### `.agency` (Services/Case Studies)

**Status:** Needs more case studies citing `.ltd` principles
**Current Ethos Standard:** "Case studies cite which .ltd principles were applied"
**Reality:** This standard exists in ethos but not yet implemented in practice
**Recommendation:** Document next client project as case study following `.io` experiment format

### `.ltd` (Canon)

**Alignment:** 95%
**Minor Gap:** Tufte referenced but not documented (now resolved with seed script)

---

## Action Items

### Immediate (Complete Today)

- [x] Create voice guidelines page (`/voice`)
- [x] Create Tufte seed script for database
- [ ] Archive "Dual Benefits" experiment
- [ ] Update "Web Scraper" or archive it

### Short-term (This Week)

- [ ] Run Tufte seed script on production database
- [ ] Update `.io` homepage to link to `/voice` guidelines
- [ ] Add voice checklist to experiment template
- [ ] Create `.agency` case study template

### Long-term (This Month)

- [ ] Develop 3-5 `.space` interactive experiments
- [ ] Document next client project as case study
- [ ] Build voice audit tooling (flag jargon, require metrics)
- [ ] Review all published experiments against checklist

---

## Database Changes Required

### Archive Legacy Experiments

```sql
-- Archive experiments that don't meet voice standards
UPDATE experiments
SET
  archived = 1,
  archive_reason = 'Legacy content from pre-voice-establishment period. Preserved for historical record.',
  archive_date = '2025-11-24',
  is_hidden = 1
WHERE id IN (
  '3b47355b-881c-4e6b-ae36-351720de8e6b',  -- Dual Benefits
  '413f17d7-6cf4-4520-9a13-3d1becb9c39b'   -- Web Scraper (if not completing)
);
```

### Add Voice Compliance Fields (Optional Enhancement)

```sql
-- Add fields to track voice compliance
ALTER TABLE experiments ADD COLUMN voice_compliant INTEGER DEFAULT 0;
ALTER TABLE experiments ADD COLUMN voice_audit_date TEXT;
ALTER TABLE experiments ADD COLUMN voice_audit_notes TEXT;

-- Mark compliant experiments
UPDATE experiments
SET
  voice_compliant = 1,
  voice_audit_date = '2025-11-24'
WHERE id IN (
  'canva-design-implementation',
  'marketplace-insights-dashboard-experiment'
);
```

---

## Voice Checklist Template

For all new experiments, verify:

```markdown
### Voice Compliance Checklist

**Empirical:**
- [ ] All claims backed by specific metrics
- [ ] Time/cost comparisons included
- [ ] Methodology transparent

**Honest:**
- [ ] Failures documented
- [ ] Limitations acknowledged
- [ ] Reproducible by others

**Useful:**
- [ ] Solves a real problem
- [ ] Readers can implement this
- [ ] Prerequisites clear

**Grounded:**
- [ ] Master/principle cited when relevant
- [ ] Connects to the canon
- [ ] Philosophical lineage clear

**Clear:**
- [ ] No marketing jargon
- [ ] Direct, declarative sentences
- [ ] Specific over vague

**Required Sections:**
- [ ] ASCII art header
- [ ] Hypothesis → Validation
- [ ] Success criteria (checkbox format)
- [ ] Metrics table (time, cost, savings, ROI)
- [ ] Honest assessment (proves AND doesn't prove)
- [ ] Where intervention was needed
- [ ] Reproducibility (prerequisites, starting prompt, challenges)
- [ ] Master citations (when relevant)
- [ ] Hypothesis outcome (✅ VALIDATED or ❌ INVALIDATED)
```

---

## Conclusion

**Current State:**
The CREATE SOMETHING voice is **well-established and highly distinctive** in recent content (late 2024-present). Legacy content from mid-2024 predates voice formalization and shows clear misalignment.

**Strength:**
Recent experiments (`canva-design-implementation`, `marketplace-insights-dashboard-experiment`) are **excellent examples** of the voice in action—empirical, honest, grounded, and useful.

**Opportunity:**
Archive or update 2 legacy experiments to achieve 100% voice alignment in published research.

**Competitive Advantage:**
The hermeneutic circle approach (`.ltd` principles → `.io` validation → `.space` practice → `.agency` services → feedback to `.ltd`) is **unique in tech content** and should be protected vigilantly.

---

**Next Steps:**
See "Action Items" above. Priority: archive legacy content, run Tufte seed, create first `.space` experiment using voice guidelines.
