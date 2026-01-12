#!/usr/bin/env python3
"""
Production Test Script for Plagiarism Detection System
Tests system with known ground truth (cloned templates)
"""

import asyncio
import sys
import os
from pathlib import Path
sys.path.insert(0, os.path.dirname(__file__))

from agents.plagiarism_visual_agent import MultiModalPlagiarismAnalyzer

async def run_production_test(
    original_url: str,
    copy_url: str,
    expected_verdict: str,
    test_name: str = "Production Test"
):
    """Run a production test with known ground truth"""
    
    print("\n" + "=" * 80)
    print(f"PRODUCTION TEST: {test_name.upper()}")
    print("=" * 80)
    print()
    print(f"Original:      {original_url}")
    print(f"Copy:          {copy_url}")
    print(f"Expected:      {expected_verdict.upper()}")
    print()
    
    # Create test directory
    test_dir = Path(f"./production_tests/{test_name.lower().replace(' ', '_')}")
    test_dir.mkdir(parents=True, exist_ok=True)
    
    analyzer = MultiModalPlagiarismAnalyzer(
        vision_provider='claude',
        screenshot_dir=str(test_dir)
    )
    
    print("Running analysis...")
    result = await analyzer.analyze(
        original_url=original_url,
        alleged_copy_url=copy_url,
        original_id="original",
        copy_id="copy"
    )
    
    # === COMPONENT BREAKDOWN ===
    print("\n" + "=" * 80)
    print("COMPONENT ANALYSIS")
    print("=" * 80)
    
    # Code similarity (HTML + CSS)
    print("\n💻 Code Similarity:")
    print("-" * 80)
    
    html_scores = [c.html_similarity for c in result.section_comparisons if c.html_similarity > 0]
    css_scores = [c.css_similarity for c in result.section_comparisons if c.css_similarity > 0]
    
    avg_html = sum(html_scores) / len(html_scores) if html_scores else 0
    avg_css = sum(css_scores) / len(css_scores) if css_scores else 0
    
    html_status = "✅ IDENTICAL" if avg_html > 0.95 else "🟢 VERY HIGH" if avg_html > 0.85 else "🟡 HIGH" if avg_html > 0.70 else "🟠 MEDIUM" if avg_html > 0.50 else "❌ LOW"
    css_status = "✅ IDENTICAL" if avg_css > 0.95 else "🟢 VERY HIGH" if avg_css > 0.85 else "🟡 HIGH" if avg_css > 0.70 else "🟠 MEDIUM" if avg_css > 0.50 else "❌ LOW"
    
    print(f"  HTML structure   {avg_html:6.1%}   {html_status}")
    print(f"  CSS patterns     {avg_css:6.1%}   {css_status}")
    
    if avg_html > 0.95 and avg_css > 0.95:
        print(f"\n  ✅ CODE: Near-identical structure and styling (clone detected)")
    elif avg_html > 0.85 or avg_css > 0.85:
        print(f"\n  🟢 CODE: Very similar structure (possible copying)")
    else:
        print(f"\n  ℹ️  CODE: Different implementation")
    
    # Visual similarity per section
    print("\n📊 Visual Similarity by Section:")
    print("-" * 80)
    
    visual_scores = []
    for comparison in result.section_comparisons:
        visual_scores.append(comparison.visual_similarity)
        
        # Status indicator
        if comparison.visual_similarity > 0.95:
            status = "✅ IDENTICAL"
        elif comparison.visual_similarity > 0.85:
            status = "🟢 VERY HIGH"
        elif comparison.visual_similarity > 0.70:
            status = "🟡 HIGH"
        elif comparison.visual_similarity > 0.50:
            status = "🟠 MEDIUM"
        else:
            status = "❌ LOW"
        
        print(f"  {comparison.section_type:15} {comparison.visual_similarity:6.1%}   {status}")
    
    avg_visual = sum(visual_scores) / len(visual_scores) if visual_scores else 0
    
    if avg_visual > 0.95:
        avg_status = "✅ PASS (Expected >95% for clone)"
    elif avg_visual > 0.85:
        avg_status = "🟢 HIGH (May pass depending on test)"
    else:
        avg_status = f"⚠️  REVIEW NEEDED (Expected >95% for clone test)"
    
    print()
    print(f"  {'Average':15} {avg_visual:6.1%}   {avg_status}")
    
    # Convergence detection
    print("\n🎯 Convergence Detection:")
    print("-" * 80)
    
    convergent_sections = []
    for comparison in result.section_comparisons:
        if "CONVERGENCE DETECTED" in comparison.evidence:
            convergent_sections.append(comparison.section_type)
            # Extract convergence scores from evidence if available
            print(f"  🎯 {comparison.section_type:15} High convergence detected")
    
    if not convergent_sections and expected_verdict.upper() == "MAJOR":
        print(f"  ⚠️  WARNING: No convergent sections found (expected for MAJOR verdict)")
    elif convergent_sections:
        print()
        print(f"  Total convergent sections: {len(convergent_sections)}/{len(result.section_comparisons)}")
        
        if len(convergent_sections) >= 2:
            print(f"  ✅ PASS: Multiple convergent sections (expected for MAJOR)")
        else:
            print(f"  🟡 BORDERLINE: Only 1 convergent section")
    
    # Interaction analysis (if available in reasoning)
    print("\n🎭 Interaction Analysis:")
    print("-" * 80)
    
    if "Interaction" in result.reasoning:
        # Extract interaction info from reasoning
        for line in result.reasoning.split('\n'):
            if 'interaction' in line.lower() or 'Interaction' in line:
                print(f"  {line.strip()}")
    else:
        print("  ℹ️  Interaction analysis included in verdict")
    
    # === FINAL VERDICT ===
    print("\n" + "=" * 80)
    print("FINAL VERDICT")
    print("=" * 80)
    print()
    print(f"  Verdict:      {result.verdict.upper()}")
    print(f"  Expected:     {expected_verdict.upper()}")
    print(f"  Confidence:   {result.confidence:.1%}")
    print(f"  Sections:     {result.sections_analyzed}")
    print(f"  Cost:         ${result.cost_estimate:.3f}")
    print()
    
    # Test result
    passed = result.verdict.upper() == expected_verdict.upper()
    
    if passed:
        print("  " + "="*76)
        print("  ✅ TEST PASSED: Verdict matches expected")
        print("  " + "="*76)
    else:
        print("  " + "="*76)
        print("  ❌ TEST FAILED: Verdict does not match expected")
        print("  " + "="*76)
        print()
        print("  Expected: " + expected_verdict.upper())
        print("  Got:      " + result.verdict.upper())
    
    # Detailed reasoning
    print("\n" + "-" * 80)
    print("REASONING:")
    print("-" * 80)
    print(result.reasoning)
    
    print("\n" + "=" * 80)
    
    return passed, result


async def main():
    """Run production tests"""
    
    print("\n" + "="*80)
    print("PLAGIARISM DETECTION SYSTEM - PRODUCTION TEST SUITE")
    print("="*80)
    print()
    print("Purpose: Validate system with known ground truth (cloned templates)")
    print()
    
    # Parse command line arguments
    if len(sys.argv) < 3:
        print("Usage: python3 test_production.py <original_url> <copy_url> [expected_verdict]")
        print()
        print("Arguments:")
        print("  original_url       URL of original template")
        print("  copy_url           URL of alleged copy")
        print("  expected_verdict   Expected verdict: MAJOR, MINOR, or NONE (default: MAJOR)")
        print()
        print("Example - Perfect Clone Test:")
        print("  python3 test_production.py \\")
        print("    https://my-template.webflow.io/ \\")
        print("    https://my-template-clone.webflow.io/ \\")
        print("    MAJOR")
        print()
        print("Example - Different Templates:")
        print("  python3 test_production.py \\")
        print("    https://template-a.webflow.io/ \\")
        print("    https://template-b.webflow.io/ \\")
        print("    NONE")
        print()
        print("Recommended First Test:")
        print("  1. Create a simple Webflow template")
        print("  2. Use Webflow's duplicate feature to clone it")
        print("  3. Publish both templates")
        print("  4. Run this test (should get 95-100% similarity)")
        print()
        return
    
    original_url = sys.argv[1]
    copy_url = sys.argv[2]
    expected = sys.argv[3].upper() if len(sys.argv) > 3 else "MAJOR"
    
    # Validate expected verdict
    if expected not in ['MAJOR', 'MINOR', 'NONE']:
        print(f"❌ Error: Expected verdict must be MAJOR, MINOR, or NONE (got: {expected})")
        return
    
    # Run test
    test_results = []
    
    test_name = "Perfect Clone" if expected == "MAJOR" else f"{expected} Test"
    passed, result = await run_production_test(
        original_url=original_url,
        copy_url=copy_url,
        expected_verdict=expected,
        test_name=test_name
    )
    
    test_results.append((test_name, passed, result))
    
    # === SUMMARY ===
    print("\n\n" + "="*80)
    print("TEST SUITE SUMMARY")
    print("="*80)
    print()
    
    for test_name, passed, result in test_results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {test_name:30} {status:12} (Verdict: {result.verdict.upper()})")
    
    print()
    total = len(test_results)
    passed_count = sum(1 for _, p, _ in test_results if p)
    pass_rate = (passed_count / total * 100) if total > 0 else 0
    
    print(f"  Total: {passed_count}/{total} tests passed ({pass_rate:.0f}%)")
    print()
    
    if passed_count == total:
        print("  " + "="*76)
        print("  🎉 ALL TESTS PASSED - System validated!")
        print("  " + "="*76)
    else:
        print("  " + "="*76)
        print("  ⚠️  SOME TESTS FAILED - Review component thresholds")
        print("  " + "="*76)
    
    print("\n" + "="*80)
    print()
    
    # Recommendations
    if passed_count == total:
        print("✅ Next Steps:")
        print("  1. Run gradient test suite (create versions with 80%, 60%, 40% similarity)")
        print("  2. Test convergence detection with specific patterns")
        print("  3. Run on real-world cases (e.g., Padelthon)")
        print("  4. Deploy to production")
    else:
        print("🔧 Calibration Needed:")
        print("  1. Review component scores above")
        print("  2. Identify which components are below expectations")
        print("  3. Adjust thresholds in plagiarism_visual_agent.py")
        print("  4. Re-run test until it passes")
    
    print()


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(main())
