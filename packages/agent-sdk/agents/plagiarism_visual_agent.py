#!/usr/bin/env python3
"""
Plagiarism Visual Analysis Agent
==================================

Multi-modal plagiarism detection combining:
- Vector similarity (code structure)
- Visual similarity (screenshot comparison)
- Section-level granularity

Solves the "Padelthon problem": detects visual plagiarism
even when code is reconstructed.
"""

import asyncio
import base64
import json
import os
import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple, Literal, Any
from pathlib import Path

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, Browser, Page
from PIL import Image
import io

from anthropic import Anthropic
import google.generativeai as genai


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class TemplateSection:
    """Represents a semantic section in a template"""
    id: str
    type: Literal['hero', 'features', 'testimonials', 'cta', 'footer', 'pricing', 'about', 'other']
    selector: str  # CSS selector to locate this section
    html: str
    offset_top: int  # Scroll position (pixels from top)
    height: int  # Section height in pixels
    screenshot_path: Optional[str] = None


@dataclass
class SectionComparison:
    """Comparison result for a pair of sections"""
    section_type: str
    vector_similarity: float  # 0-1
    visual_similarity: float  # 0-1
    html_similarity: float = 0.0  # 0-1
    css_similarity: float = 0.0  # 0-1
    pattern: Literal['copy_paste', 'reconstructed', 'shared_framework', 'different'] = 'different'
    confidence: float = 0.0
    evidence: str = ""


@dataclass
class PlagiarismAnalysisResult:
    """Final multi-modal analysis result"""
    verdict: Literal['major', 'minor', 'none']
    confidence: float
    sections_analyzed: int
    section_comparisons: List[SectionComparison]
    reasoning: str
    cost_estimate: float


# =============================================================================
# SECTION DETECTION
# =============================================================================

class SectionDetector:
    """Detects semantic sections in HTML"""
    
    SECTION_PATTERNS = {
        'hero': [
            ('section', {'class': re.compile(r'hero|banner|jumbotron', re.I)}),
            ('div', {'class': re.compile(r'hero|banner', re.I)}),
            ('header', {'class': re.compile(r'hero|main', re.I)}),
        ],
        'features': [
            ('section', {'class': re.compile(r'feature|service|benefit', re.I)}),
            ('div', {'class': re.compile(r'feature.*grid|service.*grid', re.I)}),
        ],
        'testimonials': [
            ('section', {'class': re.compile(r'testimonial|review|quote', re.I)}),
            ('div', {'class': re.compile(r'testimonial|review', re.I)}),
        ],
        'pricing': [
            ('section', {'class': re.compile(r'pricing|plan|package', re.I)}),
            ('div', {'class': re.compile(r'pricing.*table|plan.*grid', re.I)}),
        ],
        'cta': [
            ('section', {'class': re.compile(r'cta|call.*to.*action', re.I)}),
            ('div', {'class': re.compile(r'cta|signup|subscribe', re.I)}),
        ],
        'about': [
            ('section', {'class': re.compile(r'about|story|mission', re.I)}),
        ],
        'footer': [
            ('footer', {}),
            ('div', {'class': re.compile(r'footer', re.I)}),
        ],
    }
    
    def __init__(self, html: str):
        self.soup = BeautifulSoup(html, 'html.parser')
        self.sections: List[TemplateSection] = []
    
    def detect_sections(self) -> List[TemplateSection]:
        """Detect all semantic sections in the HTML"""
        
        detected = []
        detected_types = set()  # Track which types we've already found
        section_id = 0
        
        # Get all body elements for position calculation
        body = self.soup.find('body')
        all_elements = list(body.find_all(['section', 'div', 'header', 'footer'])) if body else []
        total_elements = len(all_elements)
        
        # Try to detect each section type
        for section_type, patterns in self.SECTION_PATTERNS.items():
            # Skip if we already detected this type
            if section_type in detected_types:
                continue
            
            found = False
            for tag, attrs in patterns:
                if found:
                    break
                elements = self.soup.find_all(tag, attrs)
                
                for elem in elements:
                    # Skip if already detected
                    if any(s.html == str(elem) for s in detected):
                        continue
                    
                    # Calculate element position in document
                    elem_index = all_elements.index(elem) if elem in all_elements else 0
                    position_ratio = elem_index / max(total_elements, 1)
                    
                    # Validate position for certain section types
                    if section_type == 'hero' and position_ratio > 0.3:
                        print(f"      ⚠️  Skipping '{section_type}' at position {position_ratio:.1%} (too far down)")
                        continue
                    if section_type == 'footer' and position_ratio < 0.7:
                        print(f"      ⚠️  Skipping '{section_type}' at position {position_ratio:.1%} (too far up)")
                        continue
                    
                    # Generate CSS selector
                    selector = self._generate_selector(elem)
                    
                    # Estimate position (simplified)
                    offset_top = section_id * 800  # Rough estimate
                    height = 600  # Default height
                    
                    # Get text preview for debugging
                    text_preview = elem.get_text(strip=True)[:100] if elem else ""
                    
                    section = TemplateSection(
                        id=f"section_{section_id}",
                        type=section_type,
                        selector=selector,
                        html=str(elem)[:1000],  # Truncate for storage
                        offset_top=offset_top,
                        height=height
                    )
                    
                    print(f"      ✓ Detected {section_type} at {position_ratio:.1%}: {selector} | {text_preview[:50]}...")
                    
                    detected.append(section)
                    detected_types.add(section_type)  # Mark this type as found
                    section_id += 1
                    found = True
                    break  # Only first match per type
        
        # If no sections detected, create generic ones
        if not detected:
            detected = self._detect_generic_sections()
        
        self.sections = detected
        return detected
    
    def _generate_selector(self, element) -> str:
        """Generate a CSS selector for the element"""
        # Try ID first
        if element.get('id'):
            return f"#{element['id']}"
        
        # Try unique class
        if element.get('class'):
            classes = ' '.join(element['class'])
            return f".{element['class'][0]}"
        
        # Fall back to tag name with index
        tag = element.name
        siblings = element.find_previous_siblings(tag)
        index = len(siblings)
        return f"{tag}:nth-of-type({index + 1})"
    
    def _detect_generic_sections(self) -> List[TemplateSection]:
        """Fallback: detect generic sections if patterns fail"""
        sections = []
        
        # Find all top-level sections/divs
        top_elements = self.soup.find_all(['section', 'div'], recursive=False)
        
        for i, elem in enumerate(top_elements[:10]):  # Limit to 10
            section = TemplateSection(
                id=f"section_{i}",
                type='other',
                selector=self._generate_selector(elem),
                html=str(elem)[:1000],
                offset_top=i * 800,
                height=600
            )
            sections.append(section)
        
        return sections


# =============================================================================
# SCREENSHOT CAPTURE
# =============================================================================

class ScreenshotCapture:
    """Captures screenshots of template sections using Playwright"""
    
    def __init__(self, output_dir: str = "./screenshots"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.browser: Optional[Browser] = None
    
    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        return self
    
    async def __aexit__(self, *args):
        if self.browser:
            await self.browser.close()
        await self.playwright.stop()
    
    async def capture_section(
        self,
        url: str,
        section: TemplateSection,
        template_id: str
    ) -> str:
        """Capture screenshot of a specific section"""
        
        if not self.browser:
            raise RuntimeError("Browser not initialized. Use async with context.")
        
        page = await self.browser.new_page(
            viewport={'width': 1920, 'height': 1080}
        )
        
        try:
            # Navigate to page
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Wait for section to be visible
            try:
                await page.wait_for_selector(section.selector, timeout=5000)
            except:
                print(f"Warning: Selector '{section.selector}' not found, using fallback")
                # Fallback: scroll to approximate position
                await page.evaluate(f"window.scrollTo(0, {section.offset_top})")
                await page.wait_for_timeout(1000)
            
            # Scroll section into view
            try:
                await page.evaluate(f"""
                    const element = document.querySelector('{section.selector}');
                    if (element) {{
                        element.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
                    }}
                """)
                await page.wait_for_timeout(1000)  # Wait for scroll
            except:
                pass
            
            # Capture section screenshot
            screenshot_filename = f"{template_id}_{section.type}_{section.id}.png"
            screenshot_path = self.output_dir / screenshot_filename
            
            try:
                # Try to screenshot the specific element
                element = await page.query_selector(section.selector)
                if element:
                    await element.screenshot(path=str(screenshot_path))
                else:
                    # Fallback: screenshot viewport at scroll position
                    await page.screenshot(path=str(screenshot_path))
            except:
                # Final fallback: full viewport
                await page.screenshot(path=str(screenshot_path))
            
            section.screenshot_path = str(screenshot_path)
            return str(screenshot_path)
        
        finally:
            await page.close()
    
    async def capture_full_page(self, url: str, template_id: str) -> str:
        """Capture full page screenshot"""
        
        if not self.browser:
            raise RuntimeError("Browser not initialized")
        
        page = await self.browser.new_page(
            viewport={'width': 1920, 'height': 1080}
        )
        
        try:
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            screenshot_path = self.output_dir / f"{template_id}_full.png"
            await page.screenshot(path=str(screenshot_path), full_page=True)
            
            return str(screenshot_path)
        
        finally:
            await page.close()


# =============================================================================
# VISUAL COMPARISON
# =============================================================================

class VisualComparator:
    """Compares screenshots using vision models"""
    
    def __init__(self, provider: Literal['claude', 'gemini'] = 'claude'):
        self.provider_name = provider
        
        if provider == 'claude':
            self.client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            # Use Claude Sonnet 4 from the provider config
            self.model = "claude-sonnet-4-20250514"
        else:
            genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
            self.client = genai.GenerativeModel('gemini-2.0-flash-exp')
            self.model = "gemini-2.0-flash-exp"
    
    def _encode_image(self, image_path: str) -> str:
        """Encode image to base64"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    async def compare_sections(
        self,
        screenshot1_path: str,
        screenshot2_path: str,
        section_type: str
    ) -> Tuple[float, str]:
        """
        Compare two section screenshots visually
        
        Returns:
            (similarity_score, explanation)
            similarity_score: 0-1 (0 = different, 1 = identical)
        """
        
        img1_base64 = self._encode_image(screenshot1_path)
        img2_base64 = self._encode_image(screenshot2_path)
        
        prompt = f"""Compare these two {section_type} sections from different templates.

Analyze the following aspects:
1. **Layout Structure**: Grid systems, element positioning, spacing
2. **Visual Hierarchy**: Typography sizes, heading prominence, content flow
3. **Design Elements**: Icons, images, buttons, cards
4. **Color Scheme**: Primary colors, backgrounds, accents
5. **Spacing & Alignment**: Margins, padding, gutters, alignment patterns
6. **Interactive Elements**: Buttons, links, forms (style and placement)

Focus on VISUAL APPEARANCE, not code. Even if implemented differently,
similar visual output indicates copying.

Return your analysis in this exact JSON format:
{{
  "similarity_score": <number 0-100>,
  "layout_match": <boolean>,
  "visual_elements_match": <boolean>,
  "spacing_match": <boolean>,
  "evidence": "<specific similarities found>",
  "differences": "<specific differences found>"
}}

Scoring guide:
- 90-100: Nearly identical layouts (clear copying)
- 70-89: Highly similar with minor variations
- 50-69: Some shared patterns
- 0-49: Different designs
"""
        
        # Call vision API based on provider
        if self.provider_name == 'claude':
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=0,
                messages=[{
                    'role': 'user',
                    'content': [
                        {
                            'type': 'image',
                            'source': {
                                'type': 'base64',
                                'media_type': 'image/png',
                                'data': img1_base64
                            }
                        },
                        {
                            'type': 'image',
                            'source': {
                                'type': 'base64',
                                'media_type': 'image/png',
                                'data': img2_base64
                            }
                        },
                        {'type': 'text', 'text': prompt}
                    ]
                }]
            )
            response_text = response.content[0].text
        else:
            # Gemini vision
            response = self.client.generate_content([
                prompt,
                Image.open(screenshot1_path),
                Image.open(screenshot2_path)
            ])
            response_text = response.text
        
        # Parse JSON response
        try:
            # Extract JSON from markdown code blocks if present
            if '```json' in response_text:
                json_str = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                json_str = response_text.split('```')[1].split('```')[0].strip()
            else:
                json_str = response_text
            
            result = json.loads(json_str)
            
            similarity = result['similarity_score'] / 100  # Convert to 0-1
            evidence = f"{result['evidence']}\n\nDifferences: {result['differences']}"
            
            return similarity, evidence
        
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error parsing visual comparison response: {e}")
            print(f"Response: {response_text}")
            
            # Fallback: extract number from text
            numbers = re.findall(r'\b\d+\b', response_text)
            if numbers:
                similarity = int(numbers[0]) / 100
                return similarity, response_text
            
            return 0.5, "Error parsing response"


# =============================================================================
# MULTI-MODAL ANALYZER
# =============================================================================

class MultiModalPlagiarismAnalyzer:
    """Combines vector and visual analysis for comprehensive detection"""
    
    def __init__(
        self,
        vision_provider: Literal['claude', 'gemini'] = 'claude',
        screenshot_dir: str = "./screenshots",
        worker_url: str = None
    ):
        self.screenshot_capture = ScreenshotCapture(screenshot_dir)
        self.visual_comparator = VisualComparator(vision_provider)
        self.worker_url = worker_url or os.getenv('PLAGIARISM_WORKER_URL', 'https://plagiarism-agent.workers.dev')
    
    async def get_vector_similarity(self, url1: str, url2: str) -> Dict[str, Any]:
        """
        Query Cloudflare Worker for vector similarity using Vectorize embeddings
        Returns detailed similarity breakdown or falls back to local computation
        """
        
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                # Call Worker API endpoint
                async with session.post(
                    f'{self.worker_url}/api/compare',
                    json={
                        'originalUrl': url1,
                        'allegedCopyUrl': url2
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        
                        # Extract vector similarities from response
                        return {
                            'overall': data.get('vectorSimilarity', {}).get('overall', 0),
                            'html': data.get('vectorSimilarity', {}).get('html_similarity', 0),
                            'css': data.get('vectorSimilarity', {}).get('css_similarity', 0),
                            'js': data.get('vectorSimilarity', {}).get('js_similarity', 0),
                            'source': 'vectorize'
                        }
                    else:
                        print(f"   ⚠️  Worker API returned {response.status}, using local computation")
                        return None
                        
        except Exception as e:
            print(f"   ⚠️  Vector API unavailable ({str(e)}), using local computation")
            return None
    
    def extract_html_structure(self, html: str) -> Dict[str, Any]:
        """Extract HTML structural features for comparison"""
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove script and style tags for cleaner analysis
        for tag in soup(['script', 'style']):
            tag.decompose()
        
        # Extract structural features
        all_tags = soup.find_all()
        
        # Tag sequence (first 100 tags)
        tag_sequence = [tag.name for tag in all_tags[:100]]
        
        # Class usage frequency
        classes = []
        for tag in all_tags:
            if tag.get('class'):
                classes.extend(tag['class'])
        
        class_freq = {}
        for cls in classes:
            class_freq[cls] = class_freq.get(cls, 0) + 1
        
        # ID usage
        ids = [tag.get('id') for tag in all_tags if tag.get('id')]
        
        # Calculate nesting depth
        max_depth = 0
        for tag in all_tags:
            depth = len(list(tag.parents))
            max_depth = max(max_depth, depth)
        
        return {
            'tag_sequence': tag_sequence,
            'class_frequency': class_freq,
            'ids': ids,
            'max_depth': max_depth,
            'total_elements': len(all_tags),
            'unique_tags': list(set(tag.name for tag in all_tags))
        }
    
    def compare_html_structure(self, orig: Dict[str, Any], copy: Dict[str, Any]) -> float:
        """Compare HTML structural similarity (0-1)"""
        
        # Tag sequence similarity (using Jaccard on first 100 tags)
        orig_tags = set(orig['tag_sequence'])
        copy_tags = set(copy['tag_sequence'])
        
        if not orig_tags and not copy_tags:
            tag_sim = 1.0
        elif not orig_tags or not copy_tags:
            tag_sim = 0.0
        else:
            tag_sim = len(orig_tags & copy_tags) / len(orig_tags | copy_tags)
        
        # Class overlap similarity
        orig_classes = set(orig['class_frequency'].keys())
        copy_classes = set(copy['class_frequency'].keys())
        
        if not orig_classes and not copy_classes:
            class_sim = 1.0
        elif not orig_classes or not copy_classes:
            class_sim = 0.0
        else:
            class_sim = len(orig_classes & copy_classes) / len(orig_classes | copy_classes)
        
        # Element count similarity
        orig_count = orig['total_elements']
        copy_count = copy['total_elements']
        
        if orig_count == 0 and copy_count == 0:
            count_sim = 1.0
        else:
            count_sim = 1.0 - abs(orig_count - copy_count) / max(orig_count, copy_count)
        
        # Weighted average
        similarity = (tag_sim * 0.4 + class_sim * 0.4 + count_sim * 0.2)
        
        return similarity
    
    def extract_css_patterns(self, html: str) -> Dict[str, Any]:
        """Extract CSS patterns from HTML for comparison"""
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract all classes used
        classes = set()
        for tag in soup.find_all():
            if tag.get('class'):
                classes.update(tag['class'])
        
        # Extract inline styles
        inline_styles = []
        for tag in soup.find_all(style=True):
            inline_styles.append(tag['style'])
        
        # Extract style property patterns from inline styles
        style_properties = set()
        for style in inline_styles:
            # Simple parsing of CSS properties
            props = style.split(';')
            for prop in props:
                if ':' in prop:
                    property_name = prop.split(':')[0].strip()
                    style_properties.add(property_name)
        
        return {
            'classes': classes,
            'inline_styles': inline_styles,
            'style_properties': style_properties,
            'class_count': len(classes),
            'inline_style_count': len(inline_styles)
        }
    
    def compare_css_patterns(self, orig: Dict[str, Any], copy: Dict[str, Any]) -> float:
        """Compare CSS pattern similarity (0-1)"""
        
        # Class overlap
        orig_classes = orig['classes']
        copy_classes = copy['classes']
        
        if not orig_classes and not copy_classes:
            class_sim = 1.0
        elif not orig_classes or not copy_classes:
            class_sim = 0.0
        else:
            class_sim = len(orig_classes & copy_classes) / len(orig_classes | copy_classes)
        
        # Style property overlap
        orig_props = orig['style_properties']
        copy_props = copy['style_properties']
        
        if not orig_props and not copy_props:
            prop_sim = 1.0
        elif not orig_props or not copy_props:
            prop_sim = 0.0
        else:
            prop_sim = len(orig_props & copy_props) / len(orig_props | copy_props)
        
        # Weighted average (classes more important)
        similarity = (class_sim * 0.7 + prop_sim * 0.3)
        
        return similarity
    
    async def extract_interaction_signature(self, url: str) -> Dict[str, Any]:
        """
        Extract Webflow interaction signature from a template
        Returns interaction counts and patterns without parsing JS
        """
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
            
            await page.goto(url, wait_until='networkidle')
            
            # Extract interaction signature
            signature = await page.evaluate("""
                () => {
                    const stats = {
                        interactive_elements: 0,
                        animations: 0,
                        transitions: 0,
                        hover_effects: 0,
                        scroll_triggers: 0,
                        click_triggers: 0,
                        interaction_ids: [],
                        webflow_scripts: [],
                        section_interactions: {}  // NEW: Per-section interaction data
                    };
                    
                    // Count data-w-id elements (Webflow interaction markers)
                    const interactiveElements = document.querySelectorAll('[data-w-id]');
                    stats.interactive_elements = interactiveElements.length;
                    stats.interaction_ids = Array.from(interactiveElements)
                        .map(el => el.getAttribute('data-w-id'))
                        .filter(id => id);
                    
                    // Count CSS animations and transitions
                    const allElements = document.querySelectorAll('*');
                    let animCount = 0, transCount = 0;
                    allElements.forEach(el => {
                        const style = window.getComputedStyle(el);
                        if (style.animation && style.animation !== 'none') animCount++;
                        if (style.transition && style.transition !== 'all 0s ease 0s') transCount++;
                    });
                    stats.animations = animCount;
                    stats.transitions = transCount;
                    
                    // Count interaction patterns in HTML
                    const html = document.documentElement.outerHTML;
                    stats.hover_effects = (html.match(/hover:|:hover/g) || []).length;
                    stats.scroll_triggers = (html.match(/data-scroll|scroll-trigger/g) || []).length;
                    stats.click_triggers = (html.match(/data-click|click-trigger|onclick/g) || []).length;
                    
                    // Find Webflow script files
                    const scripts = Array.from(document.querySelectorAll('script[src]'));
                    stats.webflow_scripts = scripts
                        .map(s => s.src)
                        .filter(src => src && src.includes('webflow'))
                        .map(src => src.split('/').pop());
                    
                    // NEW: Extract per-section interaction patterns
                    const detectSectionInteractions = (selector) => {
                        const section = document.querySelector(selector);
                        if (!section) return null;
                        
                        const sectionInteractives = section.querySelectorAll('[data-w-id]');
                        const sectionIds = Array.from(sectionInteractives).map(el => el.getAttribute('data-w-id'));
                        
                        return {
                            interactive_count: sectionInteractives.length,
                            interaction_ids: sectionIds,
                            has_animations: Array.from(section.querySelectorAll('*')).some(el => {
                                const style = window.getComputedStyle(el);
                                return style.animation && style.animation !== 'none';
                            }),
                            has_transitions: Array.from(section.querySelectorAll('*')).some(el => {
                                const style = window.getComputedStyle(el);
                                return style.transition && style.transition !== 'all 0s ease 0s';
                            })
                        };
                    };
                    
                    // Try to detect interactions for common section patterns
                    const sectionPatterns = {
                        'hero': ['section.hero', '[class*="hero"]', 'header.hero', '.hero-stacked-wrapper', '.section.hero'],
                        'footer': ['footer', '[class*="footer"]', '.footer-video'],
                        'cta': ['section.cta', '[class*="cta"]', '.cta-wrapper'],
                        'testimonials': ['section.testimonials', '[class*="testimonial"]', '.testimonial-mask']
                    };
                    
                    for (const [type, selectors] of Object.entries(sectionPatterns)) {
                        for (const selector of selectors) {
                            const interactions = detectSectionInteractions(selector);
                            if (interactions && interactions.interactive_count > 0) {
                                stats.section_interactions[type] = interactions;
                                break;
                            }
                        }
                    }
                    
                    return stats;
                }
            """)
            
            await browser.close()
            
            return signature
    
    def compare_interactions(
        self,
        original_sig: Dict[str, Any],
        copy_sig: Dict[str, Any]
    ) -> Tuple[float, str]:
        """
        Compare interaction signatures and return similarity score
        Returns: (similarity_percentage, verdict)
        """
        
        orig_count = original_sig.get('interactive_elements', 0)
        copy_count = copy_sig.get('interactive_elements', 0)
        
        if orig_count == 0 and copy_count == 0:
            return 0.0, "neither template has interactions"
        
        if orig_count == 0 or copy_count == 0:
            diff = abs(orig_count - copy_count)
            return 0.0, f"one template has {diff} interactions, the other has none"
        
        # Calculate similarity based on interaction counts
        count_similarity = 1.0 - abs(orig_count - copy_count) / max(orig_count, copy_count)
        
        # Compare interaction IDs (exact matches suggest copy-paste)
        orig_ids = set(original_sig.get('interaction_ids', []))
        copy_ids = set(copy_sig.get('interaction_ids', []))
        
        if len(orig_ids) > 0 or len(copy_ids) > 0:
            shared_ids = orig_ids & copy_ids
            all_ids = orig_ids | copy_ids
            id_overlap = len(shared_ids) / len(all_ids) if all_ids else 0
            
            if len(shared_ids) > 0:
                verdict = f"CRITICAL: {len(shared_ids)} identical interaction IDs (likely copy-paste)"
            else:
                verdict = f"different interaction IDs ({len(orig_ids)} vs {len(copy_ids)})"
        else:
            id_overlap = 0.0
            verdict = "no interaction IDs to compare"
        
        # Weighted similarity
        similarity = (count_similarity * 0.4 + id_overlap * 0.6) * 100
        
        return similarity, verdict
    
    async def analyze(
        self,
        original_url: str,
        alleged_copy_url: str,
        original_id: str = "original",
        copy_id: str = "copy"
    ) -> PlagiarismAnalysisResult:
        """
        Perform comprehensive multi-modal plagiarism analysis
        
        Args:
            original_url: URL of the original template
            alleged_copy_url: URL of the alleged copy
            original_id: Identifier for original
            copy_id: Identifier for copy
        
        Returns:
            PlagiarismAnalysisResult with verdict and evidence
        """
        
        print(f"🔍 Analyzing: {original_id} vs {copy_id}")
        
        async with self.screenshot_capture as capture:
            # Step 1: Fetch and parse HTML
            print("📄 Fetching HTML...")
            original_html = await self._fetch_html(original_url)
            copy_html = await self._fetch_html(alleged_copy_url)
            
            # Step 1.5: Get vector similarity from Vectorize (if available)
            print("🔍 Querying vector database...")
            vector_result = await self.get_vector_similarity(original_url, alleged_copy_url)
            
            if vector_result:
                # Use Vectorize embeddings
                print(f"   ✅ Vector database: {vector_result['overall']:.1%} similar (from embeddings)")
                vector_similarity_overall = vector_result['overall']
                vector_html = vector_result['html']
                vector_css = vector_result['css']
            else:
                # Fall back to local HTML/CSS analysis
                print("   📊 Computing local similarity (vector DB unavailable)...")
                vector_similarity_overall = None
                vector_html = None
                vector_css = None
            
            # Step 1.6: Extract HTML structure and CSS patterns (always do local analysis)
            print("🔍 Analyzing HTML structure and CSS...")
            orig_html_structure = self.extract_html_structure(original_html)
            copy_html_structure = self.extract_html_structure(copy_html)
            
            orig_css_patterns = self.extract_css_patterns(original_html)
            copy_css_patterns = self.extract_css_patterns(copy_html)
            
            # Calculate overall HTML and CSS similarity
            html_similarity = self.compare_html_structure(orig_html_structure, copy_html_structure)
            css_similarity = self.compare_css_patterns(orig_css_patterns, copy_css_patterns)
            
            print(f"   HTML Structure: {html_similarity:.1%} similar (local)")
            print(f"   CSS Patterns: {css_similarity:.1%} similar (local)")
            
            # Use vector similarity if available, otherwise use local
            if vector_similarity_overall is not None:
                print(f"   💡 Using vector embeddings for similarity scores")
            
            # Step 2: Detect sections
            print("🔍 Detecting sections...")
            original_detector = SectionDetector(original_html)
            copy_detector = SectionDetector(copy_html)
            
            original_sections = original_detector.detect_sections()
            copy_sections = copy_detector.detect_sections()
            
            print(f"   Original: {len(original_sections)} sections")
            print(f"   Copy: {len(copy_sections)} sections")
            
            # Step 3: Match sections by type
            section_pairs = self._match_sections(original_sections, copy_sections)
            print(f"   Matched: {len(section_pairs)} section pairs")
            
            # Step 4: Capture screenshots for matched sections
            print("📸 Capturing screenshots...")
            comparisons = []
            
            for orig_section, copy_section in section_pairs:
                # Validate we're comparing same types
                if orig_section.type != copy_section.type:
                    print(f"   ⚠️  Section type mismatch: {orig_section.type} vs {copy_section.type}")
                    continue
                
                print(f"   Capturing: {orig_section.type} ({orig_section.id} ↔ {copy_section.id})")
                
                try:
                    # Capture both sections
                    await capture.capture_section(original_url, orig_section, original_id)
                    await capture.capture_section(alleged_copy_url, copy_section, copy_id)
                    
                    if not orig_section.screenshot_path or not copy_section.screenshot_path:
                        print(f"   ⚠️  Screenshot capture failed for {orig_section.type}")
                        continue
                    
                    # Visual comparison
                    print(f"   Comparing: {orig_section.type}")
                    print(f"      Original: {orig_section.screenshot_path}")
                    print(f"      Copy:     {copy_section.screenshot_path}")
                    visual_sim, evidence = await self.visual_comparator.compare_sections(
                        orig_section.screenshot_path,
                        copy_section.screenshot_path,
                        orig_section.type
                    )
                    
                    # Use vector similarity from database or compute locally
                    if vector_similarity_overall is not None:
                        # Use vector database result
                        vector_sim = vector_similarity_overall
                    else:
                        # Use local HTML/CSS similarity as proxy for vector similarity
                        vector_sim = (html_similarity + css_similarity) / 2
                    
                    # Determine pattern
                    pattern = self._determine_pattern(vector_sim, visual_sim)
                    
                    comparison = SectionComparison(
                        section_type=orig_section.type,
                        vector_similarity=vector_sim,
                        visual_similarity=visual_sim,
                        html_similarity=html_similarity,  # Overall HTML similarity
                        css_similarity=css_similarity,     # Overall CSS similarity
                        pattern=pattern,
                        confidence=min(vector_sim, visual_sim),
                        evidence=evidence
                    )
                    
                    comparisons.append(comparison)
                    
                    print(f"   ✅ {orig_section.type}: Visual={visual_sim:.2%}, Pattern={pattern}")
                
                except Exception as e:
                    print(f"   ❌ Error comparing {orig_section.type}: {e}")
                    continue
            
            # Step 5: Analyze interactions (global and per-section)
            print("🎭 Analyzing interactions...")
            try:
                orig_interactions = await self.extract_interaction_signature(original_url)
                copy_interactions = await self.extract_interaction_signature(alleged_copy_url)
                
                # Global interaction similarity
                interaction_similarity, interaction_verdict = self.compare_interactions(
                    orig_interactions,
                    copy_interactions
                )
                
                print(f"   Global - Original: {orig_interactions['interactive_elements']} interactive elements")
                print(f"   Global - Copy: {copy_interactions['interactive_elements']} interactive elements")
                print(f"   Global Similarity: {interaction_similarity:.1f}%")
                
                # CRITICAL: Check for section-level convergence
                # When BOTH layout AND interactions are similar in the same section
                convergent_sections = []
                for comparison in comparisons:
                    section_type = comparison.section_type
                    
                    # Get interaction data for this section type
                    orig_section_interactions = orig_interactions.get('section_interactions', {}).get(section_type)
                    copy_section_interactions = copy_interactions.get('section_interactions', {}).get(section_type)
                    
                    if orig_section_interactions and copy_section_interactions:
                        # Check for interaction similarity in this specific section
                        orig_ids = set(orig_section_interactions.get('interaction_ids', []))
                        copy_ids = set(copy_section_interactions.get('interaction_ids', []))
                        shared_ids = orig_ids & copy_ids
                        
                        section_interaction_sim = 0.0
                        if orig_ids or copy_ids:
                            section_interaction_sim = len(shared_ids) / len(orig_ids | copy_ids) if (orig_ids | copy_ids) else 0
                        
                        # CONVERGENCE: High visual similarity + interaction similarity in same section
                        if comparison.visual_similarity > 0.60 and section_interaction_sim > 0.30:
                            convergent_sections.append({
                                'section': section_type,
                                'visual_sim': comparison.visual_similarity,
                                'interaction_sim': section_interaction_sim,
                                'shared_ids': len(shared_ids),
                                'convergence_score': (comparison.visual_similarity + section_interaction_sim) / 2
                            })
                            print(f"   🎯 CONVERGENCE in {section_type}: Visual={comparison.visual_similarity:.1%}, Interaction={section_interaction_sim:.1%}")
                            
                            # Add convergence note to comparison
                            comparison.evidence += f"\n\n⚠️ CONVERGENCE DETECTED: This section shows both visual similarity ({comparison.visual_similarity:.1%}) AND interaction pattern similarity ({section_interaction_sim:.1%}). The combination suggests intentional copying of both layout and behavior."
                
                print(f"   Convergent sections: {len(convergent_sections)}")
                
            except Exception as e:
                print(f"   ⚠️ Interaction analysis failed: {e}")
                interaction_similarity = 0.0
                interaction_verdict = f"analysis failed: {str(e)}"
                convergent_sections = []
            
            # Step 6: Generate verdict (considering visual, interaction, and CONVERGENCE)
            verdict, confidence, reasoning = self._generate_verdict(
                comparisons,
                interaction_similarity,
                interaction_verdict,
                convergent_sections
            )
            
            # Step 7: Calculate cost (rough estimate)
            cost = len(comparisons) * 0.015  # ~$0.015 per visual comparison
            
            result = PlagiarismAnalysisResult(
                verdict=verdict,
                confidence=confidence,
                sections_analyzed=len(comparisons),
                section_comparisons=comparisons,
                reasoning=reasoning + f"\n\nInteraction Analysis: {interaction_verdict} ({interaction_similarity:.1f}% similar)",
                cost_estimate=cost
            )
            
            return result
    
    async def _fetch_html(self, url: str) -> str:
        """Fetch HTML from URL"""
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                return await response.text()
    
    def _match_sections(
        self,
        original_sections: List[TemplateSection],
        copy_sections: List[TemplateSection]
    ) -> List[Tuple[TemplateSection, TemplateSection]]:
        """Match sections by type for comparison"""
        
        pairs = []
        used_copy_sections = set()
        
        for orig in original_sections:
            # Find matching section type in copy that hasn't been used
            for copy in copy_sections:
                if copy.type == orig.type and copy.id not in used_copy_sections:
                    pairs.append((orig, copy))
                    used_copy_sections.add(copy.id)
                    print(f"      Matched: {orig.type} (orig:{orig.id}) ↔ {copy.type} (copy:{copy.id})")
                    break
        
        return pairs
    
    def _determine_pattern(
        self,
        vector_sim: float,
        visual_sim: float
    ) -> Literal['copy_paste', 'reconstructed', 'shared_framework', 'different']:
        """Determine plagiarism pattern based on similarities"""
        
        if vector_sim > 0.85 and visual_sim > 0.85:
            return 'copy_paste'
        elif vector_sim < 0.70 and visual_sim > 0.85:
            return 'reconstructed'  # KEY: Padelthon case!
        elif vector_sim > 0.70 and visual_sim < 0.70:
            return 'shared_framework'
        else:
            return 'different'
    
    def _generate_verdict(
        self,
        comparisons: List[SectionComparison],
        interaction_similarity: float = 0.0,
        interaction_verdict: str = "",
        convergent_sections: List[Dict[str, Any]] = None
    ) -> Tuple[Literal['major', 'minor', 'none'], float, str]:
        """Generate final verdict from section comparisons, interactions, and convergence analysis"""
        
        if not comparisons:
            return 'none', 1.0, "No sections could be compared"
        
        if convergent_sections is None:
            convergent_sections = []
        
        # Count patterns
        reconstructed = [c for c in comparisons if c.pattern == 'reconstructed' and c.visual_similarity > 0.85]
        copy_paste = [c for c in comparisons if c.pattern == 'copy_paste']
        
        # Calculate average visual similarity
        avg_visual_sim = sum(c.visual_similarity for c in comparisons) / len(comparisons)
        
        # Check for critical interaction copying (shared interaction IDs)
        critical_interaction_copy = "identical interaction" in interaction_verdict.lower() or interaction_similarity >= 99.0
        
        # Calculate HTML and CSS similarity from sections
        html_similarities = [c.html_similarity for c in comparisons if c.html_similarity > 0]
        css_similarities = [c.css_similarity for c in comparisons if c.css_similarity > 0]
        avg_html_sim = sum(html_similarities) / len(html_similarities) if html_similarities else 0
        avg_css_sim = sum(css_similarities) / len(css_similarities) if css_similarities else 0
        
        # PERFECT CLONE DETECTION: If HTML + CSS + Interactions all very high
        perfect_clone = (
            avg_html_sim > 0.95 and 
            avg_css_sim > 0.95 and 
            interaction_similarity > 95.0 and
            avg_visual_sim > 0.90
        )
        
        # CONVERGENCE DETECTION: The key insight from the user
        # When BOTH layout AND interactions are similar in the same section,
        # that's stronger evidence than either dimension alone
        high_convergence = [c for c in convergent_sections if c['convergence_score'] > 0.70]
        medium_convergence = [c for c in convergent_sections if 0.50 < c['convergence_score'] <= 0.70]
        
        # Determine verdict (multi-dimensional convergence)
        if perfect_clone or len(high_convergence) >= 2 or len(reconstructed) >= 3 or len(copy_paste) >= 2 or (critical_interaction_copy and interaction_similarity > 80):
            verdict = 'major'
            confidence = avg_visual_sim
            
            convergence_note = ""
            if len(high_convergence) > 0:
                convergence_note = f"\n\n🎯 CRITICAL CONVERGENCE DETECTED:\n"
                for conv in high_convergence:
                    convergence_note += f"  • {conv['section']}: {conv['convergence_score']:.1%} convergence (Visual: {conv['visual_sim']:.1%}, Interactions: {conv['interaction_sim']:.1%})\n"
                convergence_note += "\nWhen both layout patterns AND interaction patterns are similar in the same sections,\nthis indicates intentional copying of both design and behavior - not coincidence."
            
            interaction_note = f"\n- Global interaction similarity: {interaction_similarity:.1f}%" if interaction_similarity > 0 else ""
            if critical_interaction_copy:
                interaction_note += " ⚠️ CRITICAL: Identical interaction IDs detected (copy-paste)"
            
            # Multi-dimensional similarity note
            code_note = ""
            if avg_html_sim > 0 or avg_css_sim > 0:
                code_note = f"\n- HTML structure: {avg_html_sim:.1%} similar"
                code_note += f"\n- CSS patterns: {avg_css_sim:.1%} similar"
            
            if perfect_clone:
                code_note += "\n\n🚨 PERFECT CLONE DETECTED: All dimensions (HTML, CSS, Visual, Interactions) show near-identical patterns"
            
            reasoning = f"""MAJOR VIOLATION detected:
- {len(reconstructed)} sections show reconstructed plagiarism (low code similarity, high visual similarity)
- {len(copy_paste)} sections show copy-paste plagiarism
- {len(high_convergence)} sections show high convergence (layout + interactions similar)
- Average visual similarity: {avg_visual_sim:.1%}{code_note}{interaction_note}{convergence_note}

Reconstructed sections: {', '.join(c.section_type for c in reconstructed)}
This pattern indicates the designer recreated the visual design with different code.
"""
        elif len(medium_convergence) >= 1 or len(reconstructed) >= 1 or len(copy_paste) >= 1 or (interaction_similarity > 70):
            verdict = 'minor'
            confidence = avg_visual_sim
            
            convergence_note = ""
            if len(medium_convergence) > 0 or len(high_convergence) > 0:
                all_convergence = high_convergence + medium_convergence
                convergence_note = f"\n- {len(all_convergence)} sections show pattern convergence (layout + interaction similarity)"
            
            interaction_note = f"\n- Global interaction similarity: {interaction_similarity:.1f}%" if interaction_similarity > 0 else ""
            reasoning = f"""MINOR violation detected:
- {len(reconstructed) + len(copy_paste)} sections show similarity
- Some visual overlap detected{interaction_note}{convergence_note}
- May indicate inspiration rather than direct copying
"""
        else:
            verdict = 'none'
            confidence = 1.0 - avg_visual_sim
            interaction_note = f"\n- Global interaction similarity: {interaction_similarity:.1f}% (different)" if interaction_similarity > 0 else ""
            convergence_note = f"\n- {len(convergent_sections)} sections with any convergence (below thresholds)" if convergent_sections else ""
            reasoning = f"""NO VIOLATION:
- No significant visual or structural similarities{interaction_note}{convergence_note}
- Average visual similarity: {avg_visual_sim:.1%}
- Templates are sufficiently distinct
"""
        
        return verdict, confidence, reasoning


# =============================================================================
# CLI INTERFACE
# =============================================================================

async def main():
    """Test the multi-modal plagiarism analyzer"""
    
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Multi-modal template plagiarism analysis'
    )
    parser.add_argument('original_url', help='URL of original template')
    parser.add_argument('copy_url', help='URL of alleged copy')
    parser.add_argument('--original-id', default='original', help='ID for original template')
    parser.add_argument('--copy-id', default='copy', help='ID for alleged copy')
    parser.add_argument('--provider', choices=['claude', 'gemini'], default='claude',
                       help='Vision model provider')
    parser.add_argument('--output', default='./screenshots', help='Screenshot output directory')
    
    args = parser.parse_args()
    
    # Run analysis
    analyzer = MultiModalPlagiarismAnalyzer(
        vision_provider=args.provider,
        screenshot_dir=args.output
    )
    
    result = await analyzer.analyze(
        original_url=args.original_url,
        alleged_copy_url=args.copy_url,
        original_id=args.original_id,
        copy_id=args.copy_id
    )
    
    # Print results
    print("\n" + "=" * 80)
    print("MULTI-MODAL PLAGIARISM ANALYSIS RESULTS")
    print("=" * 80)
    print(f"\n🎯 VERDICT: {result.verdict.upper()}")
    print(f"📊 Confidence: {result.confidence:.1%}")
    print(f"🔍 Sections Analyzed: {result.sections_analyzed}")
    print(f"💰 Estimated Cost: ${result.cost_estimate:.4f}")
    
    print(f"\n📝 REASONING:\n{result.reasoning}")
    
    print(f"\n📋 SECTION-BY-SECTION ANALYSIS:")
    for comp in result.section_comparisons:
        print(f"\n  {comp.section_type.upper()}:")
        print(f"    Vector Similarity: {comp.vector_similarity:.1%}")
        print(f"    Visual Similarity: {comp.visual_similarity:.1%}")
        print(f"    Pattern: {comp.pattern}")
        print(f"    Evidence: {comp.evidence[:200]}...")
    
    # Save detailed JSON report
    report_path = Path(args.output) / "analysis_report.json"
    with open(report_path, 'w') as f:
        json.dump(asdict(result), f, indent=2)
    
    print(f"\n💾 Detailed report saved to: {report_path}")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
