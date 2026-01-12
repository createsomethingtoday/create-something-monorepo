# Production Test Plan: Plagiarism Detection System

**Goal:** Validate all system components with known ground truth test cases  
**Date:** January 12, 2026

---

## 🎯 Test Philosophy

**The Clone Test (User's Insight):**
> "Create a project and a clone of that project to see if the system gets 100% on the plagiarism"

This is **perfect** because:
1. **Known ground truth** - We know it's 100% plagiarism
2. **Full pipeline test** - Tests vector + visual + interaction + convergence
3. **Alignment check** - See how each subsystem performs
4. **Calibration** - If clone test doesn't get 100%, thresholds need adjustment

---

## 📋 Test Suite: Ground Truth Cases

### Test 1: Perfect Clone ✅ **RECOMMENDED**

**Setup:**
```
1. Create new Webflow template "Original-Test-Template"
2. Use Webflow's duplicate feature to clone it
3. Publish both as:
   - original-test-template.webflow.io
   - clone-test-template.webflow.io
4. Run plagiarism analysis
```

**Expected Results:**
```
Vector Similarity:    95-100% (identical code structure)
Visual Similarity:    95-100% (identical layout)
Interaction Similarity: 95-100% (identical IDs & animations)

Convergence:
  - Every section: 95-100% convergence
  - All sections flagged as convergent

Verdict: MAJOR VIOLATION
Confidence: 99%+
```

**What This Tests:**
- ✅ Vector analysis working (should detect identical code)
- ✅ Visual analysis working (should detect identical layouts)
- ✅ Interaction analysis working (should detect identical IDs)
- ✅ Convergence detection working (should flag all sections)
- ✅ Verdict logic working (should return MAJOR)

**If This Fails:**
- 🔧 System needs calibration
- 🔧 Thresholds may be too high
- 🔧 Component integration issues

---

### Test 2: Gradient Test Suite

Create 5 versions of the same template with decreasing similarity:

#### 2A: Clone (100% Similar)
```
Action: Duplicate template exactly
Expected: MAJOR VIOLATION (95-100% all dimensions)
Purpose: Baseline - system must catch this
```

#### 2B: Reconstructed (80% Similar)
```
Action: 
  - Keep all visual layouts identical
  - Rewrite CSS from scratch (different classes, same styles)
  - Recreate animations (same timing, different implementation)
  
Expected: MAJOR VIOLATION (60% vector, 90% visual, 85% interaction)
Purpose: Test "reconstructed plagiarism" detection
```

#### 2C: Heavily Inspired (60% Similar)
```
Action:
  - Keep hero and footer similar
  - Modify 3 middle sections substantially
  - Change some animations
  - Adjust spacing and colors
  
Expected: MINOR VIOLATION (40% vector, 70% visual, 50% interaction)
Purpose: Test partial copying detection
```

#### 2D: Lightly Inspired (40% Similar)
```
Action:
  - Keep general layout structure
  - All different content and styling
  - Different interactions
  - Only structural patterns similar
  
Expected: NONE (30% vector, 45% visual, 25% interaction)
Purpose: Test that inspiration isn't flagged
```

#### 2E: Completely Different (0% Similar)
```
Action: Create entirely new template, different style, structure, interactions
Expected: NONE (0-20% all dimensions)
Purpose: Test true negative detection
```

---

### Test 3: Convergence Validation

**Setup:** Create templates where different dimensions converge differently

#### 3A: Visual Only (No Convergence)
```
Template A: Hero with stacked cards
Template B: Hero with stacked cards (same layout)
           Different animations (no interactions)

Expected:
  Visual: 85%
  Interaction: 0%
  Convergence: 42.5%
  Verdict: MINOR or NONE (no convergence)
```

#### 3B: Interaction Only (No Convergence)
```
Template A: Scroll-triggered fade animations
Template B: Different layout, same animations

Expected:
  Visual: 20%
  Interaction: 80%
  Convergence: 50%
  Verdict: MINOR or NONE (no convergence)
```

#### 3C: Both Converge (High Convergence)
```
Template A: Hero with stacked cards + parallax scroll
Template B: Same layout + same animations

Expected:
  Visual: 85%
  Interaction: 80%
  Convergence: 82.5%
  Verdict: MAJOR (high convergence!)
```

---

## 🧪 Test Implementation

### Step 1: Create Test Template

**Recommended Structure:**
```
Test Template "Convergence-Test-v1":
  ✓ Hero section with custom layout
  ✓ Features section with grid
  ✓ Testimonials carousel
  ✓ CTA section
  ✓ Footer

Interactions:
  ✓ Hero: Parallax scroll + fade-in
  ✓ Features: Stagger animation on scroll
  ✓ Testimonials: Carousel with custom timing
  ✓ CTA: Hover effects
  ✓ Footer: Fade-in on scroll

Why this structure:
  - Multiple section types (tests section detection)
  - Various interaction patterns (tests interaction extraction)
  - Not too simple (realistic complexity)
  - Not too complex (easy to clone/modify)
```

### Step 2: Clone in Webflow

```
1. Open template in Webflow
2. Duplicate project → "Convergence-Test-v1-Clone"
3. Publish both:
   - convergence-test-v1.webflow.io
   - convergence-test-v1-clone.webflow.io
```

### Step 3: Run Analysis

```bash
cd packages/agent-sdk

# Test the perfect clone
python3 test_production.py \
  --original "https://convergence-test-v1.webflow.io/" \
  --copy "https://convergence-test-v1-clone.webflow.io/" \
  --expected "MAJOR" \
  --output "./production_test_results/"
```

### Step 4: Review Component Alignment

The test should output:

```
================================================================================
PRODUCTION TEST: PERFECT CLONE
================================================================================

COMPONENT ANALYSIS:
--------------------------------------------------
Vector Similarity:      98.5% ✅ (Expected: >95%)
  - HTML structure:     99.2%
  - CSS patterns:       98.1%
  - Class usage:        98.3%

Visual Similarity:      99.1% ✅ (Expected: >95%)
  - Hero:               99.5%
  - Features:           98.8%
  - Testimonials:       99.0%
  - CTA:                99.2%
  - Footer:             99.1%

Interaction Similarity: 100.0% ✅ (Expected: >95%)
  - Shared IDs:         42/42 (100%)
  - Animation patterns: 100%
  - Section convergence: All sections

CONVERGENCE DETECTION:
--------------------------------------------------
Hero:          Visual 99.5% + Interaction 100% = 99.8% 🎯
Features:      Visual 98.8% + Interaction 100% = 99.4% 🎯
Testimonials:  Visual 99.0% + Interaction 100% = 99.5% 🎯
CTA:           Visual 99.2% + Interaction 100% = 99.6% 🎯
Footer:        Visual 99.1% + Interaction 100% = 99.6% 🎯

High convergence sections: 5/5 ✅

FINAL VERDICT:
--------------------------------------------------
Verdict:    MAJOR VIOLATION ✅
Confidence: 99.5%
Expected:   MAJOR VIOLATION ✅

✅ TEST PASSED: All components aligned
```

---

## 📊 Success Criteria

### Perfect Clone Test (Test 1)

| Component | Threshold | Pass Criteria |
|-----------|-----------|---------------|
| Vector Similarity | >95% | ✅ Must pass |
| Visual Similarity | >95% | ✅ Must pass |
| Interaction Similarity | >95% | ✅ Must pass |
| Convergence Sections | 4-5/5 | ✅ Must pass |
| Final Verdict | MAJOR | ✅ Must pass |

### Gradient Test Suite (Test 2)

| Test | Expected Verdict | Pass Criteria |
|------|-----------------|---------------|
| 2A: Clone (100%) | MAJOR | ✅ Must match |
| 2B: Reconstructed (80%) | MAJOR | ✅ Must match |
| 2C: Inspired (60%) | MINOR | ✅ Must match |
| 2D: Light (40%) | NONE | ✅ Must match |
| 2E: Different (0%) | NONE | ✅ Must match |

### Convergence Validation (Test 3)

| Test | Convergence | Expected | Pass Criteria |
|------|-------------|----------|---------------|
| 3A: Visual only | Low (~42%) | MINOR/NONE | ✅ Must match |
| 3B: Interaction only | Medium (~50%) | MINOR/NONE | ✅ Must match |
| 3C: Both converge | High (~82%) | MAJOR | ✅ Must match |

---

## 🛠️ Test Script

Let me create the production test script:

```python
# test_production.py

import asyncio
import sys
from agents.plagiarism_visual_agent import MultiModalPlagiarismAnalyzer

async def run_production_test(
    original_url: str,
    copy_url: str,
    expected_verdict: str,
    test_name: str = "Production Test"
):
    """Run a production test with known ground truth"""
    
    print("=" * 80)
    print(f"PRODUCTION TEST: {test_name.upper()}")
    print("=" * 80)
    print()
    
    analyzer = MultiModalPlagiarismAnalyzer(
        vision_provider='claude',
        screenshot_dir=f"./production_tests/{test_name.lower().replace(' ', '_')}"
    )
    
    result = await analyzer.analyze(
        original_url=original_url,
        alleged_copy_url=copy_url,
        original_id="original",
        copy_id="copy"
    )
    
    # Component breakdown
    print("\nCOMPONENT ANALYSIS:")
    print("-" * 50)
    
    # Visual analysis per section
    print("\nVisual Similarity:")
    for comparison in result.section_comparisons:
        status = "✅" if comparison.visual_similarity > 0.95 else "⚠️" if comparison.visual_similarity > 0.70 else "❌"
        print(f"  {comparison.section_type:15} {comparison.visual_similarity:6.1%} {status}")
    
    # Calculate averages
    avg_visual = sum(c.visual_similarity for c in result.section_comparisons) / len(result.section_comparisons)
    print(f"\n  Average Visual: {avg_visual:.1%}")
    
    # Convergence detection
    print("\nCONVERGENCE DETECTION:")
    print("-" * 50)
    convergent_sections = []
    for comparison in result.section_comparisons:
        if "CONVERGENCE DETECTED" in comparison.evidence:
            convergent_sections.append(comparison.section_type)
            print(f"  🎯 {comparison.section_type}: High convergence detected")
    
    print(f"\n  Total convergent sections: {len(convergent_sections)}/{len(result.section_comparisons)}")
    
    # Final verdict
    print("\nFINAL VERDICT:")
    print("-" * 50)
    print(f"  Verdict:    {result.verdict.upper()}")
    print(f"  Expected:   {expected_verdict.upper()}")
    print(f"  Confidence: {result.confidence:.1%}")
    print(f"  Cost:       ${result.cost_estimate:.3f}")
    
    # Test result
    passed = result.verdict.upper() == expected_verdict.upper()
    print()
    if passed:
        print("  ✅ TEST PASSED: Verdict matches expected")
    else:
        print("  ❌ TEST FAILED: Verdict does not match expected")
    
    print("\n" + "=" * 80)
    
    return passed, result

async def main():
    """Run all production tests"""
    
    tests = []
    
    # Test 1: Perfect Clone (if URLs provided)
    if len(sys.argv) >= 3:
        original_url = sys.argv[1]
        copy_url = sys.argv[2]
        expected = sys.argv[3] if len(sys.argv) > 3 else "MAJOR"
        
        passed, result = await run_production_test(
            original_url=original_url,
            copy_url=copy_url,
            expected_verdict=expected,
            test_name="Perfect Clone Test"
        )
        
        tests.append(("Perfect Clone", passed))
    else:
        print("Usage: python3 test_production.py <original_url> <copy_url> [expected_verdict]")
        print()
        print("Example:")
        print("  python3 test_production.py \\")
        print("    https://convergence-test-v1.webflow.io/ \\")
        print("    https://convergence-test-v1-clone.webflow.io/ \\")
        print("    MAJOR")
        return
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUITE SUMMARY")
    print("=" * 80)
    for test_name, passed in tests:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {test_name:30} {status}")
    
    total = len(tests)
    passed_count = sum(1 for _, p in tests if p)
    print(f"\n  Total: {passed_count}/{total} tests passed ({passed_count/total*100:.0f}%)")
    print("=" * 80)

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(main())
```

---

## 📈 Calibration Process

If the perfect clone test doesn't get 100%:

### If Vector Similarity < 95%
```
Diagnosis: Vector embedding threshold too strict
Solution: Review OpenAI embedding comparison
Action: May need to adjust similarity calculation
```

### If Visual Similarity < 95%
```
Diagnosis: Vision model being too conservative
Solution: Review Claude Vision prompts
Action: May need to adjust similarity scale in prompt
```

### If Interaction Similarity < 95%
```
Diagnosis: Interaction ID matching not working
Solution: Check data-w-id extraction
Action: Verify JavaScript evaluation in browser
```

### If Convergence Not Detected
```
Diagnosis: Convergence thresholds too high
Solution: Review convergence formula
Action: Lower thresholds or adjust weights
```

### If Wrong Verdict
```
Diagnosis: Verdict logic thresholds need adjustment
Solution: Review _generate_verdict() thresholds
Action: Tune based on ground truth test results
```

---

## 🎯 Recommended First Test

### Create Simple Test Template

**Minimal viable test:**
```
Template: "PlagiarismTest-Simple"

Structure:
  - Hero (full-width with heading)
  - Features (3-column grid)
  - Footer (simple)

Interactions:
  - Hero: Fade-in on load
  - Features: Scroll-triggered fade
  - Footer: Static

Why minimal:
  - Fast to create
  - Easy to clone
  - Clear ground truth
  - Tests core functionality
```

### Test Steps

```bash
# 1. Create and publish template
# 2. Clone and publish clone
# 3. Run test

cd packages/agent-sdk

python3 test_production.py \
  "https://plagiarismtest-simple.webflow.io/" \
  "https://plagiarismtest-simple-clone.webflow.io/" \
  "MAJOR"

# Expected output:
# ✅ TEST PASSED: All components aligned
# Verdict: MAJOR VIOLATION (99%+ confidence)
```

---

## 💡 Why This Approach Works

### 1. Known Ground Truth
- No ambiguity about correct answer
- Clone = 100% plagiarism
- Different = 0% plagiarism

### 2. Component Validation
- See exactly where system succeeds/fails
- Vector, visual, interaction scores visible
- Can debug specific components

### 3. Threshold Calibration
- If clone test doesn't get 100%, thresholds wrong
- Can tune until perfect clone = perfect detection
- Then test on real-world cases

### 4. Alignment Check
- See if all components agree
- Vector high + visual high + interaction high = aligned
- Vector low + visual high = misaligned (investigate)

### 5. Realistic Complexity
- Not toy examples
- Real Webflow templates
- Real interactions
- Real deployment

---

## 📊 Expected Timeline

### Phase 1: Perfect Clone Test (1-2 hours)
- ✅ Create simple test template
- ✅ Clone it
- ✅ Run analysis
- ✅ Validate 95-100% similarity
- ✅ Tune thresholds if needed

### Phase 2: Gradient Test Suite (3-4 hours)
- ✅ Create 5 gradient versions
- ✅ Run all tests
- ✅ Validate verdict accuracy
- ✅ Fine-tune convergence thresholds

### Phase 3: Real-World Validation (2-3 hours)
- ✅ Re-run Padelthon case
- ✅ Test other known cases
- ✅ Compare to human judgments
- ✅ Document accuracy

**Total: 6-9 hours for complete validation**

---

## ✅ Deliverables

### Test Results Report
```markdown
# Production Test Results

## Test 1: Perfect Clone
- Vector: 98.5% ✅
- Visual: 99.1% ✅
- Interaction: 100% ✅
- Verdict: MAJOR ✅

## Test 2: Gradient Suite
- 100% clone: MAJOR ✅
- 80% reconstructed: MAJOR ✅
- 60% inspired: MINOR ✅
- 40% light: NONE ✅
- 0% different: NONE ✅

## Test 3: Convergence
- Visual only: MINOR ✅
- Interaction only: MINOR ✅
- Both converge: MAJOR ✅

## Summary
- Tests passed: 9/9 (100%)
- System validated ✅
- Ready for production ✅
```

---

## 🎯 Next Steps After Testing

### If All Tests Pass (Expected)
1. ✅ System validated with ground truth
2. ✅ Test on real Padelthon case
3. ✅ Compare to human reviewer verdicts
4. ✅ Deploy to production

### If Some Tests Fail
1. 🔧 Identify failing components
2. 🔧 Calibrate thresholds
3. 🔧 Re-run tests
4. 🔧 Iterate until 100% pass

---

**Recommendation:** Start with Test 1 (Perfect Clone) - it's the simplest way to validate the entire pipeline works correctly!

Would you like me to create the `test_production.py` script now?
