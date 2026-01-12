#!/usr/bin/env python3
"""
Test Padelthon Plagiarism Case with Multi-Modal Analysis
==========================================================

This tests the exact case where:
- Human reviewer: Major violation (delisted)
- Vector similarity: <70% (missed it)
- Expected: Multi-modal should catch it via visual analysis
"""

import asyncio
import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import directly to avoid __init__.py issues
import importlib.util
spec = importlib.util.spec_from_file_location(
    "plagiarism_visual_agent",
    Path(__file__).parent / "agents" / "plagiarism_visual_agent.py"
)
plagiarism_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plagiarism_module)

MultiModalPlagiarismAnalyzer = plagiarism_module.MultiModalPlagiarismAnalyzer


BYQ_TEMPLATES = {
    'hollow': 'https://hollow-template.webflow.io/',
    'forerunner': 'https://forerunner-template.webflow.io/',
    'evermind': 'https://evermind-template.webflow.io/',
    'foster_reeves': 'https://foster-and-reeves.webflow.io/',
    'andfold': 'https://andfold.webflow.io/',
    'for_human': 'https://for-human-template.webflow.io/',
}

PADELTHON_URL = 'https://padelthon.webflow.io/'


async def test_single_comparison(
    template_name: str,
    template_url: str,
    analyzer: MultiModalPlagiarismAnalyzer
):
    """Test Padelthon vs one BYQ template"""
    
    print(f"\n{'='*80}")
    print(f"Testing: Padelthon vs {template_name.upper()}")
    print(f"{'='*80}\n")
    
    result = await analyzer.analyze(
        original_url=template_url,
        alleged_copy_url=PADELTHON_URL,
        original_id=template_name,
        copy_id='padelthon'
    )
    
    print(f"\n🎯 VERDICT: {result.verdict.upper()}")
    print(f"📊 Confidence: {result.confidence:.1%}")
    print(f"🔍 Sections: {result.sections_analyzed}")
    
    # Highlight reconstructed sections
    reconstructed = [
        c for c in result.section_comparisons 
        if c.pattern == 'reconstructed' and c.visual_similarity > 0.85
    ]
    
    if reconstructed:
        print(f"\n🚨 RECONSTRUCTED PLAGIARISM DETECTED:")
        for comp in reconstructed:
            print(f"   • {comp.section_type}: {comp.visual_similarity:.1%} visual similarity")
            print(f"     (Vector: {comp.vector_similarity:.1%} - Low code similarity)")
    
    return result


async def test_padelthon_comprehensive():
    """
    Test Padelthon against all 6 BYQ templates
    
    Expected outcome:
    - At least 3 templates show high visual similarity
    - Pattern: "reconstructed" (low vector, high visual)
    - Final verdict: MAJOR violation
    - Matches human reviewer decision ✓
    """
    
    print("🏛️  PADELTHON PLAGIARISM CASE: COMPREHENSIVE TEST")
    print("=" * 80)
    print("\nHuman Reviewer: MAJOR VIOLATION → Delisted")
    print("Vector-Only System: <70% similarity → False negative ❌")
    print("Multi-Modal System: Testing now...")
    print("=" * 80)
    
    # Initialize analyzer
    analyzer = MultiModalPlagiarismAnalyzer(
        vision_provider='claude',  # Can also use 'gemini'
        screenshot_dir='./padelthon_analysis'
    )
    
    # Test against each BYQ template
    results = []
    
    for template_name, template_url in BYQ_TEMPLATES.items():
        try:
            result = await test_single_comparison(template_name, template_url, analyzer)
            results.append((template_name, result))
        except Exception as e:
            print(f"\n❌ Error testing {template_name}: {e}")
            continue
    
    # Aggregate results
    print(f"\n\n{'='*80}")
    print("COMPREHENSIVE ANALYSIS SUMMARY")
    print("=" * 80)
    
    major_violations = sum(1 for _, r in results if r.verdict == 'major')
    minor_violations = sum(1 for _, r in results if r.verdict == 'minor')
    
    # Count total reconstructed sections across all comparisons
    total_reconstructed = 0
    for _, result in results:
        total_reconstructed += sum(
            1 for c in result.section_comparisons 
            if c.pattern == 'reconstructed' and c.visual_similarity > 0.85
        )
    
    print(f"\n📊 Results across {len(results)} templates:")
    print(f"   • Major violations detected: {major_violations}")
    print(f"   • Minor violations detected: {minor_violations}")
    print(f"   • Total reconstructed sections: {total_reconstructed}")
    
    print(f"\n📋 Per-Template Results:")
    for template_name, result in results:
        reconstructed_count = sum(
            1 for c in result.section_comparisons 
            if c.pattern == 'reconstructed' and c.visual_similarity > 0.85
        )
        
        print(f"\n   {template_name.upper()}:")
        print(f"      Verdict: {result.verdict}")
        print(f"      Confidence: {result.confidence:.1%}")
        print(f"      Reconstructed sections: {reconstructed_count}")
    
    # Final assessment
    print(f"\n\n{'='*80}")
    print("FINAL ASSESSMENT")
    print("=" * 80)
    
    if total_reconstructed >= 6 or major_violations >= 2:
        print("\n✅ MULTI-MODAL SYSTEM VERDICT: MAJOR VIOLATION")
        print("\n   Reasons:")
        print(f"   • {total_reconstructed} sections show reconstructed plagiarism")
        print(f"   • High visual similarity despite low code similarity")
        print("   • Pattern matches 'stitched together from multiple sources'")
        print("\n🎯 RESULT: Matches human reviewer decision! ✓")
        print("   System successfully detected what vector-only missed.")
        
    elif total_reconstructed >= 3 or minor_violations >= 3:
        print("\n🟡 MULTI-MODAL SYSTEM VERDICT: MINOR VIOLATION")
        print("\n   Some visual similarities detected")
        print("   May warrant further investigation")
        
    else:
        print("\n🟢 MULTI-MODAL SYSTEM VERDICT: NO VIOLATION")
        print("\n   Templates are sufficiently distinct")
        print("   ⚠️  Diverges from human reviewer (unexpected)")
    
    # Cost summary
    total_cost = sum(r.cost_estimate for _, r in results)
    print(f"\n💰 Total analysis cost: ${total_cost:.4f}")
    print(f"   vs Manual review: $75.00 (6 templates × $12.50)")
    print(f"   Savings: {(1 - total_cost/75) * 100:.1f}%")
    
    print("\n" + "=" * 80)
    
    return results


async def test_quick_single():
    """Quick test: Padelthon vs Hollow only"""
    
    print("🚀 QUICK TEST: Padelthon vs Hollow")
    print("=" * 80)
    
    analyzer = MultiModalPlagiarismAnalyzer(
        vision_provider='claude',
        screenshot_dir='./padelthon_quick_test'
    )
    
    result = await analyzer.analyze(
        original_url=BYQ_TEMPLATES['hollow'],
        alleged_copy_url=PADELTHON_URL,
        original_id='hollow',
        copy_id='padelthon'
    )
    
    print(f"\n🎯 VERDICT: {result.verdict.upper()}")
    print(f"📊 Confidence: {result.confidence:.1%}")
    print(f"\n📝 Reasoning:\n{result.reasoning}")
    
    return result


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test Padelthon plagiarism case')
    parser.add_argument('--quick', action='store_true', 
                       help='Quick test (Hollow only)')
    parser.add_argument('--comprehensive', action='store_true',
                       help='Test against all 6 BYQ templates')
    
    args = parser.parse_args()
    
    if args.comprehensive:
        asyncio.run(test_padelthon_comprehensive())
    elif args.quick:
        asyncio.run(test_quick_single())
    else:
        # Default: quick test
        print("Running quick test (use --comprehensive for full analysis)")
        print()
        asyncio.run(test_quick_single())
