#!/usr/bin/env python3
"""
Quick template comparison - Code similarity only (no screenshots)
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Import directly
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location(
    "plagiarism_visual_agent",
    Path(__file__).parent / "agents" / "plagiarism_visual_agent.py"
)
plagiarism_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plagiarism_module)

MultiModalPlagiarismAnalyzer = plagiarism_module.MultiModalPlagiarismAnalyzer

async def quick_comparison(url1: str, url2: str):
    """Quick code similarity comparison"""
    
    print("\n" + "="*80)
    print("QUICK TEMPLATE COMPARISON")
    print("="*80 + "\n")
    print(f"Template 1: {url1}")
    print(f"Template 2: {url2}\n")
    
    analyzer = MultiModalPlagiarismAnalyzer()
    
    # Fetch HTML
    print("📄 Fetching HTML...")
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url1) as resp:
            html1 = await resp.text()
        async with session.get(url2) as resp:
            html2 = await resp.text()
    
    print("✅ HTML fetched\n")
    
    # Extract structure
    print("🔍 Analyzing HTML structure...")
    struct1 = analyzer.extract_html_structure(html1)
    struct2 = analyzer.extract_html_structure(html2)
    
    html_sim = analyzer.compare_html_structure(struct1, struct2)
    print(f"   HTML Structure: {html_sim:.1%}")
    
    # Extract CSS
    print("\n🎨 Analyzing CSS patterns...")
    css1 = analyzer.extract_css_patterns(html1)
    css2 = analyzer.extract_css_patterns(html2)
    
    css_sim = analyzer.compare_css_patterns(css1, css2)
    print(f"   CSS Patterns: {css_sim:.1%}")
    
    # Summary
    print("\n" + "="*80)
    print("CODE SIMILARITY SUMMARY")
    print("="*80 + "\n")
    
    print(f"HTML Structure:  {html_sim:6.1%}  ", end="")
    if html_sim > 0.95:
        print("✅ IDENTICAL (clone)")
    elif html_sim > 0.85:
        print("🟢 VERY HIGH (likely copied)")
    elif html_sim > 0.70:
        print("🟡 HIGH (similar structure)")
    elif html_sim > 0.50:
        print("🟠 MEDIUM (some similarities)")
    else:
        print("❌ LOW (different)")
    
    print(f"CSS Patterns:    {css_sim:6.1%}  ", end="")
    if css_sim > 0.95:
        print("✅ IDENTICAL (clone)")
    elif css_sim > 0.85:
        print("🟢 VERY HIGH (likely copied)")
    elif css_sim > 0.70:
        print("🟡 HIGH (similar styling)")
    elif css_sim > 0.50:
        print("🟠 MEDIUM (some similarities)")
    else:
        print("❌ LOW (different)")
    
    avg = (html_sim + css_sim) / 2
    print(f"\nOverall Code:    {avg:6.1%}  ", end="")
    if avg > 0.90:
        print("🚨 MAJOR - Likely plagiarism")
    elif avg > 0.70:
        print("⚠️  MINOR - Investigate further")
    else:
        print("✅ NONE - Templates are different")
    
    # Details
    print("\n" + "-"*80)
    print("DETAILS")
    print("-"*80 + "\n")
    
    print(f"Template 1:")
    print(f"   Total elements: {struct1['total_elements']}")
    print(f"   Unique tags: {len(struct1['unique_tags'])}")
    print(f"   Classes: {len(css1['classes'])}")
    
    print(f"\nTemplate 2:")
    print(f"   Total elements: {struct2['total_elements']}")
    print(f"   Unique tags: {len(struct2['unique_tags'])}")
    print(f"   Classes: {len(css2['classes'])}")
    
    # Shared classes
    shared_classes = css1['classes'] & css2['classes']
    if len(shared_classes) > 10:
        print(f"\n⚠️  Shared {len(shared_classes)} CSS classes")
        print(f"   Examples: {', '.join(list(shared_classes)[:5])}")
    
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 test_quick_comparison.py <url1> <url2>")
        sys.exit(1)
    
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(quick_comparison(sys.argv[1], sys.argv[2]))
