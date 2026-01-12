#!/usr/bin/env python3
"""
Quick test of interaction analysis on Webflow templates
"""

import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

# Import directly to avoid module resolution issues
from agents.plagiarism_visual_agent import MultiModalPlagiarismAnalyzer

async def test_interaction_extraction():
    """Test interaction extraction on Visto template"""
    
    analyzer = MultiModalPlagiarismAnalyzer(
        vision_provider='claude',
        screenshot_dir="./interaction_test"
    )
    
    print("\n" + "="*80)
    print("WEBFLOW INTERACTION EXTRACTION TEST")
    print("="*80 + "\n")
    
    url = "https://visto-template.webflow.io/"
    print(f"Analyzing: {url}\n")
    
    signature = await analyzer.extract_interaction_signature(url)
    
    print("📊 Interaction Signature:")
    print(f"   • Interactive elements: {signature['interactive_elements']}")
    print(f"   • CSS animations: {signature['animations']}")
    print(f"   • Transitions: {signature['transitions']}")
    print(f"   • Hover effects: {signature['hover_effects']}")
    print(f"   • Scroll triggers: {signature['scroll_triggers']}")
    print(f"   • Click triggers: {signature['click_triggers']}")
    print(f"   • Webflow scripts: {len(signature['webflow_scripts'])} files")
    
    if signature['webflow_scripts']:
        print(f"\n   Script files:")
        for script in signature['webflow_scripts'][:5]:
            print(f"      - {script}")
    
    if signature['interaction_ids']:
        print(f"\n   First 5 interaction IDs:")
        for interaction_id in signature['interaction_ids'][:5]:
            print(f"      - {interaction_id}")
    
    print("\n" + "="*80)
    print("✅ Interaction extraction complete!")
    print("="*80 + "\n")

if __name__ == "__main__":
    asyncio.run(test_interaction_extraction())
