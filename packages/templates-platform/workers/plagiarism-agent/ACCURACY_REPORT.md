# Plagiarism Detection Accuracy Report

**Generated:** January 17, 2026

## Summary

Our plagiarism detection system uses MinHash signatures and LSH for similarity detection. This report documents the accuracy verification against known plagiarism cases.

## Test Results

### Control Tests ✓

| Test | Expected | Actual | Result |
|------|----------|--------|--------|
| Nimatra vs Nimatra (identical) | 100% | 100% | ✓ Pass |
| Nimatra vs Startub (different) | <30% | 5.5% | ✓ Pass |

### Known Cases

| Case | Original Verdict | Our Similarity | Our Verdict | Match |
|------|------------------|----------------|-------------|-------|
| Scalerfy vs Fluora | Minor | 62.5% | Major | ⚠️ Higher than expected |
| Story vs Verde | Unknown | 66.4% | Major | 🔍 Needs investigation |

## Key Findings

### 1. Threshold Calibration

Current thresholds:
- `> 50%` = Major violation
- `30-50%` = Minor violation  
- `< 30%` = No violation

**Recommendation:** Consider raising the "major" threshold to 65-70% to reduce false positives for templates using shared frameworks.

### 2. Framework Detection Gap

Templates built on shared frameworks (Client-First, Relume, etc.) show elevated similarity scores due to:
- Identical utility classes (`.badge-content`, `.icon-badge`, etc.)
- Shared navigation patterns (`[data-nav-menu-open]`)
- Common property combinations

**Example:** Story vs Verde share 12 identical CSS rules and 30 classes, likely from a shared framework rather than plagiarism.

### 3. Page-Level Analysis

Page-level comparison provides more granular insight:
- Story vs Verde: 52% page-level similarity vs 66% code-level
- Home pages: 66% similarity
- Contact pages: 50% similarity

The page-level analysis helps contextualize where similarity exists.

## Recommendations

1. **Add framework detection** - Filter out known framework classes before computing similarity
2. **Weight identical rules higher** - Prioritize exact CSS rule matches over property matches
3. **Threshold adjustment** - Consider 65% for major, 40% for minor
4. **Human review flag** - Auto-flag cases in 50-70% range for manual review

## Known Framework Classes to Filter

```
// Client-First patterns
.badge-*, .button-*, .icon-*, .remove-*
.form-*, .container-*, .section-*

// Webflow built-in
[data-nav-*], [data-collapse-*], [data-wf-*]
.w-*, .wf-*, .w--*
```

## Next Steps

1. Implement framework class filtering
2. Adjust thresholds based on this analysis
3. Add "framework similarity" metric separate from "design similarity"
4. Build a verification dataset with 20+ labeled cases

## Raw Test Data

```
Scalerfy vs Fluora:
  - Overall similarity: 62.5%
  - Identical rules: 0
  - Property combos: 0
  - Status: Flagged as major (original verdict: minor)

Story vs Verde:
  - Overall similarity: 66.4%
  - Identical rules: 12
  - Property combos: 10
  - Shared classes: 30
  - Shared colors: 18
  - Page-level similarity: 52%
```
