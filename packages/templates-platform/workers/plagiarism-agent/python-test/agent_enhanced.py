#!/usr/bin/env python3
"""
Plagiarism Detection Agent - Enhanced with Vision Analysis

Combines AST-based code analysis with screenshot comparison:
1. Fetch HTML and analyze code structure (AST)
2. Capture screenshots of both sites
3. Use Claude Vision to compare visual similarity
4. Make decision based on BOTH code and visual evidence

This addresses Gemini's insight: Webflow animations can be visually
similar without code similarity.

Canon: The tool recedes; the truth emerges.
"""

import os
import json
import re
import base64
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import requests
from bs4 import BeautifulSoup
import esprima
from anthropic import Anthropic
import google.generativeai as genai
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from PIL import Image

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

anthropic = Anthropic(api_key=ANTHROPIC_API_KEY)
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class CodeAnalysis:
    """Results from code-level analysis."""
    css_animations: int
    css_transitions: int
    js_libraries: List[str]
    webflow_interactions: int
    ast_similarity: float
    shared_functions: List[str]
    shared_classes: List[str]

@dataclass
class VisionAnalysis:
    """Results from visual comparison."""
    similarity: str  # "minimal" | "moderate" | "extensive"
    transformation: str  # "none" | "low" | "medium" | "high"
    extent: str  # "minor" | "moderate" | "major"
    animation_similarity: str  # Description of animation similarities
    layout_similarity: str  # Description of layout similarities
    confidence: float

@dataclass
class TestCase:
    """Test case from Airtable."""
    record_id: str
    original_urls: List[str]
    copy_url: str
    complaint: str

# =============================================================================
# SCREENSHOT CAPTURE
# =============================================================================

def capture_screenshot(url: str, output_path: str) -> bool:
    """Capture full-page screenshot using Playwright."""
    try:
        print(f"[Screenshot] Capturing {url}")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1920, 'height': 1080})
            page.goto(url, wait_until='networkidle', timeout=30000)

            # Wait for animations to settle
            page.wait_for_timeout(2000)

            # Full page screenshot
            page.screenshot(path=output_path, full_page=True)
            browser.close()

        print(f"[Screenshot] Saved to {output_path}")
        return True
    except Exception as e:
        print(f"[Screenshot] Error capturing {url}: {str(e)}")
        return False

def resize_image_for_vision(image_path: str, max_dimension: int = 4000):
    """Resize image to fit Claude Vision's 8000px limit (use 4000px to be safe)."""
    try:
        img = Image.open(image_path)
        width, height = img.size

        # Only resize if needed
        if width <= max_dimension and height <= max_dimension:
            return

        # Calculate new dimensions maintaining aspect ratio
        if width > height:
            new_width = max_dimension
            new_height = int((max_dimension / width) * height)
        else:
            new_height = max_dimension
            new_width = int((max_dimension / height) * width)

        print(f"[Resize] {width}x{height} → {new_width}x{new_height}")

        # Resize and save
        img = img.resize((new_width, new_height), Image.LANCZOS)
        img.save(image_path, optimize=True, quality=85)

    except Exception as e:
        print(f"[Resize] Error resizing {image_path}: {str(e)}")

def encode_image(image_path: str) -> str:
    """Encode image to base64."""
    # Resize first to avoid Claude Vision limit
    resize_image_for_vision(image_path)

    with open(image_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

# =============================================================================
# CODE ANALYSIS (from agent_test.py)
# =============================================================================

def fetch_html_content(url: str) -> str:
    """Fetch HTML content from URL."""
    try:
        response = requests.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }, timeout=15)
        response.raise_for_status()
        return response.text
    except Exception as e:
        return f"Error fetching {url}: {str(e)}"

def extract_javascript(html: str) -> List[str]:
    """Extract all JavaScript code from HTML."""
    soup = BeautifulSoup(html, 'html.parser')
    scripts = []
    for script in soup.find_all('script'):
        if script.string:
            scripts.append(script.string)
    return scripts

def parse_js_ast(js_code: str) -> Optional[Dict[str, Any]]:
    """Parse JavaScript code into AST using esprima."""
    try:
        ast = esprima.parseScript(js_code, {'tolerant': True})
        return ast.toDict()
    except Exception:
        return None

def extract_ast_features(ast: Dict[str, Any]) -> Dict[str, List[str]]:
    """Extract function names, class names from AST."""
    functions = []
    classes = []

    def traverse(node):
        if isinstance(node, dict):
            node_type = node.get('type')
            if node_type == 'FunctionDeclaration':
                func_name = node.get('id', {}).get('name')
                if func_name:
                    functions.append(func_name)
            elif node_type == 'ClassDeclaration':
                class_name = node.get('id', {}).get('name')
                if class_name:
                    classes.append(class_name)
            for value in node.values():
                if isinstance(value, (dict, list)):
                    traverse(value)
        elif isinstance(node, list):
            for item in node:
                traverse(item)

    traverse(ast)
    return {'functions': functions, 'classes': classes}

def calculate_ast_similarity(original_ast_features: Dict, copy_ast_features: Dict) -> float:
    """Calculate similarity score based on AST features."""
    orig_funcs = set(original_ast_features['functions'])
    copy_funcs = set(copy_ast_features['functions'])
    orig_classes = set(original_ast_features['classes'])
    copy_classes = set(copy_ast_features['classes'])

    if not orig_funcs and not copy_funcs and not orig_classes and not copy_classes:
        return 0.0

    func_intersection = len(orig_funcs & copy_funcs)
    func_union = len(orig_funcs | copy_funcs)
    func_similarity = func_intersection / func_union if func_union > 0 else 0.0

    class_intersection = len(orig_classes & copy_classes)
    class_union = len(orig_classes | copy_classes)
    class_similarity = class_intersection / class_union if class_union > 0 else 0.0

    return (func_similarity * 0.7) + (class_similarity * 0.3)

def analyze_code_similarity(original_url: str, copy_url: str) -> CodeAnalysis:
    """Deep code analysis using AST parsing."""
    print(f"[AST Analysis] Fetching {original_url}")
    original_html = fetch_html_content(original_url)

    print(f"[AST Analysis] Fetching {copy_url}")
    copy_html = fetch_html_content(copy_url)

    def extract_patterns(html: str) -> Dict:
        return {
            'css_animations': len(re.findall(r'@keyframes\s+[\w-]+\s*{[^}]+}', html)),
            'css_transitions': len(re.findall(r'transition:\s*[^;]+;', html)),
            'js_libraries': [
                lib for lib, pattern in [
                    ('GSAP', r'gsap|GreenSock'),
                    ('Framer Motion', r'framer-motion|motion\.'),
                    ('Anime.js', r'anime\.min\.js|anime\('),
                    ('AOS', r'aos\.js|data-aos'),
                    ('ScrollTrigger', r'scroll-trigger|ScrollTrigger'),
                    ('Lottie', r'lottie|bodymovin')
                ]
                if re.search(pattern, html, re.IGNORECASE)
            ],
            'webflow_interactions': len(re.findall(r'data-w-id="[^"]+"', html))
        }

    original_patterns = extract_patterns(original_html)
    copy_patterns = extract_patterns(copy_html)

    print("[AST Analysis] Extracting JavaScript...")
    original_scripts = extract_javascript(original_html)
    copy_scripts = extract_javascript(copy_html)

    all_orig_features = {'functions': [], 'classes': []}
    all_copy_features = {'functions': [], 'classes': []}

    print(f"[AST Analysis] Parsing {len(original_scripts)} original scripts...")
    for script in original_scripts:
        ast = parse_js_ast(script)
        if ast:
            features = extract_ast_features(ast)
            all_orig_features['functions'].extend(features['functions'])
            all_orig_features['classes'].extend(features['classes'])

    print(f"[AST Analysis] Parsing {len(copy_scripts)} copy scripts...")
    for script in copy_scripts:
        ast = parse_js_ast(script)
        if ast:
            features = extract_ast_features(ast)
            all_copy_features['functions'].extend(features['functions'])
            all_copy_features['classes'].extend(features['classes'])

    ast_similarity = calculate_ast_similarity(all_orig_features, all_copy_features)
    shared_functions = list(set(all_orig_features['functions']) & set(all_copy_features['functions']))
    shared_classes = list(set(all_orig_features['classes']) & set(all_copy_features['classes']))

    print(f"[AST Analysis] Similarity: {ast_similarity:.2%}")
    print(f"[AST Analysis] Shared functions: {len(shared_functions)}")

    return CodeAnalysis(
        css_animations=copy_patterns['css_animations'],
        css_transitions=copy_patterns['css_transitions'],
        js_libraries=copy_patterns['js_libraries'],
        webflow_interactions=copy_patterns['webflow_interactions'],
        ast_similarity=ast_similarity,
        shared_functions=shared_functions[:10],
        shared_classes=shared_classes[:10]
    )

# =============================================================================
# VISION ANALYSIS (NEW)
# =============================================================================

def compare_screenshots_with_vision(original_path: str, copy_path: str) -> VisionAnalysis:
    """Use Claude Vision to compare screenshots."""
    print(f"\n[Vision] Comparing screenshots with Claude Vision API")

    original_b64 = encode_image(original_path)
    copy_b64 = encode_image(copy_path)

    prompt = """Compare these two website screenshots for visual plagiarism.

Focus on:
1. **Animation Similarity**: Do they use similar hover effects, scroll animations, transitions?
2. **Layout Similarity**: Are sections, grids, spacing patterns copied?
3. **Design Patterns**: Color schemes, typography, component styles
4. **Transformation**: How much creative transformation was applied?

Rate the plagiarism:
- similarity: "minimal" | "moderate" | "extensive"
- transformation: "none" | "low" | "medium" | "high"
- extent: "minor" | "moderate" | "major"

Provide detailed descriptions of animation and layout similarities.

IMPORTANT: Return ONLY valid JSON:
{
  "similarity": "...",
  "transformation": "...",
  "extent": "...",
  "animation_similarity": "Detailed description",
  "layout_similarity": "Detailed description",
  "confidence": 0.0-1.0
}"""

    response = anthropic.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": original_b64
                    }
                },
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": copy_b64
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }]
    )

    response_text = response.content[0].text
    print(f"[Vision] Response received ({len(response_text)} chars)")

    # Extract JSON
    try:
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group(0))
            return VisionAnalysis(
                similarity=result.get('similarity', 'moderate'),
                transformation=result.get('transformation', 'medium'),
                extent=result.get('extent', 'moderate'),
                animation_similarity=result.get('animation_similarity', ''),
                layout_similarity=result.get('layout_similarity', ''),
                confidence=result.get('confidence', 0.7)
            )
    except json.JSONDecodeError:
        pass

    # Fallback
    return VisionAnalysis(
        similarity="moderate",
        transformation="medium",
        extent="moderate",
        animation_similarity="Could not parse vision analysis",
        layout_similarity="Could not parse vision analysis",
        confidence=0.5
    )

# =============================================================================
# ENHANCED AGENT TOOLS
# =============================================================================

enhanced_tools = [
    {
        "name": "analyze_code_and_screenshots",
        "description": "Perform comprehensive plagiarism analysis combining AST-based code analysis AND visual screenshot comparison. Returns both code similarity metrics and visual similarity assessment from Claude Vision.",
        "input_schema": {
            "type": "object",
            "properties": {
                "original_url": {
                    "type": "string",
                    "description": "URL of the original website"
                },
                "copy_url": {
                    "type": "string",
                    "description": "URL of the alleged copy"
                }
            },
            "required": ["original_url", "copy_url"]
        }
    },
    {
        "name": "save_analysis",
        "description": "Save complete analysis results (code + vision) to JSON file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Filename to save analysis"
                },
                "data": {
                    "type": "object",
                    "description": "Analysis data to save"
                }
            },
            "required": ["filename", "data"]
        }
    }
]

def process_enhanced_tool_call(tool_name: str, tool_input: Dict[str, Any]) -> str:
    """Process tool calls with vision analysis."""
    if tool_name == "analyze_code_and_screenshots":
        original_url = tool_input["original_url"]
        copy_url = tool_input["copy_url"]

        # Step 1: Code analysis
        code_analysis = analyze_code_similarity(original_url, copy_url)

        # Step 2: Capture screenshots
        original_screenshot = f"screenshot_original_{hash(original_url) % 10000}.png"
        copy_screenshot = f"screenshot_copy_{hash(copy_url) % 10000}.png"

        original_captured = capture_screenshot(original_url, original_screenshot)
        copy_captured = capture_screenshot(copy_url, copy_screenshot)

        # Step 3: Vision analysis
        vision_analysis = None
        if original_captured and copy_captured:
            vision_analysis = compare_screenshots_with_vision(original_screenshot, copy_screenshot)

        # Combine results
        result = {
            "code_analysis": {
                "css_animations": code_analysis.css_animations,
                "css_transitions": code_analysis.css_transitions,
                "js_libraries": code_analysis.js_libraries,
                "webflow_interactions": code_analysis.webflow_interactions,
                "ast_similarity_score": code_analysis.ast_similarity,
                "shared_javascript_functions": code_analysis.shared_functions,
                "shared_javascript_classes": code_analysis.shared_classes
            },
            "vision_analysis": {
                "visual_similarity": vision_analysis.similarity if vision_analysis else "unknown",
                "transformation": vision_analysis.transformation if vision_analysis else "unknown",
                "extent": vision_analysis.extent if vision_analysis else "unknown",
                "animation_similarity": vision_analysis.animation_similarity if vision_analysis else "N/A",
                "layout_similarity": vision_analysis.layout_similarity if vision_analysis else "N/A",
                "confidence": vision_analysis.confidence if vision_analysis else 0.0
            },
            "interpretation": {
                "code_evidence": "Strong" if code_analysis.ast_similarity > 0.5 else "Weak",
                "visual_evidence": vision_analysis.similarity if vision_analysis else "Unknown",
                "combined_assessment": "Use BOTH code and visual evidence. Visual similarity WITHOUT code similarity suggests Webflow-style copying (GUI configuration, not code theft)."
            }
        }

        return json.dumps(result, indent=2)

    elif tool_name == "save_analysis":
        filename = tool_input["filename"]
        data = tool_input["data"]
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        return f"Analysis saved to {filename}"

    return "Unknown tool"

# =============================================================================
# ENHANCED AGENT
# =============================================================================

def run_enhanced_agent(test_case: TestCase) -> Dict[str, Any]:
    """Run enhanced Claude agent with code + vision analysis."""

    system_message = """You are a plagiarism detection expert analyzing website code AND visual design.

You have access to tools that perform:
1. AST-based JavaScript code similarity analysis
2. Claude Vision screenshot comparison (detects visual plagiarism)

CRITICAL: Gemini Pro identified that Webflow sites can have visual plagiarism
without code similarity. Always use BOTH code and vision analysis.

Decision criteria:
- Code similarity >0.5 + Visual similarity = MAJOR (direct code theft)
- Code similarity <0.1 + Visual similarity "extensive" = MINOR (GUI copying)
- Code similarity <0.1 + Visual similarity "minimal" = NO VIOLATION

Return JSON:
{
  "decision": "no_violation" | "minor" | "major",
  "reasoning": "Explain using BOTH code and visual evidence",
  "confidence": 0.0-1.0,
  "key_evidence": ["List strongest evidence from both analyses"]
}"""

    user_message = f"""Analyze this plagiarism case:

Original URLs: {', '.join(test_case.original_urls)}
Alleged Copy: {test_case.copy_url}
Complaint: {test_case.complaint}

Use the analyze_code_and_screenshots tool to examine BOTH:
1. Code-level evidence (AST similarity, shared functions)
2. Visual evidence (animations, layouts, design patterns)

Make your judgment using BOTH analyses."""

    messages = [{"role": "user", "content": user_message}]

    print("\n" + "="*80)
    print("ENHANCED CLAUDE AGENT (Code + Vision)")
    print("="*80)

    while True:
        response = anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system=system_message,
            tools=enhanced_tools,
            messages=messages
        )

        print(f"\nStop reason: {response.stop_reason}")

        if response.stop_reason == "tool_use":
            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input

                    print(f"\n[Tool Call] {tool_name}")
                    print(f"[Tool Input] {json.dumps(tool_input, indent=2)}")

                    result = process_enhanced_tool_call(tool_name, tool_input)

                    print(f"\n[Tool Result Preview]")
                    print(result[:800] + "..." if len(result) > 800 else result)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

        elif response.stop_reason == "end_turn":
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text

            print(f"\n[Final Response]")
            print(final_text)

            try:
                json_match = re.search(r'\{[\s\S]*\}', final_text)
                if json_match:
                    return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

            return {"error": "No valid JSON", "raw": final_text}
        else:
            break

    return {"error": "Agent loop terminated"}

# =============================================================================
# MAIN TEST
# =============================================================================

def main():
    """Run enhanced plagiarism detection test."""

    test_case = TestCase(
        record_id="recgROoGWyyoQiSUq",
        original_urls=[
            "https://scalerfy.webflow.io/",
            "https://interiora.webflow.io/home-02"
        ],
        copy_url="https://fluora.webflow.io/",
        complaint="This template copies animations from our original templates with 99% similarity, only changing minor details."
    )

    print("="*80)
    print("ENHANCED PYTHON SDK TEST (Code + Vision Analysis)")
    print("="*80)
    print(f"\nTest Case: {test_case.record_id}")
    print(f"Complaint: {test_case.complaint}")

    # Run enhanced agent
    enhanced_result = run_enhanced_agent(test_case)

    print("\n" + "="*80)
    print("ENHANCED AGENT RESULT (Code + Vision)")
    print("="*80)
    print(json.dumps(enhanced_result, indent=2))

    # Comparison table
    print("\n" + "="*80)
    print("COMPARISON: Basic AST vs Enhanced (Code + Vision)")
    print("="*80)

    print("\nBasic AST-Only (Previous Test):")
    print(json.dumps({
        "decision": "no_violation",
        "reasoning": "0% AST similarity, no shared code",
        "limitation": "Missed visual plagiarism in Webflow GUI"
    }, indent=2))

    print("\nEnhanced Code + Vision (This Test):")
    print(json.dumps({
        "decision": enhanced_result.get("decision"),
        "reasoning": enhanced_result.get("reasoning", "")[:150] + "...",
        "advantage": "Detects visual plagiarism that AST analysis missed"
    }, indent=2))

if __name__ == "__main__":
    main()
