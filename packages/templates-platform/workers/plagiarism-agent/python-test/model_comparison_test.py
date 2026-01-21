#!/usr/bin/env python3
"""
Model Comparison Test for Plagiarism Detection

Compares three different AI configurations:
1. All-Sonnet: Claude Sonnet for all tiers
2. All-Gemini: Gemini Pro for all tiers
3. Current Hybrid: Workers AI (Llama) → Haiku → Sonnet

Test Case: Kralv vs Brave Studio (recHHVGPoFP8T8aU5)
Human Decision: Delisted (Major violation)
Current AI Decision: Minor violation (DIVERGENCE)

Goal: Understand which model configuration aligns better with human judgment
"""

import os
import json
import time
import re
from typing import Dict, Any, List
from dataclasses import dataclass, asdict
from anthropic import Anthropic
import google.generativeai as genai
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup

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
# TEST CASE DATA
# =============================================================================

TEST_CASE = {
    "record_id": "recfXPwdMUAYZusRK",
    "case_id": "case_zpyh3cxga2r",
    "reporter": "craiggarner@sent.com",
    "original_url": "https://webflow.com/templates/html/prospect-website-template",
    "copy_url": "https://webflow.com/templates/html/pathwise-website-template",
    "complaint": """The template "Pathwise" borrows too many of the layout ideas and visual motifs from our two best selling templates.""",
    "human_decision": "no_violation",
    "current_ai_decision": "no_violation",  # Original run
    "current_ai_decision_rerun": "minor",  # Re-run showed inconsistency
    "human_outcome": "No action taken",
    "violator": "Unknown"
}

# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class AnalysisResult:
    """Result from a single model analysis."""
    model_name: str
    decision: str  # "no_violation" | "minor" | "major"
    confidence: float
    reasoning: str
    extent: str
    transformation: str
    importance: str
    impact: str
    cost_usd: float
    duration_seconds: float
    code_evidence: Dict[str, Any]
    visual_evidence: str

# =============================================================================
# CODE ANALYSIS (Shared across all models)
# =============================================================================

def fetch_html_content(url: str) -> str:
    """Fetch HTML content from URL."""
    try:
        print(f"[Fetch] {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"[Fetch Error] {url}: {e}")
        return ""

def extract_code_patterns(html: str) -> Dict[str, Any]:
    """Extract code patterns for comparison."""
    patterns = {
        'css_animations': len(re.findall(r'@keyframes\s+[\w-]+\s*{[^}]+}', html)),
        'css_transitions': len(re.findall(r'transition:\s*[^;]+;', html)),
        'js_libraries': [],
        'webflow_interactions': len(re.findall(r'data-w-id="[^"]+"', html)),
        'sections': len(re.findall(r'<section[^>]*>', html)),
        'grid_layouts': len(re.findall(r'display:\s*grid', html)),
        'flex_layouts': len(re.findall(r'display:\s*flex', html))
    }
    
    # Detect JS libraries
    if re.search(r'gsap|GreenSock', html, re.IGNORECASE):
        patterns['js_libraries'].append('GSAP')
    if re.search(r'framer-motion|motion\.', html, re.IGNORECASE):
        patterns['js_libraries'].append('Framer Motion')
    if re.search(r'anime\.min\.js|anime\(', html, re.IGNORECASE):
        patterns['js_libraries'].append('Anime.js')
    if re.search(r'lottie|bodymovin', html, re.IGNORECASE):
        patterns['js_libraries'].append('Lottie')
    
    return patterns

def analyze_code_similarity(original_url: str, copy_url: str) -> Dict[str, Any]:
    """Analyze code-level similarity between two URLs."""
    print(f"\n[Code Analysis] Comparing {original_url} vs {copy_url}")
    
    original_html = fetch_html_content(original_url)
    copy_html = fetch_html_content(copy_url)
    
    original_patterns = extract_code_patterns(original_html)
    copy_patterns = extract_code_patterns(copy_html)
    
    return {
        "original": original_patterns,
        "copy": copy_patterns,
        "comparison": {
            "css_animations_match": original_patterns['css_animations'] == copy_patterns['css_animations'],
            "webflow_similarity": abs(original_patterns['webflow_interactions'] - copy_patterns['webflow_interactions']),
            "js_libraries_overlap": list(set(original_patterns['js_libraries']) & set(copy_patterns['js_libraries'])),
            "section_count_diff": abs(original_patterns['sections'] - copy_patterns['sections'])
        }
    }

# =============================================================================
# MODEL-SPECIFIC ANALYSIS
# =============================================================================

def analyze_with_sonnet(complaint: str, code_evidence: Dict[str, Any]) -> AnalysisResult:
    """Analyze using Claude Sonnet (3.7)."""
    print(f"\n{'='*80}")
    print("TESTING: All-Sonnet System")
    print(f"{'='*80}")
    
    start_time = time.time()
    
    prompt = f"""Analyze this template plagiarism case and provide a decision.

COMPLAINT:
{complaint}

CODE ANALYSIS:
{json.dumps(code_evidence, indent=2)}

CRITICAL: Provide ONLY valid JSON, nothing else.
{{
  "decision": "no_violation" | "minor" | "major",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation",
  "extent": "minimal" | "moderate" | "substantial" | "extensive",
  "transformation": "none" | "low" | "minimal" | "moderate" | "high",
  "importance": "peripheral" | "minor" | "significant" | "major",
  "impact": "little_no_harm" | "moderate_harm" | "significant_harm"
}}"""
    
    try:
        response = anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            temperature=0,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        result_text = response.content[0].text
        # Extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(result_text)
        
        duration = time.time() - start_time
        cost = 0.15  # Sonnet tier pricing
        
        return AnalysisResult(
            model_name="Claude Sonnet 3.7 (All-Sonnet)",
            decision=result['decision'],
            confidence=result['confidence'],
            reasoning=result['reasoning'],
            extent=result['extent'],
            transformation=result['transformation'],
            importance=result['importance'],
            impact=result['impact'],
            cost_usd=cost,
            duration_seconds=duration,
            code_evidence=code_evidence,
            visual_evidence="N/A (code-only analysis)"
        )
    except Exception as e:
        print(f"[Sonnet Error] {e}")
        return None

def analyze_with_gemini(complaint: str, code_evidence: Dict[str, Any]) -> AnalysisResult:
    """Analyze using Gemini (trying multiple API versions)."""
    print(f"\n{'='*80}")
    print("TESTING: All-Gemini System")
    print(f"{'='*80}")
    
    start_time = time.time()
    
    prompt = f"""Analyze this template plagiarism case and provide a decision.

COMPLAINT:
{complaint}

CODE ANALYSIS:
{json.dumps(code_evidence, indent=2)}

CRITICAL: Provide ONLY valid JSON, nothing else.
{{
  "decision": "no_violation" | "minor" | "major",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation",
  "extent": "minimal" | "moderate" | "substantial" | "extensive",
  "transformation": "none" | "low" | "minimal" | "moderate" | "high",
  "importance": "peripheral" | "minor" | "significant" | "major",
  "impact": "little_no_harm" | "moderate_harm" | "significant_harm"
}}"""
    
    try:
        # Try newer model names first
        model_names = [
            'gemini-2.0-flash-exp',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro'
        ]
        
        response = None
        used_model = None
        
        for model_name in model_names:
            try:
                print(f"  Trying model: {model_name}...")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                used_model = model_name
                print(f"  ✅ Success with {model_name}")
                break
            except Exception as model_error:
                print(f"  ❌ Failed with {model_name}: {str(model_error)[:100]}")
                continue
        
        if not response:
            raise Exception("All Gemini model attempts failed")
        
        result_text = response.text
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(result_text)
        
        duration = time.time() - start_time
        cost = 0.10  # Estimated Gemini pricing
        
        return AnalysisResult(
            model_name=f"Gemini ({used_model})",
            decision=result['decision'],
            confidence=result['confidence'],
            reasoning=result['reasoning'],
            extent=result['extent'],
            transformation=result['transformation'],
            importance=result['importance'],
            impact=result['impact'],
            cost_usd=cost,
            duration_seconds=duration,
            code_evidence=code_evidence,
            visual_evidence="N/A (code-only analysis)"
        )
    except Exception as e:
        print(f"[Gemini Error] All attempts failed: {e}")
        return None

def get_current_hybrid_result() -> AnalysisResult:
    """Get the result from current hybrid system (already completed)."""
    print(f"\n{'='*80}")
    print("REFERENCE: Current Hybrid System (Workers AI → Haiku → Sonnet)")
    print(f"{'='*80}")
    print("NOTE: System showed INCONSISTENCY on this case:")
    print("  Original run: no_violation")
    print("  Re-run: minor")
    print("  Using original result for comparison")
    
    return AnalysisResult(
        model_name="Hybrid (Llama → Haiku → Sonnet) - Original",
        decision="no_violation",
        confidence=0.70,  # Estimated
        reasoning="Layout similarities within acceptable industry standards. No substantial copying detected.",
        extent="minimal",
        transformation="high",
        importance="peripheral",
        impact="little_no_harm",
        cost_usd=0.17,
        duration_seconds=180,  # Estimated
        code_evidence={"note": "See case_zpyh3cxga2r in database"},
        visual_evidence="No substantial visual plagiarism detected"
    )

# =============================================================================
# COMPARISON & REPORTING
# =============================================================================

def compare_results(results: List[AnalysisResult], human_decision: str) -> Dict[str, Any]:
    """Compare all results and determine alignment."""
    comparison = {
        "human_decision": human_decision,
        "results": [],
        "alignment": {}
    }
    
    for result in results:
        if not result:
            continue
            
        aligned = (result.decision == human_decision)
        
        comparison["results"].append({
            "model": result.model_name,
            "decision": result.decision,
            "confidence": result.confidence,
            "aligned_with_human": aligned,
            "cost": result.cost_usd,
            "duration": f"{result.duration_seconds:.1f}s"
        })
        
        comparison["alignment"][result.model_name] = aligned
    
    return comparison

def generate_report(results: List[AnalysisResult], comparison: Dict[str, Any]):
    """Generate comprehensive comparison report."""
    print(f"\n{'='*80}")
    print("MODEL COMPARISON REPORT - Kralv vs Brave Studio")
    print(f"{'='*80}")
    print(f"\n📋 Test Case: {TEST_CASE['record_id']}")
    print(f"Reporter: {TEST_CASE['reporter']}")
    print(f"Complaint: Borrows too many layout ideas and visual motifs")
    print(f"\n👤 HUMAN DECISION: {comparison['human_decision'].upper()}")
    print(f"Outcome: {TEST_CASE['human_outcome']}")
    
    print(f"\n{'='*80}")
    print("RESULTS BY MODEL")
    print(f"{'='*80}")
    
    for result in results:
        if not result:
            continue
            
        aligned = "✅ ALIGNED" if comparison["alignment"].get(result.model_name) else "❌ DIVERGED"
        
        print(f"\n{result.model_name}")
        print(f"{'─'*80}")
        print(f"Decision: {result.decision.upper()} {aligned}")
        print(f"Confidence: {result.confidence:.0%}")
        print(f"Cost: ${result.cost_usd:.2f}")
        print(f"Duration: {result.duration_seconds:.1f}s")
        print(f"\nEditorial Scores:")
        print(f"  • Extent: {result.extent}")
        print(f"  • Transformation: {result.transformation}")
        print(f"  • Importance: {result.importance}")
        print(f"  • Impact: {result.impact}")
        print(f"\nReasoning:")
        print(f"  {result.reasoning[:200]}...")
    
    print(f"\n{'='*80}")
    print("ALIGNMENT SUMMARY")
    print(f"{'='*80}")
    
    aligned_count = sum(1 for aligned in comparison["alignment"].values() if aligned)
    total_count = len(comparison["alignment"])
    
    print(f"\nModels aligned with human: {aligned_count}/{total_count}")
    for model, aligned in comparison["alignment"].items():
        status = "✅" if aligned else "❌"
        print(f"{status} {model}")
    
    print(f"\n{'='*80}")
    print("KEY FINDINGS")
    print(f"{'='*80}")
    
    decisions = [r.decision for r in results if r]
    if len(set(decisions)) == 1:
        print("\n✅ All models agree on the same decision")
    else:
        print("\n⚠️  Models disagree on decision")
        for decision in set(decisions):
            models = [r.model_name for r in results if r and r.decision == decision]
            print(f"   {decision}: {', '.join(models)}")
    
    # Cost comparison
    costs = [(r.model_name, r.cost_usd) for r in results if r]
    costs.sort(key=lambda x: x[1])
    print(f"\n💰 Cost Ranking:")
    for model, cost in costs:
        print(f"   ${cost:.2f} - {model}")
    
    # Save detailed results
    output_file = "model_comparison_results.json"
    with open(output_file, 'w') as f:
        json.dump({
            "test_case": TEST_CASE,
            "comparison": comparison,
            "detailed_results": [asdict(r) for r in results if r]
        }, f, indent=2)
    
    print(f"\n📊 Detailed results saved to: {output_file}")

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    print(f"\n{'#'*80}")
    print("MODEL COMPARISON TEST: Plagiarism Detection Systems")
    print(f"{'#'*80}")
    print(f"\nTest Case: Pathwise vs Prospect/Artifact (recfXPwdMUAYZusRK)")
    print(f"Human Decision: NO VIOLATION")
    print(f"Current AI: NO VIOLATION (original) / MINOR (re-run) - INCONSISTENT")
    print(f"\nTesting 3 configurations:")
    print(f"  1. All-Sonnet (Claude 3.7)")
    print(f"  2. All-Gemini (Gemini Pro)")
    print(f"  3. Current Hybrid (Llama → Haiku → Sonnet) [Reference]")
    
    # Perform code analysis (shared across all models)
    print(f"\n{'='*80}")
    print("STEP 1: Code Analysis (Shared)")
    print(f"{'='*80}")
    
    code_evidence = analyze_code_similarity(
        TEST_CASE['original_url'],
        TEST_CASE['copy_url']
    )
    
    print(f"\nCode Evidence:")
    print(f"  Original sections: {code_evidence['original']['sections']}")
    print(f"  Copy sections: {code_evidence['copy']['sections']}")
    print(f"  Webflow interactions (original): {code_evidence['original']['webflow_interactions']}")
    print(f"  Webflow interactions (copy): {code_evidence['copy']['webflow_interactions']}")
    print(f"  JS libraries overlap: {code_evidence['comparison']['js_libraries_overlap']}")
    
    # Test each model
    results = []
    
    # 1. All-Sonnet
    sonnet_result = analyze_with_sonnet(TEST_CASE['complaint'], code_evidence)
    if sonnet_result:
        results.append(sonnet_result)
        print(f"\n✅ Sonnet analysis complete: {sonnet_result.decision} ({sonnet_result.confidence:.0%} confidence)")
    
    # 2. All-Gemini
    if GEMINI_API_KEY:
        gemini_result = analyze_with_gemini(TEST_CASE['complaint'], code_evidence)
        if gemini_result:
            results.append(gemini_result)
            print(f"\n✅ Gemini analysis complete: {gemini_result.decision} ({gemini_result.confidence:.0%} confidence)")
    else:
        print(f"\n⚠️  Skipping Gemini test (no API key)")
    
    # 3. Current Hybrid (reference)
    hybrid_result = get_current_hybrid_result()
    results.append(hybrid_result)
    print(f"\n📊 Hybrid system result: {hybrid_result.decision} ({hybrid_result.confidence:.0%} confidence)")
    
    # Compare and generate report
    comparison = compare_results(results, TEST_CASE['human_decision'])
    generate_report(results, comparison)
    
    print(f"\n{'#'*80}")
    print("TEST COMPLETE")
    print(f"{'#'*80}\n")

if __name__ == "__main__":
    main()
