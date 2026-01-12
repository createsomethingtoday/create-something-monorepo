#!/usr/bin/env python3
"""
Plagiarism Detection Agent - Python SDK Test

Demonstrates capabilities beyond Cloudflare Workers:
- AST-based JavaScript code similarity analysis
- Multi-model orchestration (Claude + Gemini Pro)
- Complex reasoning chains with tool use
- Filesystem operations for intermediate analysis

Canon: The tool recedes; the analysis emerges.
"""

import os
import json
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import requests
from bs4 import BeautifulSoup
import esprima
from anthropic import Anthropic
import google.generativeai as genai
from dotenv import load_dotenv

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
class TestCase:
    """Test case from Airtable."""
    record_id: str
    original_urls: List[str]
    copy_url: str
    complaint: str

# =============================================================================
# TOOLS FOR CLAUDE AGENT
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

    # Extract inline scripts
    for script in soup.find_all('script'):
        if script.string:
            scripts.append(script.string)

    # Extract script src URLs (would need additional fetching)
    # For now, just inline scripts

    return scripts

def parse_js_ast(js_code: str) -> Optional[Dict[str, Any]]:
    """Parse JavaScript code into AST using esprima."""
    try:
        ast = esprima.parseScript(js_code, {'tolerant': True})
        return ast.toDict()
    except Exception as e:
        return None

def extract_ast_features(ast: Dict[str, Any]) -> Dict[str, List[str]]:
    """Extract function names, class names, and patterns from AST."""
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

            # Traverse children
            for value in node.values():
                if isinstance(value, (dict, list)):
                    traverse(value)

        elif isinstance(node, list):
            for item in node:
                traverse(item)

    traverse(ast)

    return {
        'functions': functions,
        'classes': classes
    }

def calculate_ast_similarity(original_ast_features: Dict, copy_ast_features: Dict) -> float:
    """Calculate similarity score based on AST features."""
    orig_funcs = set(original_ast_features['functions'])
    copy_funcs = set(copy_ast_features['functions'])

    orig_classes = set(original_ast_features['classes'])
    copy_classes = set(copy_ast_features['classes'])

    if not orig_funcs and not copy_funcs and not orig_classes and not copy_classes:
        return 0.0

    # Calculate Jaccard similarity for functions
    func_intersection = len(orig_funcs & copy_funcs)
    func_union = len(orig_funcs | copy_funcs)
    func_similarity = func_intersection / func_union if func_union > 0 else 0.0

    # Calculate Jaccard similarity for classes
    class_intersection = len(orig_classes & copy_classes)
    class_union = len(orig_classes | copy_classes)
    class_similarity = class_intersection / class_union if class_union > 0 else 0.0

    # Weighted average (functions are more important)
    similarity = (func_similarity * 0.7) + (class_similarity * 0.3)

    return similarity

def analyze_code_similarity(original_url: str, copy_url: str) -> CodeAnalysis:
    """Deep code analysis using AST parsing."""
    print(f"[AST Analysis] Fetching {original_url}")
    original_html = fetch_html_content(original_url)

    print(f"[AST Analysis] Fetching {copy_url}")
    copy_html = fetch_html_content(copy_url)

    # Extract patterns (same as Workers)
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

    # NEW: AST-based analysis
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

    # Calculate AST similarity
    ast_similarity = calculate_ast_similarity(all_orig_features, all_copy_features)

    # Find shared functions and classes
    shared_functions = list(set(all_orig_features['functions']) & set(all_copy_features['functions']))
    shared_classes = list(set(all_orig_features['classes']) & set(all_copy_features['classes']))

    print(f"[AST Analysis] Similarity: {ast_similarity:.2%}")
    print(f"[AST Analysis] Shared functions: {len(shared_functions)}")
    print(f"[AST Analysis] Shared classes: {len(shared_classes)}")

    return CodeAnalysis(
        css_animations=copy_patterns['css_animations'],
        css_transitions=copy_patterns['css_transitions'],
        js_libraries=copy_patterns['js_libraries'],
        webflow_interactions=copy_patterns['webflow_interactions'],
        ast_similarity=ast_similarity,
        shared_functions=shared_functions[:10],  # First 10
        shared_classes=shared_classes[:10]
    )

# =============================================================================
# AGENT TOOLS DEFINITION
# =============================================================================

tools = [
    {
        "name": "analyze_code_similarity",
        "description": "Perform deep code similarity analysis using AST parsing. Detects shared JavaScript functions, classes, and calculates structural similarity. Returns detailed analysis including CSS animations, JS libraries, Webflow patterns, and AST-based similarity score.",
        "input_schema": {
            "type": "object",
            "properties": {
                "original_url": {
                    "type": "string",
                    "description": "URL of the original website to analyze"
                },
                "copy_url": {
                    "type": "string",
                    "description": "URL of the alleged copy to analyze"
                }
            },
            "required": ["original_url", "copy_url"]
        }
    },
    {
        "name": "save_analysis",
        "description": "Save analysis results to a JSON file for later review or comparison.",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Filename to save analysis results"
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

def process_tool_call(tool_name: str, tool_input: Dict[str, Any]) -> str:
    """Process tool calls from Claude."""
    if tool_name == "analyze_code_similarity":
        original_url = tool_input["original_url"]
        copy_url = tool_input["copy_url"]

        analysis = analyze_code_similarity(original_url, copy_url)

        return json.dumps({
            "css_animations": analysis.css_animations,
            "css_transitions": analysis.css_transitions,
            "js_libraries": analysis.js_libraries,
            "webflow_interactions": analysis.webflow_interactions,
            "ast_similarity_score": analysis.ast_similarity,
            "shared_javascript_functions": analysis.shared_functions,
            "shared_javascript_classes": analysis.shared_classes,
            "interpretation": "AST similarity above 0.5 indicates significant code reuse. Shared function/class names are strong evidence of plagiarism."
        }, indent=2)

    elif tool_name == "save_analysis":
        filename = tool_input["filename"]
        data = tool_input["data"]

        # Save to current directory
        filepath = filename
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        return f"Analysis saved to {filepath}"

    return "Unknown tool"

# =============================================================================
# CLAUDE AGENT WITH TOOLS
# =============================================================================

def run_claude_agent(test_case: TestCase) -> Dict[str, Any]:
    """Run Claude agent with tool use for plagiarism detection."""

    system_message = """You are a plagiarism detection expert analyzing website code.

You have access to tools that can:
1. Perform deep AST-based JavaScript code similarity analysis
2. Save analysis results for later review

When analyzing plagiarism cases:
1. Use the analyze_code_similarity tool to get detailed code-level evidence
2. Pay special attention to:
   - AST similarity score (>0.5 is strong evidence)
   - Shared function names (direct code copying)
   - Shared class names (structural copying)
   - JavaScript library usage patterns
   - Webflow-specific interaction patterns

3. Make your final judgment based on:
   - Code evidence (strongest)
   - Visual similarity (supporting)
   - Reporter's complaint (context)

Return your decision as JSON:
{
  "decision": "no_violation" | "minor" | "major",
  "reasoning": "Detailed explanation emphasizing code evidence",
  "confidence": 0.0-1.0,
  "key_evidence": ["List of strongest evidence points"]
}"""

    user_message = f"""Analyze this plagiarism case:

Original URLs: {', '.join(test_case.original_urls)}
Alleged Copy: {test_case.copy_url}
Complaint: {test_case.complaint}

Use the analyze_code_similarity tool to examine the code-level evidence.
Focus on AST similarity and shared function/class names as the strongest evidence.

Provide your final judgment as JSON."""

    messages = [{"role": "user", "content": user_message}]

    print("\n" + "="*80)
    print("CLAUDE AGENT WITH TOOLS (Python SDK)")
    print("="*80)

    # Agent loop
    while True:
        response = anthropic.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=4000,
            system=system_message,
            tools=tools,
            messages=messages
        )

        print(f"\nStop reason: {response.stop_reason}")

        # Check if Claude wants to use tools
        if response.stop_reason == "tool_use":
            # Process tool calls
            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input

                    print(f"\n[Tool Call] {tool_name}")
                    print(f"[Tool Input] {json.dumps(tool_input, indent=2)}")

                    # Execute tool
                    result = process_tool_call(tool_name, tool_input)

                    print(f"\n[Tool Result Preview]")
                    print(result[:500] + "..." if len(result) > 500 else result)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            # Add assistant response and tool results to messages
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

        elif response.stop_reason == "end_turn":
            # Extract final response
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text

            print(f"\n[Final Response]")
            print(final_text)

            # Try to extract JSON
            try:
                # Find JSON in response
                json_match = re.search(r'\{[\s\S]*\}', final_text)
                if json_match:
                    result = json.loads(json_match.group(0))
                    return result
                else:
                    return {"error": "No JSON found in response", "raw": final_text}
            except json.JSONDecodeError:
                return {"error": "Invalid JSON", "raw": final_text}

        else:
            print(f"\n[Unexpected stop reason: {response.stop_reason}]")
            break

    return {"error": "Agent loop terminated unexpectedly"}

# =============================================================================
# GEMINI PRO CROSS-VALIDATION (OPTIONAL)
# =============================================================================

def run_gemini_validation(test_case: TestCase, claude_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Use Gemini Pro to cross-validate Claude's decision."""
    if not GEMINI_API_KEY:
        print("\n[Gemini] API key not configured, skipping cross-validation")
        return None

    print("\n" + "="*80)
    print("GEMINI PRO CROSS-VALIDATION")
    print("="*80)

    model = genai.GenerativeModel('gemini-2.0-flash-exp')

    prompt = f"""You are reviewing a plagiarism detection decision made by another AI system.

Original URLs: {', '.join(test_case.original_urls)}
Alleged Copy: {test_case.copy_url}
Complaint: {test_case.complaint}

Claude's Decision:
{json.dumps(claude_result, indent=2)}

Based on the URLs and complaint, do you agree with this decision?
Provide your assessment as JSON:

{{
  "agreement": "agree" | "disagree" | "uncertain",
  "reasoning": "Your analysis",
  "recommended_decision": "no_violation" | "minor" | "major",
  "confidence": 0.0-1.0
}}"""

    response = model.generate_content(prompt)

    print(f"\n[Gemini Response]")
    print(response.text)

    # Try to extract JSON
    try:
        json_match = re.search(r'\{[\s\S]*\}', response.text)
        if json_match:
            return json.loads(json_match.group(0))
    except json.JSONDecodeError:
        pass

    return {"raw": response.text}

# =============================================================================
# MAIN TEST
# =============================================================================

def main():
    """Run Python SDK test on a plagiarism case."""

    # Test case: Webflow animation similarity (recgROoGWyyoQiSUq)
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
    print("PYTHON SDK PLAGIARISM DETECTION TEST")
    print("="*80)
    print(f"\nTest Case: {test_case.record_id}")
    print(f"Original URLs: {len(test_case.original_urls)}")
    print(f"Copy URL: {test_case.copy_url}")
    print(f"Complaint: {test_case.complaint[:100]}...")

    # Run Claude agent with tools
    claude_result = run_claude_agent(test_case)

    print("\n" + "="*80)
    print("CLAUDE AGENT RESULT")
    print("="*80)
    print(json.dumps(claude_result, indent=2))

    # Optional: Cross-validate with Gemini Pro
    gemini_result = run_gemini_validation(test_case, claude_result)

    if gemini_result:
        print("\n" + "="*80)
        print("GEMINI PRO VALIDATION")
        print("="*80)
        print(json.dumps(gemini_result, indent=2))

    # Compare with Workers result
    print("\n" + "="*80)
    print("COMPARISON: Python SDK vs Cloudflare Workers")
    print("="*80)

    workers_result = {
        "decision": "minor",
        "reasoning": "Webflow sites with similar interaction counts but no direct code copying",
        "cost": "$0.17",
        "features": ["Webflow detection", "Interaction counts", "CSS animation detection"]
    }

    print("\nCloudflare Workers:")
    print(json.dumps(workers_result, indent=2))

    print("\nPython SDK:")
    print(json.dumps({
        "decision": claude_result.get("decision"),
        "reasoning": claude_result.get("reasoning", "")[:100] + "...",
        "cost": "~$0.20-0.40 (includes tool use)",
        "features": ["AST-based analysis", "Shared function detection", "Multi-model validation", "Tool use capabilities"]
    }, indent=2))

    print("\n" + "="*80)
    print("KEY ADVANTAGES OF PYTHON SDK")
    print("="*80)
    print("""
1. AST-Based Analysis: Detects shared JavaScript functions and classes
2. Tool Use: Agent can call specialized analysis tools autonomously
3. Multi-Model: Cross-validation with Gemini Pro
4. Filesystem: Save intermediate results for review
5. Extensibility: Easy to add new analysis tools

TRADE-OFFS:
- Cost: $0.20-0.40 per case (vs $0.17 for Workers)
- Latency: 5-10 seconds (vs <2 seconds for Workers)
- Deployment: Requires Python server (vs edge-deployed Workers)
""")

if __name__ == "__main__":
    main()
