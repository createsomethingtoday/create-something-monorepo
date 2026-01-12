#!/usr/bin/env python3
"""
Quick diagnostic script to verify section detection is working correctly
"""

import asyncio
from agents.plagiarism_visual_agent import SectionDetector, ScreenshotCapture
from playwright.async_api import async_playwright

async def test_detection(url: str, template_name: str):
    """Test section detection for a single template"""
    
    print(f"\n{'='*80}")
    print(f"Testing Section Detection: {template_name}")
    print(f"URL: {url}")
    print(f"{'='*80}\n")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        # Fetch HTML
        print("📄 Fetching HTML...")
        await page.goto(url, wait_until='networkidle')
        html = await page.content()
        
        # Detect sections
        print("\n🔍 Detecting sections...\n")
        detector = SectionDetector(html)
        sections = detector.detect_sections()
        
        print(f"\n✅ Found {len(sections)} sections:\n")
        for section in sections:
            print(f"  • {section.type.upper():15} | ID: {section.id:12} | Selector: {section.selector}")
        
        await browser.close()

async def main():
    """Test section detection on key templates"""
    
    tests = [
        ("https://padelthon.webflow.io/", "Padelthon"),
        ("https://hollow-template.webflow.io/", "Hollow"),
    ]
    
    for url, name in tests:
        await test_detection(url, name)

if __name__ == "__main__":
    asyncio.run(main())
