#!/usr/bin/env python3
"""
Webflow Interaction Analyzer
Extracts and compares JavaScript interactions from Webflow templates
"""

import re
import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from playwright.async_api import async_playwright, Page
import asyncio


@dataclass
class WebflowInteraction:
    """Represents a Webflow interaction"""
    trigger: str  # e.g., 'click', 'hover', 'scroll'
    action: str   # e.g., 'move', 'fade', 'scale'
    target: str   # CSS selector or element ID
    duration: Optional[int] = None
    easing: Optional[str] = None
    parameters: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.parameters is None:
            self.parameters = {}


@dataclass
class InteractionAnalysis:
    """Results of interaction comparison"""
    similarity_score: float  # 0-100%
    shared_patterns: List[str]
    unique_to_original: List[str]
    unique_to_copy: List[str]
    interaction_count_original: int
    interaction_count_copy: int
    verdict: str  # 'identical', 'similar', 'different'


class InteractionAnalyzer:
    """Analyzes and compares Webflow interactions"""
    
    def __init__(self):
        self.script_patterns = [
            r'webflow\.schunk\.[a-f0-9]+\.js',
            r'webflow\.[a-f0-9]+\.[a-f0-9]+\.js',
        ]
    
    async def extract_interactions(self, url: str) -> Tuple[List[WebflowInteraction], List[str]]:
        """
        Extract all interactions from a Webflow template
        Returns: (interactions, script_urls)
        """
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Track network requests for JS files
            js_files = []
            
            async def capture_js(route, request):
                url = request.url
                if '.js' in url and 'webflow' in url:
                    js_files.append(url)
                await route.continue_()
            
            await page.route("**/*.js", capture_js)
            
            # Load page
            await page.goto(url, wait_until='networkidle')
            
            # Get all script tags from HTML
            script_tags = await page.query_selector_all('script[src]')
            for tag in script_tags:
                src = await tag.get_attribute('src')
                if src and any(re.search(pattern, src) for pattern in self.script_patterns):
                    if src not in js_files:
                        js_files.append(src)
            
            # Extract Webflow.push data (contains interaction definitions)
            interactions = await self._extract_webflow_data(page)
            
            await browser.close()
            
            return interactions, js_files
    
    async def _extract_webflow_data(self, page: Page) -> List[WebflowInteraction]:
        """Extract Webflow interaction data from the page"""
        
        # Webflow stores interactions in window.Webflow or as Webflow.push() calls
        webflow_data = await page.evaluate("""
            () => {
                // Try to get Webflow data
                if (window.Webflow && window.Webflow.push) {
                    return window.Webflow.interactions || [];
                }
                
                // Try to extract from data attributes
                const elements = document.querySelectorAll('[data-w-id]');
                return Array.from(elements).map(el => ({
                    id: el.getAttribute('data-w-id'),
                    classes: el.className,
                    tag: el.tagName
                }));
            }
        """)
        
        interactions = []
        
        # Parse interaction data
        if isinstance(webflow_data, list):
            for item in webflow_data:
                if isinstance(item, dict):
                    interaction = self._parse_interaction_data(item)
                    if interaction:
                        interactions.append(interaction)
        
        return interactions
    
    def _parse_interaction_data(self, data: Dict[str, Any]) -> Optional[WebflowInteraction]:
        """Parse raw interaction data into structured format"""
        
        # Extract key fields
        trigger = data.get('trigger', 'unknown')
        action = data.get('action', 'unknown')
        target = data.get('target', data.get('id', 'unknown'))
        
        return WebflowInteraction(
            trigger=trigger,
            action=action,
            target=target,
            duration=data.get('duration'),
            easing=data.get('easing'),
            parameters=data.get('parameters', {})
        )
    
    async def extract_interaction_signatures(self, url: str) -> Dict[str, Any]:
        """
        Extract high-level interaction signatures without parsing JS
        This is faster and more reliable
        """
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            await page.goto(url, wait_until='networkidle')
            
            # Count elements with interaction attributes
            signature = await page.evaluate("""
                () => {
                    const stats = {
                        interactive_elements: 0,
                        animations: 0,
                        transitions: 0,
                        hover_effects: 0,
                        scroll_triggers: 0,
                        click_triggers: 0,
                        interaction_ids: []
                    };
                    
                    // Count data-w-id elements (Webflow interaction markers)
                    const interactiveElements = document.querySelectorAll('[data-w-id]');
                    stats.interactive_elements = interactiveElements.length;
                    stats.interaction_ids = Array.from(interactiveElements)
                        .map(el => el.getAttribute('data-w-id'))
                        .filter(id => id);
                    
                    // Count CSS animations
                    const allElements = document.querySelectorAll('*');
                    allElements.forEach(el => {
                        const style = window.getComputedStyle(el);
                        if (style.animation !== 'none') stats.animations++;
                        if (style.transition !== 'all 0s ease 0s') stats.transitions++;
                    });
                    
                    // Count interaction classes
                    const html = document.documentElement.outerHTML;
                    stats.hover_effects = (html.match(/hover:|:hover/g) || []).length;
                    stats.scroll_triggers = (html.match(/data-scroll|scroll-trigger/g) || []).length;
                    stats.click_triggers = (html.match(/data-click|click-trigger/g) || []).length;
                    
                    return stats;
                }
            """)
            
            await browser.close()
            
            return signature
    
    def compare_signatures(
        self,
        original_sig: Dict[str, Any],
        copy_sig: Dict[str, Any]
    ) -> InteractionAnalysis:
        """
        Compare interaction signatures between two templates
        """
        
        # Calculate similarity score
        orig_count = original_sig.get('interactive_elements', 0)
        copy_count = copy_sig.get('interactive_elements', 0)
        
        if orig_count == 0 and copy_count == 0:
            similarity = 100.0
        elif orig_count == 0 or copy_count == 0:
            similarity = 0.0
        else:
            # Compare interaction counts
            count_similarity = 1.0 - abs(orig_count - copy_count) / max(orig_count, copy_count)
            
            # Compare interaction types
            orig_ids = set(original_sig.get('interaction_ids', []))
            copy_ids = set(copy_sig.get('interaction_ids', []))
            
            if len(orig_ids) > 0 or len(copy_ids) > 0:
                id_overlap = len(orig_ids & copy_ids) / max(len(orig_ids | copy_ids), 1)
            else:
                id_overlap = 0.0
            
            # Weighted average
            similarity = (count_similarity * 0.6 + id_overlap * 0.4) * 100
        
        # Identify shared patterns
        shared = []
        if original_sig.get('animations', 0) > 0 and copy_sig.get('animations', 0) > 0:
            shared.append(f"CSS animations (orig: {original_sig['animations']}, copy: {copy_sig['animations']})")
        if original_sig.get('hover_effects', 0) > 0 and copy_sig.get('hover_effects', 0) > 0:
            shared.append(f"Hover effects (orig: {original_sig['hover_effects']}, copy: {copy_sig['hover_effects']})")
        if original_sig.get('scroll_triggers', 0) > 0 and copy_sig.get('scroll_triggers', 0) > 0:
            shared.append(f"Scroll triggers (orig: {original_sig['scroll_triggers']}, copy: {copy_sig['scroll_triggers']})")
        
        # Unique to original
        unique_orig = []
        if original_sig.get('interactive_elements', 0) > copy_sig.get('interactive_elements', 0):
            unique_orig.append(f"{original_sig['interactive_elements'] - copy_sig['interactive_elements']} more interactive elements")
        
        # Unique to copy
        unique_copy = []
        if copy_sig.get('interactive_elements', 0) > original_sig.get('interactive_elements', 0):
            unique_copy.append(f"{copy_sig['interactive_elements'] - original_sig['interactive_elements']} more interactive elements")
        
        # Determine verdict
        if similarity >= 85:
            verdict = 'identical'
        elif similarity >= 60:
            verdict = 'similar'
        else:
            verdict = 'different'
        
        return InteractionAnalysis(
            similarity_score=similarity,
            shared_patterns=shared,
            unique_to_original=unique_orig,
            unique_to_copy=unique_copy,
            interaction_count_original=orig_count,
            interaction_count_copy=copy_count,
            verdict=verdict
        )


async def test_interaction_analysis():
    """Test the interaction analyzer"""
    
    analyzer = InteractionAnalyzer()
    
    print("\n" + "="*80)
    print("WEBFLOW INTERACTION ANALYSIS TEST")
    print("="*80 + "\n")
    
    # Test on Visto template
    url = "https://visto-template.webflow.io/"
    print(f"Analyzing: {url}\n")
    
    signature = await analyzer.extract_interaction_signatures(url)
    
    print("Interaction Signature:")
    print(f"  • Interactive elements: {signature['interactive_elements']}")
    print(f"  • CSS animations: {signature['animations']}")
    print(f"  • Transitions: {signature['transitions']}")
    print(f"  • Hover effects: {signature['hover_effects']}")
    print(f"  • Scroll triggers: {signature['scroll_triggers']}")
    print(f"  • Click triggers: {signature['click_triggers']}")
    print(f"  • Interaction IDs: {len(signature['interaction_ids'])} unique")
    
    if signature['interaction_ids']:
        print(f"\n  First 5 IDs: {signature['interaction_ids'][:5]}")


if __name__ == "__main__":
    asyncio.run(test_interaction_analysis())
