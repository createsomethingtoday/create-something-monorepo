#!/usr/bin/env python3
"""
Nova/Samuel Spenser Plagiarism Case Analysis
Cross-marketplace comparison: Framer (original) vs Webflow (alleged copy)
"""

import asyncio
import os
import sys
from agents.plagiarism_visual_agent import MultiModalPlagiarismAnalyzer

async def analyze_nova_case():
    """Analyze Nova's Samuel Spenser template against Captured original"""
    
    print("\n" + "="*80)
    print("NOVA PLAGIARISM CASE ANALYSIS - 4TH OFFENSE")
    print("="*80)
    
    print("\nCase Details:")
    print("  Creator: Nova (4th documented plagiarism case)")
    print("  Original: 'Captured' by Anatolii Dmitrienko (Framer)")
    print("  Alleged Copy: 'Samuel Spenser' by Nova (Webflow)")
    print("  Status: 20-day ban applied, templates still live")
    print("\n" + "="*80)
    
    # URLs
    original_url = "https://captured.framer.website/"
    copy_url = "https://samuel-spenser.webflow.io/"
    
    # Create specific directory for this case
    screenshot_dir = "./nova_case_analysis"
    
    # Run analysis
    analyzer = MultiModalPlagiarismAnalyzer(screenshot_dir=screenshot_dir)
    
    print(f"\n🔍 Analyzing...")
    print(f"   Original:  {original_url}")
    print(f"   Copy:      {copy_url}")
    
    result = await analyzer.analyze(
        original_url=original_url,
        alleged_copy_url=copy_url
    )
    
    # Display results
    print("\n" + "="*80)
    print("PLAGIARISM ANALYSIS RESULTS")
    print("="*80)
    
    print(f"\n🎯 VERDICT: {result.verdict}")
    print(f"   Confidence: {result.confidence:.1%}")
    print(f"   Sections Analyzed: {len(result.section_comparisons)}")
    
    print(f"\n💻 CODE SIMILARITY:")
    print(f"   HTML Structure: {result.html_similarity:.1%}")
    print(f"   CSS Patterns: {result.css_similarity:.1%}")
    
    if result.section_comparisons:
        print(f"\n📊 VISUAL SIMILARITY BY SECTION:")
        for comp in result.section_comparisons:
            print(f"   {comp.section_type:15s} {comp.visual_similarity:.1%}  ({comp.pattern})")
    
    print(f"\n📝 KEY EVIDENCE:")
    for comp in result.section_comparisons:
        if comp.visual_similarity > 0.70:
            print(f"   • {comp.section_type}: {comp.evidence[:150]}...")
    
    # Cross-marketplace analysis
    print("\n" + "="*80)
    print("CROSS-MARKETPLACE ANALYSIS")
    print("="*80)
    
    print(f"\n🌐 Platform Difference:")
    print(f"   Original: Framer (framer.website)")
    print(f"   Copy: Webflow (webflow.io)")
    print(f"   Expected: Low code similarity, varying visual similarity")
    
    print(f"\n📊 Actual Results:")
    print(f"   Code Similarity: {result.html_similarity:.1%} HTML, {result.css_similarity:.1%} CSS")
    print(f"   Visual Similarity: {sum(c.visual_similarity for c in result.section_comparisons) / len(result.section_comparisons) if result.section_comparisons else 0:.1%} (average)")
    
    # Pattern assessment
    reconstructed_count = sum(1 for c in result.section_comparisons if c.pattern == 'reconstructed')
    copy_paste_count = sum(1 for c in result.section_comparisons if c.pattern == 'copy_paste')
    
    print(f"\n🎨 Pattern Classification:")
    print(f"   Reconstructed sections: {reconstructed_count}")
    print(f"   Copy-paste sections: {copy_paste_count}")
    
    if reconstructed_count > 0:
        print(f"\n   ⚠️  RECONSTRUCTED PLAGIARISM DETECTED")
        print(f"      Definition: Different code, same visual design")
        print(f"      Common in cross-marketplace copying")
    
    # Repeat offender context
    print("\n" + "="*80)
    print("REPEAT OFFENDER PATTERN")
    print("="*80)
    
    print("\n📋 Nova's Plagiarism History:")
    print("   Case 1: [Unknown template] - REMOVED")
    print("   Case 2: [Unknown template] - REMOVED")
    print("   Case 3: [Unknown template] - STILL LIVE (reported)")
    print("   Case 4: Samuel Spenser - THIS CASE")
    
    print("\n🚨 RECOMMENDATION:")
    if result.verdict == "MAJOR":
        print("   ✅ MAJOR violation detected by automated system")
        print("   ✅ Combined with 4-case pattern → PERMANENT BAN justified")
        print("   ✅ Remove all Nova templates immediately")
    elif result.verdict == "MINOR":
        print("   ⚠️  MINOR violation by automated system")
        print("   ⚠️  BUT: 4th documented case changes context")
        print("   ✅ Pattern of behavior → ESCALATE to PERMANENT BAN")
        print("   ✅ Remove all Nova templates immediately")
    else:
        print("   ⚠️  No violation detected by automated system")
        print("   ⚠️  BUT: Community and 4-case pattern suggest otherwise")
        print("   ⚠️  Manual review recommended")
    
    print("\n" + "="*80)
    print("NEXT STEPS")
    print("="*80)
    
    print("\n1. Manual Review:")
    print(f"   - Review screenshots in: {screenshot_dir}/")
    print("   - Compare section-by-section visual similarity")
    print("   - Consider cross-marketplace context")
    
    print("\n2. Pattern Analysis:")
    print("   - Review all 4 Nova cases")
    print("   - Document similarity scores for each")
    print("   - Establish pattern of behavior")
    
    print("\n3. Action Decision:")
    print("   - If pattern confirmed → Permanent ban")
    print("   - Remove all templates immediately")
    print("   - Public statement to restore trust")
    
    print("\n" + "="*80 + "\n")
    
    return result

if __name__ == "__main__":
    result = asyncio.run(analyze_nova_case())
