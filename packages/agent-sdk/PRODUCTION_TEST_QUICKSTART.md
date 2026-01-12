# Production Test Quick Start Guide

**Goal:** Validate the plagiarism detection system with a known ground truth test

---

## 🎯 The Perfect Test (Your Idea!)

> "Create a project and a clone of that project to see if the system gets 100% on the plagiarism"

This is the **best way** to validate the system because:
- ✅ You know the answer (it's a clone = 100% plagiarism)
- ✅ Tests all components (vector + visual + interaction + convergence)
- ✅ If it doesn't get ~100%, something needs calibration

---

## 📋 Step-by-Step Guide

### Step 1: Create Test Template in Webflow

**Option A: Simple Test (Recommended for first test)**
```
Create new project: "Plagiarism-Test-Simple"

Include:
  - Hero section (full-width with heading + image)
  - Features section (3-column grid)
  - Footer (simple)

Add interactions:
  - Hero: Fade-in animation on load
  - Features: Scroll-triggered stagger
  - Footer: Basic hover effects

Time: ~15 minutes
```

**Option B: Realistic Test (For comprehensive validation)**
```
Create new project: "Plagiarism-Test-Full"

Include:
  - Hero with custom layout
  - Features grid
  - Testimonials carousel
  - CTA section
  - Footer

Add rich interactions:
  - Parallax scrolling
  - Scroll-triggered animations
  - Hover effects
  - Custom timing sequences

Time: ~30-45 minutes
```

### Step 2: Clone the Template

In Webflow:
```
1. Open your test project
2. Click project settings (⚙️)
3. Click "Duplicate Project"
4. Name it: "[Original Name]-Clone"
5. Wait for duplication to complete
```

### Step 3: Publish Both Templates

```
Original:
1. Open "Plagiarism-Test-Simple"
2. Publish to: plagiarism-test-simple.webflow.io
3. Wait for publish to complete

Clone:
1. Open "Plagiarism-Test-Simple-Clone"
2. Publish to: plagiarism-test-simple-clone.webflow.io
3. Wait for publish to complete
```

**URLs you'll get:**
- `https://plagiarism-test-simple.webflow.io/`
- `https://plagiarism-test-simple-clone.webflow.io/`

### Step 4: Run the Test

```bash
cd packages/agent-sdk

# Make sure environment is set up
export $(cat .env | grep -v '^#' | xargs) 2>/dev/null

# Run production test
python3 test_production.py \
  "https://plagiarism-test-simple.webflow.io/" \
  "https://plagiarism-test-simple-clone.webflow.io/" \
  "MAJOR"
```

### Step 5: Review Results

Expected output for perfect clone:

```
================================================================================
COMPONENT ANALYSIS
================================================================================

📊 Visual Similarity by Section:
--------------------------------------------------------------------------------
  hero            98.5%   ✅ IDENTICAL
  features        99.2%   ✅ IDENTICAL
  footer          98.8%   ✅ IDENTICAL

  Average         98.8%   ✅ PASS (Expected >95% for clone)

🎯 Convergence Detection:
--------------------------------------------------------------------------------
  🎯 hero            High convergence detected
  🎯 features        High convergence detected
  🎯 footer          High convergence detected

  Total convergent sections: 3/3
  ✅ PASS: Multiple convergent sections (expected for MAJOR)

🎭 Interaction Analysis:
--------------------------------------------------------------------------------
  - Global interaction similarity: 100.0%
  - 42 shared interaction IDs (CRITICAL: copy-paste detected)

================================================================================
FINAL VERDICT
================================================================================

  Verdict:      MAJOR
  Expected:     MAJOR
  Confidence:   99.2%
  Sections:     3
  Cost:         $0.045

  ============================================================================
  ✅ TEST PASSED: Verdict matches expected
  ============================================================================
```

---

## 🎓 What to Look For

### ✅ Perfect Test Results

```
Visual Similarity:      95-100% ✅
  - All sections >95%
  - Average >95%

Interaction Similarity: 95-100% ✅
  - Shared interaction IDs detected
  - All sections show interactions

Convergence:            ✅
  - Multiple sections flagged
  - High convergence scores (>80%)

Final Verdict:          MAJOR ✅
  - Matches expected
  - High confidence (>95%)
```

### ⚠️ If Something's Wrong

**Visual Similarity < 95%**
```
Problem: Screenshots not matching perfectly
Possible causes:
  - Fonts not loaded
  - Images not loaded
  - Timing issues (animations captured at different times)
  
Solution:
  - Check screenshots in ./production_tests/
  - Verify both sites loaded correctly
  - May need to add wait time for fonts
```

**Interaction Similarity < 95%**
```
Problem: Interactions not detected correctly
Possible causes:
  - data-w-id not being extracted
  - JavaScript not executing
  - Browser timing issue
  
Solution:
  - Check browser console for errors
  - Verify interactions exist on live site
  - Review interaction extraction code
```

**Wrong Verdict**
```
Problem: Verdict doesn't match expected
Possible causes:
  - Thresholds too high/low
  - Convergence detection not working
  - Component weights incorrect
  
Solution:
  - Review component scores
  - Adjust thresholds in _generate_verdict()
  - Test again
```

---

## 📊 Gradient Test Suite (After Clone Test Passes)

Once the clone test passes, create these variations:

### Test 1: Clone (100%) - Already tested ✅

### Test 2: Reconstructed (80% Similar)
```
Take your clone and:
  1. Rewrite all CSS from scratch (keep visual identical)
  2. Rename all classes
  3. Recreate animations with different implementation

Expected: MAJOR (high visual, medium vector, high interaction)
```

### Test 3: Inspired (60% Similar)
```
Take your clone and:
  1. Keep hero and footer
  2. Change middle sections
  3. Adjust colors and spacing
  4. Modify some animations

Expected: MINOR (medium visual, low vector, medium interaction)
```

### Test 4: Different (0% Similar)
```
Create completely new template with different:
  - Layout structure
  - Visual style
  - Interactions
  - Content

Expected: NONE (low all dimensions)
```

Run each:
```bash
# Test reconstructed
python3 test_production.py \
  "https://original.webflow.io/" \
  "https://reconstructed.webflow.io/" \
  "MAJOR"

# Test inspired
python3 test_production.py \
  "https://original.webflow.io/" \
  "https://inspired.webflow.io/" \
  "MINOR"

# Test different
python3 test_production.py \
  "https://original.webflow.io/" \
  "https://different.webflow.io/" \
  "NONE"
```

---

## 🎯 Success Criteria

### Clone Test Must Pass

| Metric | Threshold | Why |
|--------|-----------|-----|
| Visual similarity | >95% | It's identical, should be near perfect |
| Interaction similarity | >95% | Same IDs, should be 100% |
| Convergence sections | All sections | Every section should converge |
| Final verdict | MAJOR | It's a perfect clone |

**If clone test doesn't pass, don't proceed** - fix the system first!

### Gradient Tests Should Pass

| Test | Expected | Tolerance |
|------|----------|-----------|
| Clone (100%) | MAJOR | Must match |
| Reconstructed (80%) | MAJOR | Must match |
| Inspired (60%) | MINOR | Can be MINOR or NONE |
| Different (0%) | NONE | Must match |

---

## 💡 Pro Tips

### Tip 1: Start Simple
Your first test should be a simple template (3-4 sections). Don't start with a complex template with 20 sections.

### Tip 2: Use Webflow's Duplicate
Don't manually recreate - use Webflow's built-in duplicate feature. This guarantees a true clone.

### Tip 3: Check Screenshots
After the test, look at the screenshots in `./production_tests/[test_name]/` to verify they captured correctly.

### Tip 4: Document Results
Save the test output to a file for reference:
```bash
python3 test_production.py \
  "https://original.webflow.io/" \
  "https://clone.webflow.io/" \
  "MAJOR" | tee production_test_results.txt
```

### Tip 5: Test Different Section Types
Make sure your test template includes variety:
- Hero (tests image-heavy sections)
- Features/grid (tests layout detection)
- Carousel (tests interaction complexity)
- Footer (tests position validation)

---

## 🚀 Next Steps After Validation

### If All Tests Pass ✅
```
1. ✅ System validated with ground truth
2. ✅ Ready to test real-world cases
3. ✅ Run Padelthon comprehensive test
4. ✅ Deploy to production
```

### If Tests Fail ⚠️
```
1. 🔧 Review component scores
2. 🔧 Identify failing components
3. 🔧 Calibrate thresholds
4. 🔧 Re-run until passes
```

---

## 📁 Files

- `PRODUCTION_TEST_PLAN.md` - Detailed test plan and methodology
- `test_production.py` - Test execution script
- `PRODUCTION_TEST_QUICKSTART.md` - This file

---

## ⏱️ Time Estimate

```
Create test template:    15-30 min
Clone in Webflow:        2-3 min
Publish both:            5 min
Run test:                3-5 min (per test)
Review results:          5-10 min

Total:                   30-60 min for complete validation
```

---

## ❓ Troubleshooting

**Q: Test says "ModuleNotFoundError"**
```bash
# Make sure you're in the right directory
cd packages/agent-sdk

# And environment variables are loaded
export $(cat .env | grep -v '^#' | xargs)
```

**Q: Test fails with API errors**
```bash
# Check your API keys are set
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY

# If empty, add them to .env file
```

**Q: Visual similarity is low (< 90%) for clone**
```
- Check if fonts loaded on both sites
- Check if images loaded on both sites
- Look at screenshots in production_tests/ folder
- May need to add font-loading wait time
```

**Q: How do I know what's a good threshold?**
```
The clone test calibrates the system:
- If clone gets 98% → threshold should be ~95%
- If clone gets 92% → threshold should be ~85%
- Clone test sets the "maximum possible" similarity
```

---

**Ready to start?** Create your test template in Webflow and run the clone test! 🚀
