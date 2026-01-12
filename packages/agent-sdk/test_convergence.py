#!/usr/bin/env python3
"""
Test Pattern Convergence Detection
User insight: "interaction patterns combined with layout patterns make templates converge"
"""

import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from agents.plagiarism_visual_agent import MultiModalPlagiarismAnalyzer

async def test_convergence():
    """Test convergence detection on a simple case"""
    
    analyzer = MultiModalPlagiarismAnalyzer(
        vision_provider='claude',
        screenshot_dir="./convergence_test"
    )
    
    print("\n" + "="*80)
    print("PATTERN CONVERGENCE DETECTION TEST")
    print("="*80 + "\n")
    print("Testing the insight:")
    print('"Interaction patterns combined with layout patterns make templates converge"\n')
    
    # Test with Padelthon vs Hollow
    original_url = "https://hollow-template.webflow.io/"
    copy_url = "https://padelthon.webflow.io/"
    
    print(f"Comparing:")
    print(f"  Original: {original_url}")
    print(f"  Alleged copy: {copy_url}\n")
    
    result = await analyzer.analyze(
        original_url=original_url,
        alleged_copy_url=copy_url,
        original_id="hollow",
        copy_id="padelthon"
    )
    
    print("\n" + "="*80)
    print("CONVERGENCE ANALYSIS RESULTS")
    print("="*80 + "\n")
    
    print(f"Verdict: {result.verdict.upper()}")
    print(f"Confidence: {result.confidence:.1%}")
    print(f"Sections analyzed: {result.sections_analyzed}")
    print(f"Cost: ${result.cost_estimate:.3f}\n")
    
    print("Section-by-section breakdown:")
    for comparison in result.section_comparisons:
        print(f"\n{comparison.section_type.upper()}:")
        print(f"  Visual similarity: {comparison.visual_similarity:.1%}")
        print(f"  Pattern: {comparison.pattern}")
        
        # Check if convergence note was added
        if "CONVERGENCE DETECTED" in comparison.evidence:
            print(f"  🎯 CONVERGENCE DETECTED!")
    
    print("\n" + "-"*80)
    print("REASONING:")
    print("-"*80)
    print(result.reasoning)
    
    print("\n" + "="*80)
    print("✅ Convergence detection test complete!")
    print("="*80 + "\n")

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(test_convergence())
